import { useActions, useValues } from 'kea'
import posthog from 'posthog-js'

import { LemonSnack } from '@posthog/lemon-ui'

import { useChartTheme } from 'lib/charts/hooks'
import { LemonColorGlyph } from 'lib/lemon-ui/LemonColor/LemonColorGlyph'
import { cn } from 'lib/utils/css-classes'

import { getSeriesKey } from '~/queries/nodes/DataVisualization/Components/Charts/sqlLineGraphAdapter'
import {
    DataVisualizationLogicProps,
    dataVisualizationLogic,
} from '~/queries/nodes/DataVisualization/dataVisualizationLogic'
import { ChartDisplayType } from '~/types'

import { AccountBillingKind } from './accountBillingLogic'
import { AccountsEvents } from './constants'

// Chart types whose series map 1:1 to the yData columns the chips toggle (billing charts never use a
// breakdown, so getSeriesKey here matches the keys the chart consumes). Pie/table/number are excluded.
const TOGGLEABLE_DISPLAY_TYPES = new Set<ChartDisplayType>([
    ChartDisplayType.ActionsLineGraph,
    ChartDisplayType.ActionsAreaGraph,
    ChartDisplayType.ActionsBar,
    ChartDisplayType.ActionsStackedBar,
])

/**
 * Compact per-series show/hide chips for a billing chart. Binds the SAME (already-mounted, kept
 * alive by the Query's `attachTo`) `dataVisualizationLogic` instance by key, so toggling a chip
 * flips that chart's ephemeral `hiddenSeriesKeys` — the chart then excludes the series and rescales
 * the rest, letting a small-magnitude line/bar be read against large ones. Renders nothing until
 * there are ≥2 series on a line/area/bar chart.
 */
export function AccountBillingSeriesToggle({
    vizLogicProps,
    kind,
}: {
    vizLogicProps: DataVisualizationLogicProps
    kind: AccountBillingKind
}): JSX.Element | null {
    const { yData, effectiveVisualizationType, hiddenSeriesKeys, responseLoading } = useValues(
        dataVisualizationLogic(vizLogicProps)
    )
    const { toggleHiddenSeriesKey } = useActions(dataVisualizationLogic(vizLogicProps))
    const theme = useChartTheme()

    if (responseLoading || !TOGGLEABLE_DISPLAY_TYPES.has(effectiveVisualizationType) || yData.length < 2) {
        return null
    }

    const hidden = new Set(hiddenSeriesKeys)

    return (
        <div className="flex flex-wrap gap-1" data-attr={`account-billing-series-toggle-${kind}`}>
            {yData.map((series, index) => {
                const seriesKey = getSeriesKey(series, index)
                const isHidden = hidden.has(seriesKey)
                const label = series.settings?.display?.label || series.column.name
                // Mirror the chart's color: an explicit series color, else quill's palette-by-index.
                const color = series.settings?.display?.color ?? theme.colors[index % theme.colors.length]
                return (
                    <LemonSnack
                        key={seriesKey}
                        onClick={() => {
                            toggleHiddenSeriesKey(seriesKey)
                            posthog.capture(AccountsEvents.UsageSeriesToggled, {
                                kind,
                                is_hidden: !isHidden,
                                series_count: yData.length,
                            })
                        }}
                        title={isHidden ? `Show ${label}` : `Hide ${label}`}
                        className={cn('cursor-pointer', isHidden && 'opacity-50')}
                    >
                        <span className="flex items-center gap-1">
                            <LemonColorGlyph color={color} size="small" />
                            <span className={cn(isHidden && 'line-through')}>{label}</span>
                        </span>
                    </LemonSnack>
                )
            })}
        </div>
    )
}
