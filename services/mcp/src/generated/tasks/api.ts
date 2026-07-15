/**
 * Auto-generated from the Django backend OpenAPI schema.
 * MCP service uses these Zod schemas for generated tool handlers.
 * To regenerate: hogli build:openapi
 *
 * PostHog API - MCP 13 enabled ops
 * OpenAPI spec version: 1.0.0
 */
import * as zod from 'zod'

/**
 * List loops visible to the caller: personal loops they own, plus every team loop.
 * @summary List loops
 */
export const LoopsListParams = /* @__PURE__ */ zod.object({
    project_id: zod
        .string()
        .describe(
            "Project ID of the project you're trying to access. To find the ID of the project, make a call to /api/projects/."
        ),
})

export const LoopsListQueryParams = /* @__PURE__ */ zod.object({
    limit: zod.number().optional().describe('Number of results to return per page.'),
    offset: zod.number().optional().describe('The initial index from which to return the results.'),
})

/**
 * API for managing loops — named, cloud-executed agent automations triggered by
 * schedule, GitHub events or authenticated API calls. See `products/tasks/docs/LOOPS.md`.
 * @summary Create a loop
 */
export const LoopsCreateParams = /* @__PURE__ */ zod.object({
    project_id: zod
        .string()
        .describe(
            "Project ID of the project you're trying to access. To find the ID of the project, make a call to /api/projects/."
        ),
})

export const loopsCreateBodyNameMax = 400

export const loopsCreateBodyDescriptionDefault = ``
export const loopsCreateBodyTakeOwnershipDefault = false
export const loopsCreateBodyVisibilityDefault = `personal`
export const loopsCreateBodyModelDefault = ``
export const loopsCreateBodyRepositoriesItemFullNameMax = 255

export const loopsCreateBodyRepositoriesMax = 1

export const loopsCreateBodyEnabledDefault = true
export const loopsCreateBodyOverlapPolicyDefault = `skip`
export const loopsCreateBodyBehaviorsOneCreatePrsDefault = false
export const loopsCreateBodyBehaviorsOneWatchCiDefault = false
export const loopsCreateBodyBehaviorsOneFixReviewCommentsDefault = false
export const loopsCreateBodyBehaviorsOneMaxFixIterationsDefault = 3
export const loopsCreateBodyBehaviorsOneMaxFixIterationsMin = 0
export const loopsCreateBodyBehaviorsOneMaxFixIterationsMax = 10

export const loopsCreateBodyConnectorsOnePosthogMcpScopesDefault = `read_only`
export const loopsCreateBodyNotificationsOnePushOneEnabledDefault = false
export const loopsCreateBodyNotificationsOneEmailOneEnabledDefault = false
export const loopsCreateBodyNotificationsOneSlackOneEnabledDefault = false
export const loopsCreateBodyContextTargetOneNameMax = 128

export const loopsCreateBodyContextTargetOneOutputsOnePostToFeedDefault = false
export const loopsCreateBodyContextTargetOneOutputsOneUpdateContextDefault = false
export const loopsCreateBodyTriggersItemEnabledDefault = true

