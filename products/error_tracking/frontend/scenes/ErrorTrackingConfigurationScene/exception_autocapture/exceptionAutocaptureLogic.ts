import { actions, afterMount, connect, kea, listeners, path, reducers, selectors } from 'kea'
import { loaders } from 'kea-loaders'

import { lemonToast } from 'lib/lemon-ui/LemonToast/LemonToast'
import { teamLogic } from 'scenes/teamLogic'

import {
    errorTrackingSettingsRetrieveSettingsRetrieve,
    errorTrackingSettingsUpdateSettingsPartialUpdate,
} from 'products/error_tracking/frontend/generated/api'
import type { ErrorTrackingSettingsApi } from 'products/error_tracking/frontend/generated/api.schemas'

import type { exceptionAutocaptureLogicType } from './exceptionAutocaptureLogicType'

export const exceptionAutocaptureLogic = kea<exceptionAutocaptureLogicType>([
    path([
        'products',
        'error_tracking',
        'scenes',
        'ErrorTrackingConfigurationScene',
        'exception_autocapture',
        'exceptionAutocaptureLogic',
    ]),

    connect(() => ({
        values: [teamLogic, ['currentTeamId']],
    })),

    actions({
        setAutocaptureOptIn: (enabled: boolean) => ({ enabled }),
    }),

    loaders(({ values }) => ({
        settings: [
            null as ErrorTrackingSettingsApi | null,
            {
                loadSettings: async () => {
                    return await errorTrackingSettingsRetrieveSettingsRetrieve(String(values.currentTeamId))
                },
                persistAutocaptureOptIn: async (enabled: boolean) => {
                    return await errorTrackingSettingsUpdateSettingsPartialUpdate(String(values.currentTeamId), {
                        autocapture_exceptions_opt_in: enabled,
                    })
                },
            },
        ],
    })),

    reducers({
        optimisticOptIn: [
            null as boolean | null,
            {
                setAutocaptureOptIn: (_, { enabled }) => enabled,
                loadSettingsSuccess: () => null,
                persistAutocaptureOptInSuccess: () => null,
                persistAutocaptureOptInFailure: () => null,
            },
        ],
    }),

    selectors({
        autocaptureOptIn: [
            (s) => [s.settings, s.optimisticOptIn],
            (settings: ErrorTrackingSettingsApi | null, optimisticOptIn: boolean | null): boolean =>
                optimisticOptIn ?? !!settings?.autocapture_exceptions_opt_in,
        ],
    }),

    listeners(({ actions }) => ({
        setAutocaptureOptIn: ({ enabled }) => {
            actions.persistAutocaptureOptIn(enabled)
        },
        persistAutocaptureOptInFailure: () => {
            lemonToast.error('Failed to update exception autocapture')
        },
    })),

    afterMount(({ actions }) => {
        actions.loadSettings()
    }),
])
