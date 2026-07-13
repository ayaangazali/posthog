import { actions, connect, kea, listeners, path, props, reducers } from 'kea'
import { forms } from 'kea-forms'

import api from 'lib/api'
import { integrationsLogic } from 'lib/integrations/integrationsLogic'
import { lemonToast } from 'lib/lemon-ui/LemonToast'

import { IntegrationType } from '~/types'

import type { awsS3SetupModalLogicType } from './awsS3SetupModalLogicType'

export type S3AuthMode = 'role' | 'access_key'

const IAM_ROLE_ARN_REGEX = /^arn:aws:iam::\d{12}:role\/.+$/

export interface AwsS3SetupModalLogicProps {
    isOpen: boolean
    integration?: IntegrationType | null
    onComplete: (integrationId?: number) => void
}

export const awsS3SetupModalLogic = kea<awsS3SetupModalLogicType>([
    path(['integrations', 'aws-s3', 'awsS3SetupModalLogic']),
    props({} as AwsS3SetupModalLogicProps),
    connect(() => ({
        actions: [integrationsLogic, ['loadIntegrations']],
    })),
    actions({
        setAuthMode: (mode: S3AuthMode) => ({ mode }),
    }),
    reducers({
        authMode: [
            'role' as S3AuthMode,
            {
                setAuthMode: (_, { mode }) => mode,
            },
        ],
    }),
    forms(({ props, actions, values }) => ({
        awsS3Integration: {
            defaults: {
                name: '',
                awsAccessKeyId: '',
                awsSecretAccessKey: '',
                awsRoleArn: '',
            },
            errors: ({ name, awsAccessKeyId, awsSecretAccessKey, awsRoleArn }) => ({
                name: name.trim() ? undefined : 'Name is required',
                awsAccessKeyId:
                    values.authMode === 'role' || awsAccessKeyId.trim() ? undefined : 'Access Key ID is required',
                awsSecretAccessKey:
                    values.authMode === 'role' || awsSecretAccessKey.trim()
                        ? undefined
                        : 'Secret Access Key is required',
                awsRoleArn:
                    values.authMode !== 'role'
                        ? undefined
                        : !awsRoleArn.trim()
                          ? 'IAM role ARN is required'
                          : !IAM_ROLE_ARN_REGEX.test(awsRoleArn.trim())
                            ? 'Enter a valid IAM role ARN, e.g. arn:aws:iam::123456789012:role/my-role'
                            : undefined,
            }),
            submit: async () => {
                try {
                    const { name, awsAccessKeyId, awsSecretAccessKey, awsRoleArn } = values.awsS3Integration
                    const integration = await api.integrations.create({
                        kind: 'aws-s3',
                        config:
                            values.authMode === 'role'
                                ? {
                                      name,
                                      aws_role_arn: awsRoleArn.trim(),
                                  }
                                : {
                                      name,
                                      aws_access_key_id: awsAccessKeyId,
                                      aws_secret_access_key: awsSecretAccessKey,
                                  },
                    })
                    actions.loadIntegrations()
                    lemonToast.success('AWS S3 connection created successfully!')
                    props.onComplete(integration.id)
                } catch (error: any) {
                    lemonToast.error(error.detail || 'Failed to create AWS S3 connection')
                    throw error
                }
            },
        },
    })),
    listeners(({ actions }) => ({
        setAuthMode: () => {
            actions.setAwsS3IntegrationValues({
                awsAccessKeyId: '',
                awsSecretAccessKey: '',
                awsRoleArn: '',
            })
        },
    })),
])
