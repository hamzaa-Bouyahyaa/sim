import React from 'react'
import { ButtonGroup, ButtonGroupItem } from '@/components/emcn'
import { cn } from '@/lib/core/utils/cn'
import type { PermissionType } from '@/lib/workspaces/permissions/utils'
import { useTranslation } from '@/hooks/use-translation'

export interface PermissionSelectorProps {
  value: PermissionType
  onChange: (value: PermissionType) => void
  disabled?: boolean
  className?: string
}

export const PermissionSelector = React.memo<PermissionSelectorProps>(
  ({ value, onChange, disabled = false, className = '' }) => {
    const { t } = useTranslation()
    return (
      <ButtonGroup
        value={value}
        onValueChange={(val) => onChange(val as PermissionType)}
        disabled={disabled}
        className={cn(className, disabled && 'cursor-not-allowed')}
      >
        <ButtonGroupItem value='read'>{t('workspace.permissions.read')}</ButtonGroupItem>
        <ButtonGroupItem value='write'>{t('workspace.permissions.write')}</ButtonGroupItem>
        <ButtonGroupItem value='admin'>{t('workspace.permissions.admin')}</ButtonGroupItem>
      </ButtonGroup>
    )
  }
)

PermissionSelector.displayName = 'PermissionSelector'
