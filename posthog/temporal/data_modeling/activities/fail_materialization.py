import dataclasses
from collections.abc import Callable
from typing import TYPE_CHECKING
from uuid import UUID

from django.db import transaction

from structlog import get_logger
from structlog.contextvars import bind_contextvars
from temporalio import activity
from temporalio.service import RPCError, RPCStatusCode

from posthog.exceptions_capture import capture_exception
from posthog.sync import database_sync_to_async_pool

from products.data_modeling.backend.facade.models import (
    DataModelingJob,
    DataModelingJobEngine,
    DataModelingJobStatus,
    DataWarehouseSavedQuery,
    Node,
)
from products.data_warehouse.backend.facade.api import pause_saved_query_schedule

from ..metrics import get_node_suspended_metric
from .utils import (
    CONSECUTIVE_FAILURES_TO_SUSPEND,
    maybe_suspend_node_for_engine,
    strip_hostname_from_error,
    update_node_system_properties,
)

if TYPE_CHECKING:
    from django.db.models import QuerySet

LOGGER = get_logger(__name__)

CONSECUTIVE_TIMEOUTS_TO_PAUSE = 5

# Markers identifying failures where the query exceeded its resource budget (server-side
# timeout, bytes-read cap, memory limit). Matched case-insensitively against stored job
# errors, which carry the full ClickHouse message including the error-code name.
_RESOURCE_LIMIT_ERROR_MARKERS = (
    "timeout exceeded",
    "exceeded timeout",
    "timeout_exceeded",
    "too_many_bytes",
    "limit for bytes to read exceeded",
    "memory_limit_exceeded",
    "memory limit",
)


def _is_timeout_error(error: str | None) -> bool:
    if not error:
        return False
    return "Timeout exceeded" in error or "exceeded timeout" in error.lower()


def _is_resource_limit_error(error: str | None) -> bool:
    if not error:
        return False
    lowered = error.lower()
    return any(marker in lowered for marker in _RESOURCE_LIMIT_ERROR_MARKERS)


def _get_previous_jobs(saved_query_id: UUID, current_job_id: UUID, count: int) -> "QuerySet[DataModelingJob]":
    """Get the most recent jobs for a saved query, excluding the current job."""
    return (
        DataModelingJob.objects.filter(saved_query_id=saved_query_id, engine=DataModelingJobEngine.CLICKHOUSE)
        .exclude(id=current_job_id)
        .order_by("-created_at")[:count]
    )


def _consecutive_failures_matching(
    saved_query_id: UUID, current_job_id: UUID, error_predicate: Callable[[str | None], bool]
) -> tuple[bool, int]:
    previous_jobs = list(_get_previous_jobs(saved_query_id, current_job_id, CONSECUTIVE_TIMEOUTS_TO_PAUSE))
    count = 0
    for job in previous_jobs:
        if job.status != DataModelingJobStatus.FAILED:
            break
        if not error_predicate(job.error):
            break
        count += 1
    return count == CONSECUTIVE_TIMEOUTS_TO_PAUSE, count


def should_pause_schedule_for_timeout(saved_query_id: UUID, current_job_id: UUID) -> tuple[bool, int]:
    """Check if the schedule should be paused based on consecutive timeout failures.

    Returns True only if all of the previous CONSECUTIVE_TIMEOUTS_TO_PAUSE jobs
    failed due to query timeouts. This prevents pausing schedules for transient
    timeouts that can occur due to temporary ClickHouse load.

    Kept timeout-only for v1 (run_workflow.py) callers; v2 uses the wider
    resource-limit variant below.
    """
    return _consecutive_failures_matching(saved_query_id, current_job_id, _is_timeout_error)


def should_pause_schedule_for_resource_limits(saved_query_id: UUID, current_job_id: UUID) -> tuple[bool, int]:
    """Check if the schedule should be paused based on consecutive resource-limit failures.

    Returns True only if all of the previous CONSECUTIVE_TIMEOUTS_TO_PAUSE jobs failed
    because the query exceeded a resource budget (timeout, bytes-read cap, or memory
    limit). Mixed streaks count: each kind means the query is too big for its budget,
    and re-running it on schedule only burns the budget again.
    """
    current_job = DataModelingJob.objects.get(id=current_job_id)
    previous_jobs = list(_get_previous_jobs(saved_query_id, current_job_id, CONSECUTIVE_TIMEOUTS_TO_PAUSE - 1))
    matching_jobs = [current_job, *previous_jobs]
    count = 0
    for job in matching_jobs:
        if job.status != DataModelingJobStatus.FAILED or not _is_resource_limit_error(job.error):
            break
        count += 1
    return count == CONSECUTIVE_TIMEOUTS_TO_PAUSE, count


@dataclasses.dataclass
class FailMaterializationInputs:
    team_id: int
    node_id: str
    dag_id: str
    job_id: str
    error: str
    cancelled: bool = False
    update_node: bool = True


