'use client'

import { Button } from '@/components/emcn'
import { useTranslation } from '@/hooks/use-translation'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalCount: number
  onPreviousPage: () => void
  onNextPage: () => void
}

export function Pagination({
  currentPage,
  totalPages,
  totalCount,
  onPreviousPage,
  onNextPage,
}: PaginationProps) {
  const { t } = useTranslation()

  if (totalPages <= 1) return null

  return (
    <div className='flex h-[40px] shrink-0 items-center justify-between border-[var(--border)] border-t px-[16px]'>
      <span className='text-[11px] text-[var(--text-tertiary)]'>
        {t('tables.pagination.page')} {currentPage + 1} {t('tables.pagination.of')} {totalPages} ({totalCount} {t('tables.pagination.rows')})
      </span>
      <div className='flex items-center gap-[4px]'>
        <Button variant='ghost' size='sm' onClick={onPreviousPage} disabled={currentPage === 0}>
          {t('common.previous')}
        </Button>
        <Button
          variant='ghost'
          size='sm'
          onClick={onNextPage}
          disabled={currentPage === totalPages - 1}
        >
          {t('common.next')}
        </Button>
      </div>
    </div>
  )
}