export const LoopsCreateBody = /* @__PURE__ */ zod
    .object({
        name: zod.string().max(loopsCreateBodyNameMax).describe('Display name for the loop.'),
        description: zod
            .string()
            .default(loopsCreateBodyDescriptionDefault)
            .describe('Free-form description of what this loop does.'),
        take_ownership: zod
            .boolean()
            .default(loopsCreateBodyTakeOwnershipDefault)
            .describe(
                'On a team loop, claim ownership as part of this update so you can edit identity-bearing config (instructions, model, triggers, ...) that only the owner may change. Ignored on personal loops and on create.'
            ),
        visibility: zod
            .enum(['personal', 'team'])
            .describe('* `personal` - personal\n* `team` - team')
            .default(loopsCreateBodyVisibilityDefault)
            .describe(
                '`personal` (owner-only) or `team` (visible and fireable by any team member).\n\n* `personal` - personal\n* `team` - team'
            ),
        instructions: zod.string().describe('The prompt delivered to the agent on every run.'),
        runtime_adapter: zod
            .enum(['claude', 'codex'])
            .describe('* `claude` - claude\n* `codex` - codex')
            .describe("Runtime adapter: 'claude' or 'codex'.\n\n* `claude` - claude\n* `codex` - codex"),
        model: zod
            .string()
            .default(loopsCreateBodyModelDefault)
            .describe(
                "LLM model identifier, validated against `runtime_adapter`'s catalog. Leave blank to let PostHog pick a sensible default at run time."
            ),
        reasoning_effort: zod
            .union([
                zod
                    .enum(['low', 'medium', 'high', 'xhigh', 'max'])
                    .describe('* `low` - low\n* `medium` - medium\n* `high` - high\n* `xhigh` - xhigh\n* `max` - max'),
                zod.null(),
            ])
            .optional()
            .describe(
                "Reasoning effort, validated against `runtime_adapter`/`model`'s supported set.\n\n* `low` - low\n* `medium` - medium\n* `high` - high\n* `xhigh` - xhigh\n* `max` - max"
            ),
        repositories: zod
            .array(
                zod.object({
                    github_integration_id: zod
                        .number()
                        .describe('GitHub integration id this repository is accessed through.'),
                    full_name: zod
                        .string()
                        .max(loopsCreateBodyRepositoriesItemFullNameMax)
                        .describe('Repository in `organization/repo` format, e.g. `posthog/posthog`.'),
                })
            )
            .max(loopsCreateBodyRepositoriesMax)
            .optional()
            .describe(
                'Repositories this loop operates on, ordered. Capped at 1 until multi-repo execution ships. May be empty for report-only loops.'
            ),
        sandbox_environment: zod
            .string()
            .nullish()
            .describe('Sandbox environment carrying encrypted env vars and the network allowlist into every run.'),
        enabled: zod
            .boolean()
            .default(loopsCreateBodyEnabledDefault)
            .describe("Whether the loop's triggers are active. Pausing disables all triggers."),
        overlap_policy: zod
            .enum(['skip', 'allow', 'cancel_previous'])
            .describe('* `skip` - skip\n* `allow` - allow\n* `cancel_previous` - cancel_previous')
            .default(loopsCreateBodyOverlapPolicyDefault)
            .describe(
                "What happens when a trigger fires while a run is already active: 'skip', 'allow', or 'cancel_previous'.\n\n* `skip` - skip\n* `allow` - allow\n* `cancel_previous` - cancel_previous"
            ),
        behaviors: zod
            .object({
                create_prs: zod
                    .boolean()
                    .default(loopsCreateBodyBehaviorsOneCreatePrsDefault)
                    .describe('Whether the agent may push branches and open PRs. False makes this a report-only loop.'),
                watch_ci: zod
                    .boolean()
                    .default(loopsCreateBodyBehaviorsOneWatchCiDefault)
                    .describe('Whether to watch CI on loop-created PRs and report status.'),
                fix_review_comments: zod
                    .boolean()
                    .default(loopsCreateBodyBehaviorsOneFixReviewCommentsDefault)
                    .describe('Whether to automatically address review comments on loop-created PRs.'),
                max_fix_iterations: zod
                    .number()
                    .min(loopsCreateBodyBehaviorsOneMaxFixIterationsMin)
                    .max(loopsCreateBodyBehaviorsOneMaxFixIterationsMax)
                    .default(loopsCreateBodyBehaviorsOneMaxFixIterationsDefault)
                    .describe('Ceiling on automatic CI/review-comment fix iterations, capped at 10.'),
            })
            .optional()
            .describe('PR / CI-follow-up behavior configuration.'),
        connectors: zod
            .object({
                mcp_installation_ids: zod
                    .array(zod.string())
                    .optional()
                    .describe("MCP Store installation ids (Slack, Linear, etc.) available to this loop's runs."),
                posthog_mcp_scopes: zod
                    .enum(['read_only', 'full'])
                    .describe('* `read_only` - read_only\n* `full` - full')
                    .default(loopsCreateBodyConnectorsOnePosthogMcpScopesDefault)
                    .describe(
                        "Scope of the PostHog MCP access injected into this loop's runs.\n\n* `read_only` - read_only\n* `full` - full"
                    ),
            })
            .optional()
            .describe("MCP connector configuration for this loop's runs."),
        notifications: zod
            .object({
                push: zod
                    .object({
                        enabled: zod
                            .boolean()
                            .default(loopsCreateBodyNotificationsOnePushOneEnabledDefault)
                            .describe('Whether this channel is active.'),
                        events: zod
                            .array(
                                zod
                                    .enum(['run_completed', 'run_failed', 'pr_created', 'needs_attention'])
                                    .describe(
                                        '* `run_completed` - run_completed\n* `run_failed` - run_failed\n* `pr_created` - pr_created\n* `needs_attention` - needs_attention'
                                    )
                            )
                            .optional()
                            .describe(
                                'Event kinds this channel notifies on. One or more of: run_completed, run_failed, pr_created, needs_attention.'
                            ),
                        params: zod
                            .record(zod.string(), zod.unknown())
                            .optional()
                            .describe("Channel-specific parameters, e.g. Slack's `integration_id` and `channel`."),
                    })
                    .optional()
                    .describe('Push notification settings.'),
                email: zod
                    .object({
                        enabled: zod
                            .boolean()
                            .default(loopsCreateBodyNotificationsOneEmailOneEnabledDefault)
                            .describe('Whether this channel is active.'),
                        events: zod
                            .array(
                                zod
                                    .enum(['run_completed', 'run_failed', 'pr_created', 'needs_attention'])
                                    .describe(
                                        '* `run_completed` - run_completed\n* `run_failed` - run_failed\n* `pr_created` - pr_created\n* `needs_attention` - needs_attention'
                                    )
                            )
                            .optional()
                            .describe(
                                'Event kinds this channel notifies on. One or more of: run_completed, run_failed, pr_created, needs_attention.'
                            ),
                        params: zod
                            .record(zod.string(), zod.unknown())
                            .optional()
                            .describe("Channel-specific parameters, e.g. Slack's `integration_id` and `channel`."),
                    })
                    .optional()
                    .describe('Email notification settings.'),
                slack: zod
                    .object({
                        enabled: zod
                            .boolean()
                            .default(loopsCreateBodyNotificationsOneSlackOneEnabledDefault)
                            .describe('Whether this channel is active.'),
                        events: zod
                            .array(
                                zod
                                    .enum(['run_completed', 'run_failed', 'pr_created', 'needs_attention'])
                                    .describe(
                                        '* `run_completed` - run_completed\n* `run_failed` - run_failed\n* `pr_created` - pr_created\n* `needs_attention` - needs_attention'
                                    )
                            )
                            .optional()
                            .describe(
                                'Event kinds this channel notifies on. One or more of: run_completed, run_failed, pr_created, needs_attention.'
                            ),
                        params: zod
                            .record(zod.string(), zod.unknown())
                            .optional()
                            .describe("Channel-specific parameters, e.g. Slack's `integration_id` and `channel`."),
                    })
                    .optional()
                    .describe('Slack notification settings.'),
            })
            .optional()
            .describe('Per-channel notification configuration.'),
        context_target: zod
            .union([
                zod.object({
                    folder_id: zod.string().describe('Desktop folder id of the context this loop is attached to.'),
                    name: zod
                        .string()
                        .max(loopsCreateBodyContextTargetOneNameMax)
                        .describe('Context (channel) name, used to file runs into its feed.'),
                    outputs: zod
                        .object({
                            post_to_feed: zod
                                .boolean()
                                .default(loopsCreateBodyContextTargetOneOutputsOnePostToFeedDefault)
                                .describe(
                                    "Whether each run is filed into the context's feed as a card (sets the run's channel)."
                                ),
                            update_context: zod
                                .boolean()
                                .default(loopsCreateBodyContextTargetOneOutputsOneUpdateContextDefault)
                                .describe(
                                    "Whether each run reads and republishes the context's context.md to reflect the latest state."
                                ),
                            canvas_id: zod
                                .string()
                                .nullish()
                                .describe(
                                    'Id of a canvas in this context the loop keeps up to date each run, or null to maintain none.'
                                ),
                        })
                        .optional()
                        .describe('What the loop maintains in this context each run.'),
                }),
                zod.null(),
            ])
            .optional()
            .describe(
                'Context (channel) this loop is attached to, or null to detach. Drives feed placement and the context.md / canvas it keeps up to date.'
            ),
        triggers: zod
            .array(
                zod.object({
                    id: zod
                        .string()
                        .optional()
                        .describe('Existing trigger id to update in place. Omit to create a new trigger.'),
                    type: zod
                        .enum(['schedule', 'github', 'api'])
                        .describe('* `schedule` - schedule\n* `github` - github\n* `api` - api')
                        .describe(
                            'Trigger type: `schedule` (cron or one-time), `github` (repo webhook events), or `api` (POST to `trigger/`).\n\n* `schedule` - schedule\n* `github` - github\n* `api` - api'
                        ),
                    enabled: zod
                        .boolean()
                        .default(loopsCreateBodyTriggersItemEnabledDefault)
                        .describe('Whether this trigger is active. Disabling pauses only this trigger.'),
                    config: zod
                        .unknown()
                        .optional()
                        .describe(
                            'Trigger configuration, shape validated per `type`: schedule takes `{cron_expression, timezone}` or `{run_at}` for a one-time run; github takes `{github_integration_id, repository, events, filters}`; api takes no config.'
                        ),
                })
            )
            .optional()
            .describe(
                'Full desired trigger list, id-stable: entries with a matching `id` are updated in place, entries without one are created, and existing triggers absent from this list are deleted. Omit the field entirely to leave triggers untouched. At most 25 triggers per loop.'
            ),
    })
    .describe(
        'Request body for creating or updating a loop. Field required/default semantics match\nthe `Loop` model; partial updates only touch keys present in the payload.'
    )

