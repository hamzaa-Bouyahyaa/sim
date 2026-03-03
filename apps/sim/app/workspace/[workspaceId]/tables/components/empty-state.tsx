'use client'

import { useTranslation } from '@/hooks/use-translation'

interface EmptyStateProps {
  hasSearchQuery: boolean
}

export function EmptyState({ hasSearchQuery }: EmptyStateProps) {
  const { t } = useTranslation()

  return (
    <div className='col-span-full flex h-64 items-center justify-center rounded-lg border border-muted-foreground/25 bg-muted/20'>
      <div className='text-center'>
        <p className='font-medium text-[var(--text-secondary)] text-sm'>
          {hasSearchQuery ? t('tables.noTablesFound') : t('tables.noTablesYet')}
        </p>
        <p className='mt-1 text-[var(--text-muted)] text-xs'>
          {hasSearchQuery
            ? t('tables.tryDifferentSearch')
            : t('tables.createFirst')}
        </p>
      </div>
    </div>
  )
}