@database_sync_to_async_pool
def _fail_node_and_data_modeling_job(inputs: FailMaterializationInputs):
    # strip hostnames from error for user-facing storage while preserving original for logging
    sanitized_error = strip_hostname_from_error(inputs.error)

    node = None
    if inputs.update_node:
        with transaction.atomic():
            node = Node.objects.select_for_update().get(id=inputs.node_id, team_id=inputs.team_id, dag_id=inputs.dag_id)
            status = DataModelingJobStatus.CANCELLED if inputs.cancelled else DataModelingJobStatus.FAILED
            update_node_system_properties(
                node,
                status=status,
                job_id=inputs.job_id,
                error=sanitized_error,
            )
            node.save()

    job = DataModelingJob.objects.get(id=inputs.job_id)

    # if the job is already in a terminal state, don't overwrite it — preserves the first error
    if job.status in (DataModelingJobStatus.FAILED, DataModelingJobStatus.CANCELLED, DataModelingJobStatus.COMPLETED):
        return node, job

    job.status = DataModelingJobStatus.CANCELLED if inputs.cancelled else DataModelingJobStatus.FAILED
    job.rows_materialized = 0
    job.error = sanitized_error
    job.save()

    return node, job


@database_sync_to_async_pool
def _get_saved_query_for_job(job: DataModelingJob) -> DataWarehouseSavedQuery | None:
    if not job.saved_query_id:
        return None
    return DataWarehouseSavedQuery.objects.exclude(deleted=True).filter(id=job.saved_query_id).first()


@database_sync_to_async_pool
def _maybe_pause_schedule_on_resource_limit(job: DataModelingJob, saved_query: DataWarehouseSavedQuery) -> bool:
    """Pause the schedule only if the previous N jobs all failed on resource limits.

    Returns True if the schedule was paused, False otherwise. This prevents pausing
    schedules for transient failures that can occur due to temporary ClickHouse load.
    """
    should_pause, _ = should_pause_schedule_for_resource_limits(saved_query.id, job.id)
    if not should_pause:
        return False

    saved_query.sync_frequency_interval = None
    saved_query.save(update_fields=["sync_frequency_interval"])
    try:
        pause_saved_query_schedule(saved_query)
    except RPCError as e:
        # v2-only saved queries have no v1 per-query schedule to pause; the sync-frequency
        # reset above and the user-facing error prefix below must still land.
        if e.status != RPCStatusCode.NOT_FOUND:
            raise
    job.error = f"This materialized view sync schedule has been paused because the query kept exceeding its resource limits (execution time, memory, or bytes read). Reduce the data the query reads, then reset the sync schedule. Error: {job.error}"
    job.save(update_fields=["error"])
    return True


@database_sync_to_async_pool
def _revert_materialization_on_unknown_table(job: DataModelingJob, saved_query: DataWarehouseSavedQuery) -> None:
    saved_query.revert_materialization()
    # we can use this specific language in the error to add these jobs to the daily email digest later
    job.error = (
        f"This materialized view has been reverted to a view because it referenced an unknown table. Error: {job.error}"
    )
    job.save(update_fields=["error"])


@activity.defn
async def fail_materialization_activity(inputs: FailMaterializationInputs) -> None:
    """Mark materialization as failed and update node properties."""
    bind_contextvars(team_id=inputs.team_id)
    logger = LOGGER.bind()
    _, job = await _fail_node_and_data_modeling_job(inputs)
    await logger.aerror(
        f"Failed materialization job: node={inputs.node_id} dag={inputs.dag_id} job={job.id} "
        f"workflow={job.workflow_id} workflow_run={job.workflow_run_id} error={inputs.error}"
    )
    # error-specific recovery: pause schedule on timeout, revert on unknown table, else suspend after repeated failures
    if not inputs.update_node:
        return
    error = inputs.error
    try:
        saved_query = await _get_saved_query_for_job(job)
        if saved_query is None:
            return

        if _is_resource_limit_error(error):
            paused = await _maybe_pause_schedule_on_resource_limit(job, saved_query)
            if paused:
                await logger.ainfo(
                    f"Pausing schedule for node {inputs.node_id} due to {CONSECUTIVE_TIMEOUTS_TO_PAUSE} consecutive resource-limit failures",
                )
            else:
                await logger.ainfo(
                    f"Resource-limit failure for node {inputs.node_id} - not pausing schedule (fewer than {CONSECUTIVE_TIMEOUTS_TO_PAUSE} consecutive resource-limit failures)",
                )
        elif "Unknown table" in error:
            await logger.ainfo(
                f"Reverting materialization for node {inputs.node_id} due to unknown table reference",
            )
            await _revert_materialization_on_unknown_table(job, saved_query)
        else:
            suspended = await maybe_suspend_node_for_engine(
                node_id=inputs.node_id,
                team_id=inputs.team_id,
                dag_id=inputs.dag_id,
                saved_query_id=saved_query.id,
                engine=DataModelingJobEngine.CLICKHOUSE,
                reason=strip_hostname_from_error(error),
                job_id=inputs.job_id,
            )
            if suspended:
                get_node_suspended_metric(DataModelingJobEngine.CLICKHOUSE.value).add(1)
                await logger.ainfo(
                    f"Suspended node {inputs.node_id} (clickhouse) after {CONSECUTIVE_FAILURES_TO_SUSPEND} consecutive failures",
                )
    except Exception as e:
        capture_exception(e)
        await logger.aexception(f"Failed to run error-specific recovery for node {inputs.node_id}: {str(e)}")