/**
 * API for managing loops — named, cloud-executed agent automations triggered by
 * schedule, GitHub events or authenticated API calls. See `products/tasks/docs/LOOPS.md`.
 * @summary Get a loop
 */
export const LoopsRetrieveParams = /* @__PURE__ */ zod.object({
    id: zod.string(),
    project_id: zod
        .string()
        .describe(
            "Project ID of the project you're trying to access. To find the ID of the project, make a call to /api/projects/."
        ),
})

/**
 * Partial update. Identity-bearing fields (instructions, repositories, connectors, behaviors, model config, triggers) are owner-only on team loops; name, description, notifications and enable/pause are editable by any team member.
 * @summary Update a loop
 */
export const LoopsPartialUpdateParams = /* @__PURE__ */ zod.object({
    id: zod.string(),
    project_id: zod
        .string()
        .describe(
            "Project ID of the project you're trying to access. To find the ID of the project, make a call to /api/projects/."
        ),
})

export const loopsPartialUpdateBodyNameMax = 400

export const loopsPartialUpdateBodyRepositoriesItemFullNameMax = 255

export const loopsPartialUpdateBodyRepositoriesMax = 1

export const loopsPartialUpdateBodyBehaviorsOneCreatePrsDefault = false
export const loopsPartialUpdateBodyBehaviorsOneWatchCiDefault = false
export const loopsPartialUpdateBodyBehaviorsOneFixReviewCommentsDefault = false
export const loopsPartialUpdateBodyBehaviorsOneMaxFixIterationsDefault = 3
export const loopsPartialUpdateBodyBehaviorsOneMaxFixIterationsMin = 0
export const loopsPartialUpdateBodyBehaviorsOneMaxFixIterationsMax = 10

