import { Counter, Histogram } from 'prom-client'

export const aiCostLookupCounter = new Counter({
    name: 'llma_ai_cost_lookup_total',
    help: 'AI model cost lookup outcomes',
    labelNames: ['status'],
})

export const aiErrorNormalizationCounter = new Counter({
    name: 'llma_ai_error_normalization_total',
    help: 'AI error normalization outcomes',
    labelNames: ['status'],
})

export const aiCostModalityExtractionCounter = new Counter({
    name: 'llma_ai_cost_modality_extraction_total',
    help: 'AI cost modality token extraction outcomes by source',
    labelNames: ['status', 'source'],
})

export const aiCostTotalOutcomeCounter = new Counter({
    name: 'llma_ai_cost_outcome_total',
    help: 'Outcome of total cost calculation (positive, zero, negative)',
    labelNames: ['outcome'],
})

export const aiToolCallExtractionCounter = new Counter({
    name: 'llma_ai_tool_call_extraction_total',
    help: 'AI tool call extraction outcomes',
    labelNames: ['status'],
})

export const aiOtelMiddlewareCounter = new Counter({
    name: 'llma_ai_otel_middleware_total',
    help: 'OTel events processed by library middleware',
    labelNames: ['library'],
})

export const aiOtelEventTypeCounter = new Counter({
    name: 'llma_ai_otel_event_type_total',
    help: 'OTel events by type and library',
    labelNames: ['event_type', 'library'],
})

export const aiOtelOlderSpecEventsCounter = new Counter({
    name: 'llma_ai_otel_older_spec_events_total',
    help: 'Outcome of decoding the older OTel GenAI span-events `events` attribute',
    labelNames: ['outcome'],
})

export const aiOtelSystemInstructionsCounter = new Counter({
    name: 'llma_ai_otel_system_instructions_total',
    help: 'Outcome of promoting `gen_ai.system_instructions` into a leading $ai_input system message',
    labelNames: ['outcome'],
})

export const aiOtelGroupsCounter = new Counter({
    name: 'llma_ai_otel_groups_total',
    help: 'Outcome of decoding a string-valued $groups attribute back into an object',
    labelNames: ['outcome'],
})

export const aiBlobOffloadS3Duration = new Histogram({
    name: 'llma_ai_blob_offload_s3_request_duration_seconds',
    help: 'Latency of S3 requests made by the AI blob offload store',
    labelNames: ['op'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
})

export const aiBlobOffloadS3Errors = new Counter({
    name: 'llma_ai_blob_offload_s3_errors_total',
    help: 'S3 request failures in the AI blob offload store',
    labelNames: ['op'],
})
