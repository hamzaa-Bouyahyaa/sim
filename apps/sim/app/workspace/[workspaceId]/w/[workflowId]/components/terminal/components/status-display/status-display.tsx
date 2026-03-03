'use client'

import { memo } from 'react'
import { Badge } from '@/components/emcn'
import { BADGE_STYLE } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/terminal/types'
import { useTranslation } from '@/hooks/use-translation'

/**
 * Running badge component - displays a consistent "Running" indicator
 */
export const RunningBadge = memo(function RunningBadge() {
  const { t } = useTranslation()

  return (
    <Badge variant='green' className={BADGE_STYLE}>
      {t('terminal.statusDisplay.running')}
    </Badge>
  )
})

/**
 * Props for StatusDisplay component
 */
export interface StatusDisplayProps {
  isRunning: boolean
  isCanceled: boolean
  formattedDuration: string
}

/**
 * Reusable status display for terminal rows.
 * Shows Running badge, 'canceled' text, or formatted duration.
 */
export const StatusDisplay = memo(function StatusDisplay({
  isRunning,
  isCanceled,
  formattedDuration,
}: StatusDisplayProps) {
  const { t } = useTranslation()

  if (isRunning) {
    return <RunningBadge />
  }
  if (isCanceled) {
    return <>{t('terminal.statusDisplay.canceled')}</>
  }
  return <>{formattedDuration}</>
})