export const loopsPartialUpdateBodyConnectorsOnePosthogMcpScopesDefault = `read_only`
export const loopsPartialUpdateBodyNotificationsOnePushOneEnabledDefault = false
export const loopsPartialUpdateBodyNotificationsOneEmailOneEnabledDefault = false
export const loopsPartialUpdateBodyNotificationsOneSlackOneEnabledDefault = false
export const loopsPartialUpdateBodyContextTargetOneNameMax = 128

export const loopsPartialUpdateBodyContextTargetOneOutputsOnePostToFeedDefault = false
export const loopsPartialUpdateBodyContextTargetOneOutputsOneUpdateContextDefault = false
export const loopsPartialUpdateBodyTriggersItemEnabledDefault = true

export const LoopsPartialUpdateBody = /* @__PURE__ */ zod
    .object({
        name: zod.string().max(loopsPartialUpdateBodyNameMax).optional().describe('Display name for the loop.'),
        description: zod.string().optional().describe('Free-form description of what this loop does.'),
        take_ownership: zod
            .boolean()
            .optional()
            .describe(
                'On a team loop, claim ownership as part of this update so you can edit identity-bearing config (instructions, model, triggers, ...) that only the owner may change. Ignored on personal loops and on create.'
            ),
        visibility: zod
            .enum(['personal', 'team'])
            .describe('* `personal` - personal\n* `team` - team')
            .optional()
            .describe(
                '`personal` (owner-only) or `team` (visible and fireable by any team member).\n\n* `personal` - personal\n* `team` - team'
            ),
        instructions: zod.string().optional().describe('The prompt delivered to the agent on every run.'),
        runtime_adapter: zod
            .enum(['claude', 'codex'])
            .describe('* `claude` - claude\n* `codex` - codex')
            .optional()
            .describe("Runtime adapter: 'claude' or 'codex'.\n\n* `claude` - claude\n* `codex` - codex"),
        model: zod
            .string()
            .optional()
            .describe(
                "LLM model identifier, validated against `runtime_adapter`'s catalog. Leave blank to let PostHog pick a sensible default at run time."
            ),
        reasoning_effort: zod
            .union([
                zod
                    .enum(['low', 'medium', 'high', 'xhigh', 'max'])
                    .describe('* `low` - low\n* `medium` - medium\n* `high` - high\n* `xhigh` - xhigh\n* `max` - max'),
                zod.null(),
            ])
            .optional()
            .describe(
                "Reasoning effort, validated against `runtime_adapter`/`model`'s supported set.\n\n* `low` - low\n* `medium` - medium\n* `high` - high\n* `xhigh` - xhigh\n* `max` - max"
            ),
        repositories: zod
            .array(
                zod.object({
                    github_integration_id: zod
                        .number()
                        .describe('GitHub integration id this repository is accessed through.'),
                    full_name: zod
                        .string()
                        .max(loopsPartialUpdateBodyRepositoriesItemFullNameMax)
                        .describe('Repository in `organization/repo` format, e.g. `posthog/posthog`.'),
                })
            )
            .max(loopsPartialUpdateBodyRepositoriesMax)
            .optional()
            .describe(
                'Repositories this loop operates on, ordered. Capped at 1 until multi-repo execution ships. May be empty for report-only loops.'
            ),
        sandbox_environment: zod
            .string()
            .nullish()
            .describe('Sandbox environment carrying encrypted env vars and the network allowlist into every run.'),
        enabled: zod
            .boolean()
            .optional()
            .describe("Whether the loop's triggers are active. Pausing disables all triggers."),
        overlap_policy: zod
            .enum(['skip', 'allow', 'cancel_previous'])
            .describe('* `skip` - skip\n* `allow` - allow\n* `cancel_previous` - cancel_previous')
            .optional()
            .describe(
                "What happens when a trigger fires while a run is already active: 'skip', 'allow', or 'cancel_previous'.\n\n* `skip` - skip\n* `allow` - allow\n* `cancel_previous` - cancel_previous"
            ),
        behaviors: zod
            .object({
                create_prs: zod
                    .boolean()
                    .default(loopsPartialUpdateBodyBehaviorsOneCreatePrsDefault)
                    .describe('Whether the agent may push branches and open PRs. False makes this a report-only loop.'),
                watch_ci: zod
                    .boolean()
                    .default(loopsPartialUpdateBodyBehaviorsOneWatchCiDefault)
                    .describe('Whether to watch CI on loop-created PRs and report status.'),
                fix_review_comments: zod
                    .boolean()
                    .default(loopsPartialUpdateBodyBehaviorsOneFixReviewCommentsDefault)
                    .describe('Whether to automatically address review comments on loop-created PRs.'),
                max_fix_iterations: zod
                    .number()
                    .min(loopsPartialUpdateBodyBehaviorsOneMaxFixIterationsMin)
                    .max(loopsPartialUpdateBodyBehaviorsOneMaxFixIterationsMax)
                    .default(loopsPartialUpdateBodyBehaviorsOneMaxFixIterationsDefault)
                    .describe('Ceiling on automatic CI/review-comment fix iterations, capped at 10.'),
            })
            .optional()
            .describe('PR / CI-follow-up behavior configuration.'),
        connectors: zod
            .object({
                mcp_installation_ids: zod
                    .array(zod.string())
                    .optional()
                    .describe("MCP Store installation ids (Slack, Linear, etc.) available to this loop's runs."),
                posthog_mcp_scopes: zod
                    .enum(['read_only', 'full'])
                    .describe('* `read_only` - read_only\n* `full` - full')
                    .default(loopsPartialUpdateBodyConnectorsOnePosthogMcpScopesDefault)
                    .describe(
                        "Scope of the PostHog MCP access injected into this loop's runs.\n\n* `read_only` - read_only\n* `full` - full"
                    ),
            })
            .optional()
            .describe("MCP connector configuration for this loop's runs."),
        notifications: zod
            .object({
                push: zod
                    .object({
                        enabled: zod
                            .boolean()
                            .default(loopsPartialUpdateBodyNotificationsOnePushOneEnabledDefault)
                            .describe('Whether this channel is active.'),
                        events: zod
                            .array(
                                zod
                                    .enum(['run_completed', 'run_failed', 'pr_created', 'needs_attention'])
                                    .describe(
                                        '* `run_completed` - run_completed\n* `run_failed` - run_failed\n* `pr_created` - pr_created\n* `needs_attention` - needs_attention'
                                    )
                            )
                            .optional()
                            .describe(
                                'Event kinds this channel notifies on. One or more of: run_completed, run_failed, pr_created, needs_attention.'
                            ),
                        params: zod
                            .record(zod.string(), zod.unknown())
                            .optional()
                            .describe("Channel-specific parameters, e.g. Slack's `integration_id` and `channel`."),
                    })
                    .optional()
                    .describe('Push notification settings.'),
                email: zod
                    .object({
                        enabled: zod
                            .boolean()
                            .default(loopsPartialUpdateBodyNotificationsOneEmailOneEnabledDefault)
                            .describe('Whether this channel is active.'),
                        events: zod
                            .array(
                                zod
                                    .enum(['run_completed', 'run_failed', 'pr_created', 'needs_attention'])
                                    .describe(
                                        '* `run_completed` - run_completed\n* `run_failed` - run_failed\n* `pr_created` - pr_created\n* `needs_attention` - needs_attention'
                                    )
                            )
                            .optional()
                            .describe(
                                'Event kinds this channel notifies on. One or more of: run_completed, run_failed, pr_created, needs_attention.'
                            ),
                        params: zod
                            .record(zod.string(), zod.unknown())
                            .optional()
                            .describe("Channel-specific parameters, e.g. Slack's `integration_id` and `channel`."),
                    })
                    .optional()
                    .describe('Email notification settings.'),
                slack: zod
                    .object({
                        enabled: zod
                            .boolean()
                            .default(loopsPartialUpdateBodyNotificationsOneSlackOneEnabledDefault)
                            .describe('Whether this channel is active.'),
                        events: zod
                            .array(
                                zod
                                    .enum(['run_completed', 'run_failed', 'pr_created', 'needs_attention'])
                                    .describe(
                                        '* `run_completed` - run_completed\n* `run_failed` - run_failed\n* `pr_created` - pr_created\n* `needs_attention` - needs_attention'
                                    )
                            )
                            .optional()
                            .describe(
                                'Event kinds this channel notifies on. One or more of: run_completed, run_failed, pr_created, needs_attention.'
                            ),
                        params: zod
                            .record(zod.string(), zod.unknown())
                            .optional()
                            .describe("Channel-specific parameters, e.g. Slack's `integration_id` and `channel`."),
                    })
                    .optional()
                    .describe('Slack notification settings.'),
            })
            .optional()
            .describe('Per-channel notification configuration.'),
        context_target: zod
            .union([
                zod.object({
                    folder_id: zod.string().describe('Desktop folder id of the context this loop is attached to.'),
                    name: zod
                        .string()
                        .max(loopsPartialUpdateBodyContextTargetOneNameMax)
                        .describe('Context (channel) name, used to file runs into its feed.'),
                    outputs: zod
                        .object({
                            post_to_feed: zod
                                .boolean()
                                .default(loopsPartialUpdateBodyContextTargetOneOutputsOnePostToFeedDefault)
                                .describe(
                                    "Whether each run is filed into the context's feed as a card (sets the run's channel)."
                                ),
                            update_context: zod
                                .boolean()
                                .default(loopsPartialUpdateBodyContextTargetOneOutputsOneUpdateContextDefault)
                                .describe(
                                    "Whether each run reads and republishes the context's context.md to reflect the latest state."
                                ),
                            canvas_id: zod
                                .string()
                                .nullish()
                                .describe(
                                    'Id of a canvas in this context the loop keeps up to date each run, or null to maintain none.'
                                ),
                        })
                        .optional()
                        .describe('What the loop maintains in this context each run.'),
                }),
                zod.null(),
            ])
            .optional()
            .describe(
                'Context (channel) this loop is attached to, or null to detach. Drives feed placement and the context.md / canvas it keeps up to date.'
            ),
        triggers: zod
            .array(
                zod.object({
                    id: zod
                        .string()
                        .optional()
                        .describe('Existing trigger id to update in place. Omit to create a new trigger.'),
                    type: zod
                        .enum(['schedule', 'github', 'api'])
                        .describe('* `schedule` - schedule\n* `github` - github\n* `api` - api')
                        .describe(
                            'Trigger type: `schedule` (cron or one-time), `github` (repo webhook events), or `api` (POST to `trigger/`).\n\n* `schedule` - schedule\n* `github` - github\n* `api` - api'
                        ),
                    enabled: zod
                        .boolean()
                        .default(loopsPartialUpdateBodyTriggersItemEnabledDefault)
                        .describe('Whether this trigger is active. Disabling pauses only this trigger.'),
                    config: zod
                        .unknown()
                        .optional()
                        .describe(
                            'Trigger configuration, shape validated per `type`: schedule takes `{cron_expression, timezone}` or `{run_at}` for a one-time run; github takes `{github_integration_id, repository, events, filters}`; api takes no config.'
                        ),
                })
            )
            .optional()
            .describe(
                'Full desired trigger list, id-stable: entries with a matching `id` are updated in place, entries without one are created, and existing triggers absent from this list are deleted. Omit the field entirely to leave triggers untouched. At most 25 triggers per loop.'
            ),
    })
    .describe(
        'Request body for creating or updating a loop. Field required/default semantics match\nthe `Loop` model; partial updates only touch keys present in the payload.'
    )

