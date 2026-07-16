import asyncio

import pytest
import unittest.mock

from django.test import override_settings

from posthog.settings import HOGQL_INCREASED_MAX_EXECUTION_TIME
from posthog.temporal.common import clickhouse as clickhouse_module
from posthog.temporal.common.clickhouse import (
    ClickHouseMemoryLimitExceededError,
    ClickHouseQueryTimeoutError,
    ClickHouseTooManyBytesError,
)
from posthog.temporal.data_modeling.activities.fail_materialization import _is_resource_limit_error
from posthog.temporal.data_modeling.activities.materialize_view import (
    QUERY_LOG_CLASSIFY_ATTEMPTS,
    _classify_stream_failure,
    _materialization_query_settings,
)
from posthog.temporal.data_modeling.workflows.materialize_view import NON_RETRYABLE_ERRORS


class FakeClickHouseClient:
    def __init__(self, query_log_rows: list[dict] | None = None):
        self.query_log_rows = query_log_rows or []
        self.query_log_lookups = 0

    async def read_query_as_jsonl(self, query, *data, query_parameters=None, query_id=None):
        self.query_log_lookups += 1
        return self.query_log_rows


class TestMaterializationQuerySettings:
    @pytest.mark.parametrize(
        "cap,expected_bytes,expected_mode",
        [
            (1_000_000_000_000, 1_000_000_000_000, "throw"),
            (0, None, None),
        ],
    )
    def test_bytes_read_cap(self, cap, expected_bytes, expected_mode):
        with override_settings(DATA_MODELING_MATERIALIZATION_MAX_BYTES_TO_READ=cap):
            query_settings = _materialization_query_settings()
        assert query_settings.max_execution_time == HOGQL_INCREASED_MAX_EXECUTION_TIME
        assert query_settings.max_bytes_to_read == expected_bytes
        assert query_settings.read_overflow_mode == expected_mode


class TestClassifyStreamFailure:
    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "exception_code,expected_error",
        [
            (307, ClickHouseTooManyBytesError),
            (241, ClickHouseMemoryLimitExceededError),
            (159, ClickHouseQueryTimeoutError),
        ],
    )
    async def test_maps_known_exception_codes_to_typed_errors(self, exception_code, expected_error):
        client = FakeClickHouseClient(
            query_log_rows=[{"exception_code": exception_code, "exception": f"Code: {exception_code}. boom"}]
        )
        typed_error = await _classify_stream_failure(client, "some-query-id")
        assert isinstance(typed_error, expected_error)
        assert f"Code: {exception_code}. boom" in str(typed_error)

    @pytest.mark.asyncio
    async def test_returns_none_for_unrelated_exception_code(self):
        client = FakeClickHouseClient(query_log_rows=[{"exception_code": 404, "exception": "unrelated"}])
        assert await _classify_stream_failure(client, "some-query-id") is None

    @pytest.mark.asyncio
    async def test_polls_boundedly_then_gives_up_when_no_row_appears(self):
        client = FakeClickHouseClient(query_log_rows=[])
        with unittest.mock.patch(
            "posthog.temporal.data_modeling.activities.materialize_view.QUERY_LOG_CLASSIFY_WAIT_SECONDS", 0
        ):
            assert await _classify_stream_failure(client, "some-query-id") is None
        assert client.query_log_lookups == QUERY_LOG_CLASSIFY_ATTEMPTS

    @pytest.mark.asyncio
    async def test_returns_none_when_query_log_lookup_times_out(self):
        class HangingQueryLogClient(FakeClickHouseClient):
            async def read_query_as_jsonl(self, query, *data, query_parameters=None, query_id=None):
                self.query_log_lookups += 1
                await asyncio.Future()

        client = HangingQueryLogClient()
        with (
            unittest.mock.patch(
                "posthog.temporal.data_modeling.activities.materialize_view.QUERY_LOG_CLASSIFY_WAIT_SECONDS", 0
            ),
            unittest.mock.patch(
                "posthog.temporal.data_modeling.activities.materialize_view.QUERY_LOG_CLASSIFY_REQUEST_TIMEOUT_SECONDS",
                0,
            ),
        ):
            assert await _classify_stream_failure(client, "some-query-id") is None
        assert client.query_log_lookups == QUERY_LOG_CLASSIFY_ATTEMPTS


class TestIsResourceLimitError:
    @pytest.mark.parametrize(
        "error,expected",
        [
            ("Timeout exceeded: elapsed 600.1 seconds", True),
            ("query has exceeded timeout", True),
            ("Code: 159. DB::Exception: boom. (TIMEOUT_EXCEEDED)", True),
            ("Code: 307. DB::Exception: Limit for bytes to read exceeded. (TOO_MANY_BYTES)", True),
            ("Code: 241. DB::Exception: Memory limit (for query) exceeded. (MEMORY_LIMIT_EXCEEDED)", True),
            ("Code: 60. DB::Exception: Unknown table", False),
            ("", False),
            (None, False),
        ],
    )
    def test_matches_resource_limit_markers(self, error, expected):
        assert _is_resource_limit_error(error) is expected


def test_non_retryable_errors_reference_real_v2_exception_names():
    for name in ("ClickHouseTooManyBytesError", "ClickHouseMemoryLimitExceededError"):
        assert name in NON_RETRYABLE_ERRORS
        assert hasattr(clickhouse_module, name)
    assert "CHQueryErrorMemoryLimitExceeded" not in NON_RETRYABLE_ERRORS
