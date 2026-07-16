import { useActions, useValues } from 'kea'

import * as magnifyingGlassPng from '@posthog/brand/hoggies/png/magnifying-glass'
import { LemonSkeleton } from '@posthog/lemon-ui'

import { pngHoggie } from 'lib/brand/hoggies'
import { DateFilter } from 'lib/components/DateFilter/DateFilter'
import { BurningMoneyHog } from 'lib/components/hedgehogs'

import { DataVisualizationLogicProps } from '~/queries/nodes/DataVisualization/dataVisualizationLogic'
import { insightVizDataNodeKey } from '~/queries/nodes/InsightViz/insightVizKeys'
import { Query } from '~/queries/Query/Query'
import { DataVisualizationNode, NodeKind } from '~/queries/schema/schema-general'
import { InsightLogicProps } from '~/types'

import { AccountBillingKind, accountBillingLogic } from './accountBillingLogic'
import { AccountBillingSeriesToggle } from './AccountBillingSeriesToggle'

const HedgehogMagnifyingGlass = pngHoggie(magnifyingGlassPng)

function BillingInsightNotFound({ kind }: { kind: AccountBillingKind }): JSX.Element {
    const Hog = kind === 'spend' ? BurningMoneyHog : HedgehogMagnifyingGlass
    return (
        <div
            className="flex flex-col items-center justify-center gap-2 p-8 text-center"
            data-attr="account-billing-insight-not-found"
        >
            <Hog className="w-24 h-24" />
            <h4 className="mb-0">No billing {kind} insight here</h4>
            <p className="text-secondary max-w-sm mb-0">
                We couldn't find the saved billing {kind} insight in this environment.
            </p>
        </div>
    )
}

export function AccountBillingExpansion({
    accountId,
    externalId,
    kind,
}: {
    accountId: string
    externalId: string
    kind: AccountBillingKind
}): JSX.Element {
    const logic = accountBillingLogic({ accountId, externalId, kind })
    const { savedInsights, savedInsightsLoading, dateRange, variableOverridesByShortId, queryKeyFor } = useValues(logic)
    const { setDateRange } = useActions(logic)

    if (!externalId) {
        return <div className="p-4 text-secondary">This account has no linked organization.</div>
    }

    if (savedInsightsLoading) {
        return <LemonSkeleton className="h-64 w-full" />
    }

    if (!savedInsights || savedInsights.length === 0) {
        return <BillingInsightNotFound kind={kind} />
    }

    const showTitles = savedInsights.length > 1

    return (
        <div className="flex flex-col gap-3">
            <DateFilter
                dateFrom={dateRange.date_from}
                dateTo={dateRange.date_to}
                onChange={(from, to) => setDateRange(from, to)}
            />
            {savedInsights.map((insight) => {
                const queryKey = queryKeyFor(insight.short_id)
                const variablesOverride = variableOverridesByShortId[insight.short_id] ?? null
                const isDataViz = insight.query?.kind === NodeKind.DataVisualizationNode
                // Own the insightProps so both the <Query> and the series-toggle chips resolve to the
                // same dataVisualizationLogic key — no need to reconstruct the internal key string.
                // `dashboardItemId` must be an ad-hoc `new-*` id (not a saved-insight short id).
                const insightProps: InsightLogicProps<DataVisualizationNode> = {
                    dashboardItemId: `new-${queryKey}`,
                    dataNodeCollectionId: queryKey,
                    query: insight.query as DataVisualizationNode,
                }
                const vizLogicProps: DataVisualizationLogicProps = {
                    key: insightVizDataNodeKey(insightProps),
                    query: insight.query as DataVisualizationNode,
                    dataNodeCollectionId: queryKey,
                    variablesOverride,
                }
                return (
                    <div key={insight.short_id} className="flex flex-col gap-1">
                        {showTitles && insight.name ? <h4 className="mb-0 text-sm">{insight.name}</h4> : null}
                        {/* Embedded DataVisualization collapses to a sliver without a fixed-height parent (InsightCard__viz is flex:1, min-height:0). */}
                        <div className="h-80 flex flex-col overflow-hidden">
                            <Query
                                key={queryKey}
                                uniqueKey={queryKey}
                                query={insight.query}
                                variablesOverride={variablesOverride}
                                readOnly
                                embedded
                                // Attach the insight's data logic to accountBillingLogic (mounted at the expanded-row
                                // root) so the loaded results survive tab switches instead of refetching on return.
                                attachTo={logic}
                                context={{ insightProps }}
                            />
                        </div>
                        {isDataViz ? <AccountBillingSeriesToggle vizLogicProps={vizLogicProps} kind={kind} /> : null}
                    </div>
                )
            })}
        </div>
    )
}