/**
 * Soft delete. Pauses every trigger's schedule. Owner or a project admin only.
 * @summary Delete a loop
 */
export const LoopsDestroyParams = /* @__PURE__ */ zod.object({
    id: zod.string(),
    project_id: zod
        .string()
        .describe(
            "Project ID of the project you're trying to access. To find the ID of the project, make a call to /api/projects/."
        ),
})

/**
 * Dry run: renders the assembled instructions and trigger context for a supplied sample payload (or a synthetic schedule fire when omitted), without creating a task, run, or any other side effect.
 * @summary Preview a loop fire
 */
export const LoopsPreviewCreateParams = /* @__PURE__ */ zod.object({
    id: zod.string(),
    project_id: zod
        .string()
        .describe(
            "Project ID of the project you're trying to access. To find the ID of the project, make a call to /api/projects/."
        ),
})

export const loopsPreviewCreateBodyTriggerTypeDefault = `schedule`

export const LoopsPreviewCreateBody = /* @__PURE__ */ zod.object({
    trigger_type: zod
        .enum(['schedule', 'github', 'api'])
        .describe('* `schedule` - schedule\n* `github` - github\n* `api` - api')
        .default(loopsPreviewCreateBodyTriggerTypeDefault)
        .describe(
            'Trigger type to simulate. Defaults to a synthetic schedule fire.\n\n* `schedule` - schedule\n* `github` - github\n* `api` - api'
        ),
    payload: zod
        .unknown()
        .optional()
        .describe('Sample trigger payload, e.g. a GitHub webhook body or an API trigger body, to render into context.'),
})

