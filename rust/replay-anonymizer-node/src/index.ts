/* eslint-disable @typescript-eslint/no-var-requires */
// The native addon is built from `src/lib.rs` and copied to `index.node` at the package root.
const native = require('../index.node')

export interface AllowListsInput {
    /** Words kept verbatim by the text scrubber (ASCII-case-insensitive). */
    text: string[]
    /** URL path segments/params kept verbatim by the URL scrubber. */
    url: string[]
}

/** Per emitted JSONL line, in line order. */
export interface AnonymizeEventMeta {
    /** The event's `timestamp` (epoch ms; can be fractional). */
    ts: number
    /** Bitmask of the FLAG_* bits in `snapshot.rs` (mirrored as PRE_SERIALIZED_FLAG_* in the consumer). */
    flags: number
    /** Post-scrub `hrefFrom(event)` (`data.href` / `data.payload.href`, trimmed), when present. */
    href?: string
}

/** One collected original image: `offset..offset+len` in {@link AnonymizeKafkaPayloadResult.images}. */
export interface AnonymizeImageEntry {
    /** First 22 base64url chars of the sha256 of the bytes (the consumer's `hashImageBytes`). */
    hash: string
    offset: number
    len: number
}

/** Envelope + per-event metadata parsed from {@link AnonymizeKafkaPayloadResult.meta}. */
export interface AnonymizeMeta {
    distinctId: string
    /** Raw `$session_id` — normalization stays in TS. */
    sessionId: string
    /** `$window_id ?? ''`. */
    windowId: string
    snapshotSource: string | null
    snapshotLibrary: string | null
    /** Min/max valid-event timestamps (epoch ms). */
    startTs: number
    endTs: number
    /** rrweb/console@1 plugin events by level. */
    consoleLogCount: number
    consoleWarnCount: number
    consoleErrorCount: number
    events: AnonymizeEventMeta[]
    /** Collected original images (hash-sorted); present only when a `pseudoTeam` was passed and images were collected. */
    images?: AnonymizeImageEntry[]
}

export interface AnonymizeKafkaPayloadResult {
    /** True if the message could not be anonymized — the caller must drop or DLQ it (fail-closed). */
    failed: boolean
    /**
     * Failure classification when `failed`, matching the TS parse step's dlq/drop reasons:
     * `invalid_json` | `invalid_message_payload` | `received_non_snapshot_message` |
     * `message_contained_no_valid_rrweb_events` | `anonymize_failed`.
     */
    reason: string | null
    /** Failure detail when `failed`, else `null`. */
    error: string | null
    /** Scrubbed JSONL block lines (`["<windowId>",<event>]\n` per valid event), ready to write. */
    lines: Buffer | null
    /** JSON-serialized {@link AnonymizeMeta}. */
    meta: string | null
    /**
     * Which implementation produced the output (differential-tested identical). `tree` means the
     * whole-message parse fallback fired; the label is an A/B / fallback-rate signal.
     */
    route: 'stream' | 'tree' | null
    /** Original bytes of the collected images, concatenated in `meta.images` order; null when none. */
    images: Buffer | null
}

/** Initialize the process-wide allow lists. Call once at startup before {@link anonymizeKafkaPayload}. */
export function initAnonymizer(allow: AllowListsInput): void {
    native.initAnonymizer(JSON.stringify(allow))
}

/**
 * Anonymize a replay Kafka payload (`{"distinct_id": ..., "data": "<event json>"}`). Rust owns the
 * decompression (lz4 via the `content-encoding` header, gzip via magic bytes), the parse, the
 * scrub, and the serialize; only the raw bytes cross the FFI boundary. CPU work — including the
 * decompression — runs off the Node event loop.
 *
 * `cv` payloads re-emit as zstd; the reader dispatches on magic bytes.
 *
 * A non-empty `pseudoTeam` (the HMAC team pseudonym — never the raw team id) enables the
 * image-collection lane: inlined images are replaced with `image:<pseudoTeam>:<hash>` refs instead
 * of the inline blur, and the original bytes come back in `images`/`meta.images` for the caller to
 * produce to the scrub topic.
 */
export function anonymizeKafkaPayload(
    payload: Buffer,
    contentEncoding?: string | null,
    firstPartyHosts?: string[] | null,
    pseudoTeam?: string | null
): Promise<AnonymizeKafkaPayloadResult> {
    return native.anonymizeKafkaPayload(
        payload,
        contentEncoding ?? undefined,
        firstPartyHosts && firstPartyHosts.length > 0 ? JSON.stringify(firstPartyHosts) : undefined,
        pseudoTeam ?? undefined
    )
}
