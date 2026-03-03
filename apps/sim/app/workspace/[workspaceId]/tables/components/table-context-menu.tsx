'use client'

import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDivider,
  PopoverItem,
} from '@/components/emcn'
import { useTranslation } from '@/hooks/use-translation'

interface TableContextMenuProps {
  isOpen: boolean
  position: { x: number; y: number }
  menuRef: React.RefObject<HTMLDivElement | null>
  onClose: () => void
  onViewSchema?: () => void
  onCopyId?: () => void
  onDelete?: () => void
  disableDelete?: boolean
}

export function TableContextMenu({
  isOpen,
  position,
  menuRef,
  onClose,
  onViewSchema,
  onCopyId,
  onDelete,
  disableDelete = false,
}: TableContextMenuProps) {
  const { t } = useTranslation()

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      variant='secondary'
      size='sm'
    >
      <PopoverAnchor
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: '1px',
          height: '1px',
        }}
      />
      <PopoverContent ref={menuRef} align='start' side='bottom' sideOffset={4}>
        {onViewSchema && (
          <PopoverItem
            onClick={() => {
              onViewSchema()
              onClose()
            }}
          >
            {t('tables.contextMenu.viewSchema')}
          </PopoverItem>
        )}
        {onViewSchema && (onCopyId || onDelete) && <PopoverDivider />}
        {onCopyId && (
          <PopoverItem
            onClick={() => {
              onCopyId()
              onClose()
            }}
          >
            {t('tables.contextMenu.copyId')}
          </PopoverItem>
        )}
        {onCopyId && onDelete && <PopoverDivider />}
        {onDelete && (
          <PopoverItem
            disabled={disableDelete}
            onClick={() => {
              onDelete()
              onClose()
            }}
          >
            {t('tables.contextMenu.delete')}
          </PopoverItem>
        )}
      </PopoverContent>
    </Popover>
  )
}