/**
 * Manual fire from the UI. Owner-only for personal loops; any team member for team loops.
 * @summary Run a loop manually
 */
export const LoopsRunCreateParams = /* @__PURE__ */ zod.object({
    id: zod.string(),
    project_id: zod
        .string()
        .describe(
            "Project ID of the project you're trying to access. To find the ID of the project, make a call to /api/projects/."
        ),
})

/**
 * Run history for a loop, newest first, cursor-paginated.
 * @summary List loop runs
 */
export const LoopsRunsRetrieveParams = /* @__PURE__ */ zod.object({
    id: zod.string(),
    project_id: zod
        .string()
        .describe(
            "Project ID of the project you're trying to access. To find the ID of the project, make a call to /api/projects/."
        ),
})

export const loopsRunsRetrieveQueryLimitDefault = 50
export const loopsRunsRetrieveQueryLimitMax = 100

export const LoopsRunsRetrieveQueryParams = /* @__PURE__ */ zod.object({
    cursor: zod
        .string()
        .min(1)
        .optional()
        .describe("Opaque pagination cursor from a previous response's `next_cursor`."),
    limit: zod
        .number()
        .min(1)
        .max(loopsRunsRetrieveQueryLimitMax)
        .default(loopsRunsRetrieveQueryLimitDefault)
        .describe('Max results per page (default 50, max 100).'),
})

