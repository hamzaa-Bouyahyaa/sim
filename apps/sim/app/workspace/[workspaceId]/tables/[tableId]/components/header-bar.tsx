'use client'

import { Info, RefreshCw } from 'lucide-react'
import { Badge, Button, Tooltip } from '@/components/emcn'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from '@/hooks/use-translation'

interface HeaderBarProps {
  tableName: string
  totalCount: number
  isLoading: boolean
  onNavigateBack: () => void
  onShowSchema: () => void
  onRefresh: () => void
}

export function HeaderBar({
  tableName,
  totalCount,
  isLoading,
  onNavigateBack,
  onShowSchema,
  onRefresh,
}: HeaderBarProps) {
  const { t } = useTranslation()

  return (
    <div className='flex h-[48px] shrink-0 items-center justify-between border-[var(--border)] border-b px-[16px]'>
      <div className='flex items-center gap-[8px]'>
        <button
          onClick={onNavigateBack}
          className='text-[13px] text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]'
        >
          {t('tables.title')}
        </button>
        <span className='text-[var(--text-muted)]'>/</span>
        <span className='font-medium text-[13px] text-[var(--text-primary)]'>{tableName}</span>
        {isLoading ? (
          <Skeleton className='h-[18px] w-[60px] rounded-full' />
        ) : (
          <Badge variant='gray-secondary' size='sm'>
            {totalCount} {t('tables.deleteModal.rows')}
          </Badge>
        )}
      </div>

      <div className='flex items-center gap-[8px]'>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Button variant='ghost' size='sm' onClick={onShowSchema}>
              <Info className='h-[14px] w-[14px]' />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>{t('tables.headerBar.viewSchema')}</Tooltip.Content>
        </Tooltip.Root>

        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Button variant='ghost' size='sm' onClick={onRefresh}>
              <RefreshCw className='h-[14px] w-[14px]' />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>{t('tables.headerBar.refresh')}</Tooltip.Content>
        </Tooltip.Root>
      </div>
    </div>
  )
}
