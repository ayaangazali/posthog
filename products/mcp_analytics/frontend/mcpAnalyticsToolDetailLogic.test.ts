import { expectLogic } from 'kea-test-utils'

import api from 'lib/api'

import { initKeaTests } from '~/test/init'

import { type DailyToolStat, buildDailyChartData, mcpAnalyticsToolDetailLogic } from './mcpAnalyticsToolDetailLogic'

jest.mock('lib/api')

const mockApi = api as jest.Mocked<typeof api>

function stat(overrides: Partial<DailyToolStat> & { day: string }): DailyToolStat {
    return {
        calls: 0,
        errors: 0,
        p50: 0,
        p95: 0,
        users: 0,
        sessions: 0,
        ...overrides,
    }
}

describe('mcpAnalyticsToolDetailLogic', () => {
    describe('buildDailyChartData', () => {
        it('returns empty series for no rows', () => {
            expect(buildDailyChartData([])).toEqual({
                labels: [],
                calls: [],
                errors: [],
                p50: [],
                p95: [],
                users: [],
                sessions: [],
            })
        })

        it('passes a single day through unchanged', () => {
            const rows = [stat({ day: '2026-06-01', calls: 10, errors: 2, p50: 100, p95: 300, users: 3, sessions: 4 })]
            expect(buildDailyChartData(rows)).toEqual({
                labels: ['2026-06-01'],
                calls: [10],
                errors: [2],
                p50: [100],
                p95: [300],
                users: [3],
                sessions: [4],
            })
        })

        it('gap-fills interior missing days (counts→0, latency→NaN) with a contiguous day axis', () => {
            const rows = [
                stat({ day: '2026-06-01', calls: 10, errors: 1, p50: 100, p95: 200, users: 2, sessions: 3 }),
                stat({ day: '2026-06-03', calls: 5, errors: 0, p50: 50, p95: 150, users: 1, sessions: 1 }),
            ]
            expect(buildDailyChartData(rows)).toEqual({
                labels: ['2026-06-01', '2026-06-02', '2026-06-03'],
                calls: [10, 0, 5],
                errors: [1, 0, 0],
                p50: [100, NaN, 50],
                p95: [200, NaN, 150],
                users: [2, 0, 1],
                sessions: [3, 0, 1],
            })
        })
    })

    describe('failure drill-down', () => {
        beforeEach(() => {
            jest.clearAllMocks()
            initKeaTests()
            jest.spyOn(mockApi, 'query').mockResolvedValue({ results: [] })
        })

        // The occurrences query must receive the bucket's RAW parts (not the composed display
        // label), and the no-status bucket must omit errorStatus so the backend's
        // "only events without a status" branch applies.
        it.each([
            ['statused bucket', '500', '500'],
            ['no-status bucket', '', undefined],
        ])(
            'selecting a %s queries occurrences with raw bucket params and stores the results',
            async (_label, bucketStatus, expectedStatus) => {
                const logic = mcpAnalyticsToolDetailLogic({ toolName: 'query_run' })
                logic.mount()
                const occurrence = {
                    timestamp: '2026-07-15 00:00:00',
                    distinct_id: 'd1',
                    session_id: 's1',
                    harness: 'Claude Code',
                    intent: '',
                    error_message: 'boom: table not found',
                    error_status: bucketStatus,
                }
                mockApi.query.mockClear()
                jest.spyOn(mockApi, 'query').mockResolvedValue({ results: [occurrence] })

                await expectLogic(logic, () => {
                    logic.actions.selectFailure({
                        message: 'api_5xx (HTTP 500)',
                        error_type: 'api_5xx',
                        error_status: bucketStatus,
                        occurrences: 2,
                        last_seen: '2026-07-15 00:00:00',
                        harnesses: [],
                    })
                }).toDispatchActions(['loadFailureOccurrences', 'loadFailureOccurrencesSuccess'])

                expect(mockApi.query).toHaveBeenCalledWith(
                    expect.objectContaining({
                        kind: 'MCPToolFailureOccurrencesQuery',
                        toolName: 'query_run',
                        errorType: 'api_5xx',
                        errorStatus: expectedStatus,
                    })
                )
                expect(logic.values.failureOccurrences).toEqual([occurrence])
            }
        )

        it('clears the previous bucket occurrences when deselecting', async () => {
            const logic = mcpAnalyticsToolDetailLogic({ toolName: 'query_run' })
            logic.mount()
            jest.spyOn(mockApi, 'query').mockResolvedValue({
                results: [
                    {
                        timestamp: '2026-07-15 00:00:00',
                        distinct_id: 'd1',
                        session_id: 's1',
                        harness: 'Claude Code',
                        intent: '',
                        error_message: 'boom',
                        error_status: '',
                    },
                ],
            })

            await expectLogic(logic, () => {
                logic.actions.selectFailure({
                    message: 'internal',
                    error_type: 'internal',
                    error_status: '',
                    occurrences: 1,
                    last_seen: '2026-07-15 00:00:00',
                    harnesses: [],
                })
            }).toDispatchActions(['loadFailureOccurrencesSuccess'])

            await expectLogic(logic, () => {
                logic.actions.selectFailure(null)
            }).toMatchValues({ selectedFailure: null, failureOccurrences: [] })
        })
    })
})