/**
 * Get a list of tasks for the current project, with optional filtering by origin product, stage, organization, repository, and created_by.
 * @summary List tasks
 */
export const TasksListParams = /* @__PURE__ */ zod.object({
    project_id: zod
        .string()
        .describe(
            "Project ID of the project you're trying to access. To find the ID of the project, make a call to /api/projects/."
        ),
})

export const tasksListQueryAllTeamTasksDefault = false
export const tasksListQueryLimitDefault = 50
export const tasksListQueryLimitMax = 100

export const tasksListQueryOffsetDefault = 0
export const tasksListQueryOffsetMin = 0

export const TasksListQueryParams = /* @__PURE__ */ zod.object({
    all_team_tasks: zod
        .boolean()
        .default(tasksListQueryAllTeamTasksDefault)
        .describe(
            'Staff-only. When true, list every task on the team regardless of creator or channel, bypassing the per-user visibility filter. Ignored for non-staff users.'
        ),
    archived: zod
        .enum(['true', 'false', 'all'])
        .optional()
        .describe(
            "Filter by archived state. Defaults to excluding archived tasks. Use 'true' to list only archived tasks, 'false' for the default, or 'all' to include both.\n\n* `true` - true\n* `false` - false\n* `all` - all"
        ),
    channel: zod.string().optional().describe("Filter tasks to a channel's feed."),
    created_by: zod.number().optional().describe('Filter by creator user ID'),
    internal: zod
        .enum(['true', 'false', 'all'])
        .optional()
        .describe(
            "Filter by the internal flag, which controls whether a task is shown by default, not whether it is accessible. Defaults to excluding internal tasks. Use 'all' to include both internal and user-facing tasks, or 'true' to list only internal tasks. All values are available to any team member; access stays governed by task visibility.\n\n* `true` - true\n* `false` - false\n* `all` - all"
        ),
    limit: zod
        .number()
        .min(1)
        .max(tasksListQueryLimitMax)
        .default(tasksListQueryLimitDefault)
        .describe('Number of results to return per page.'),
    offset: zod
        .number()
        .min(tasksListQueryOffsetMin)
        .default(tasksListQueryOffsetDefault)
        .describe('The initial index from which to return the results.'),
    organization: zod.string().min(1).optional().describe('Filter by repository organization'),
    origin_product: zod.string().min(1).optional().describe('Filter by origin product'),
    repository: zod.string().min(1).optional().describe('Filter by repository name (can include org/repo format)'),
    search: zod
        .string()
        .optional()
        .describe(
            'Case-insensitive substring search over task title and description. A numeric value also matches the task number. An empty value disables the filter.'
        ),
    stage: zod.string().min(1).optional().describe('Filter by task run stage'),
    status: zod
        .enum(['not_started', 'queued', 'in_progress', 'completed', 'failed', 'cancelled'])
        .optional()
        .describe(
            'Filter tasks by the status of their most recent run.\n\n* `not_started` - not_started\n* `queued` - queued\n* `in_progress` - in_progress\n* `completed` - completed\n* `failed` - failed\n* `cancelled` - cancelled'
        ),
})

/**
 * Retrieve a single task by ID.
 * @summary Get task
 */
export const TasksRetrieveParams = /* @__PURE__ */ zod.object({
    id: zod.string(),
    project_id: zod
        .string()
        .describe(
            "Project ID of the project you're trying to access. To find the ID of the project, make a call to /api/projects/."
        ),
})

/**
 * Get a list of runs for a specific task.
 * @summary List task runs
 */
export const TasksRunsListParams = /* @__PURE__ */ zod.object({
    project_id: zod
        .string()
        .describe(
            "Project ID of the project you're trying to access. To find the ID of the project, make a call to /api/projects/."
        ),
    task_id: zod.string(),
})

export const tasksRunsListQueryLimitDefault = 50
export const tasksRunsListQueryLimitMax = 100

export const tasksRunsListQueryOffsetDefault = 0
export const tasksRunsListQueryOffsetMin = 0

export const TasksRunsListQueryParams = /* @__PURE__ */ zod.object({
    limit: zod
        .number()
        .min(1)
        .max(tasksRunsListQueryLimitMax)
        .default(tasksRunsListQueryLimitDefault)
        .describe('Number of results to return per page.'),
    offset: zod
        .number()
        .min(tasksRunsListQueryOffsetMin)
        .default(tasksRunsListQueryOffsetDefault)
        .describe('The initial index from which to return the results.'),
})

/**
 * Retrieve a single run for a specific task.
 * @summary Get task run
 */
export const TasksRunsRetrieveParams = /* @__PURE__ */ zod.object({
    id: zod.string(),
    project_id: zod
        .string()
        .describe(
            "Project ID of the project you're trying to access. To find the ID of the project, make a call to /api/projects/."
        ),
    task_id: zod.string(),
})

/**
 * Fetch session log entries for a task run with optional filtering by timestamp, event type, and limit.
 * @summary Get filtered task run session logs
 */
export const TasksRunsSessionLogsRetrieveParams = /* @__PURE__ */ zod.object({
    id: zod.string(),
    project_id: zod
        .string()
        .describe(
            "Project ID of the project you're trying to access. To find the ID of the project, make a call to /api/projects/."
        ),
    task_id: zod.string(),
})

export const tasksRunsSessionLogsRetrieveQueryLimitDefault = 1000
export const tasksRunsSessionLogsRetrieveQueryLimitMax = 5000

export const tasksRunsSessionLogsRetrieveQueryOffsetDefault = 0
export const tasksRunsSessionLogsRetrieveQueryOffsetMin = 0

export const TasksRunsSessionLogsRetrieveQueryParams = /* @__PURE__ */ zod.object({
    after: zod.iso.datetime({ offset: true }).optional().describe('Only return events after this ISO8601 timestamp'),
    event_types: zod.string().min(1).optional().describe('Comma-separated list of event types to include'),
    exclude_types: zod.string().min(1).optional().describe('Comma-separated list of event types to exclude'),
    limit: zod
        .number()
        .min(1)
        .max(tasksRunsSessionLogsRetrieveQueryLimitMax)
        .default(tasksRunsSessionLogsRetrieveQueryLimitDefault)
        .describe('Maximum number of entries to return (default 1000, max 5000)'),
    offset: zod
        .number()
        .min(tasksRunsSessionLogsRetrieveQueryOffsetMin)
        .default(tasksRunsSessionLogsRetrieveQueryOffsetDefault)
        .describe('Zero-based offset into the filtered log entries'),
})
