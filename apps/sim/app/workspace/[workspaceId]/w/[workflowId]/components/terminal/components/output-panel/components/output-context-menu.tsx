'use client'

import { memo, type RefObject } from 'react'
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDivider,
  PopoverItem,
} from '@/components/emcn'
import type { ContextMenuPosition } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/terminal/types'
import { useTranslation } from '@/hooks/use-translation'

export interface OutputContextMenuProps {
  isOpen: boolean
  position: ContextMenuPosition
  menuRef: RefObject<HTMLDivElement | null>
  onClose: () => void
  onCopySelection: () => void
  onCopyAll: () => void
  onSearch: () => void
  structuredView: boolean
  onToggleStructuredView: () => void
  wrapText: boolean
  onToggleWrap: () => void
  openOnRun: boolean
  onToggleOpenOnRun: () => void
  onClearConsole: () => void
  hasSelection: boolean
}

/**
 * Context menu for terminal output panel (right side).
 * Displays copy, search, and display options for the code viewer.
 */
export const OutputContextMenu = memo(function OutputContextMenu({
  isOpen,
  position,
  menuRef,
  onClose,
  onCopySelection,
  onCopyAll,
  onSearch,
  structuredView,
  onToggleStructuredView,
  wrapText,
  onToggleWrap,
  openOnRun,
  onToggleOpenOnRun,
  onClearConsole,
  hasSelection,
}: OutputContextMenuProps) {
  const { t } = useTranslation()

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      variant='secondary'
      size='sm'
      colorScheme='inverted'
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
        {/* Copy and search actions */}
        <PopoverItem
          disabled={!hasSelection}
          onClick={() => {
            onCopySelection()
            onClose()
          }}
        >
          {t('terminal.outputContextMenu.copySelection')}
        </PopoverItem>
        <PopoverItem
          onClick={() => {
            onCopyAll()
            onClose()
          }}
        >
          {t('terminal.outputContextMenu.copyAll')}
        </PopoverItem>
        <PopoverItem
          onClick={() => {
            onSearch()
            onClose()
          }}
        >
          {t('terminal.outputContextMenu.search')}
        </PopoverItem>

        {/* Display settings - toggles don't close menu */}
        <PopoverDivider />
        <PopoverItem showCheck={structuredView} onClick={onToggleStructuredView}>
          {t('terminal.outputContextMenu.structuredView')}
        </PopoverItem>
        <PopoverItem showCheck={wrapText} onClick={onToggleWrap}>
          {t('terminal.outputContextMenu.wrapText')}
        </PopoverItem>
        <PopoverItem showCheck={openOnRun} onClick={onToggleOpenOnRun}>
          {t('terminal.outputContextMenu.openOnRun')}
        </PopoverItem>

        {/* Destructive action */}
        <PopoverDivider />
        <PopoverItem
          onClick={() => {
            onClearConsole()
            onClose()
          }}
        >
          {t('terminal.outputContextMenu.clearConsole')}
        </PopoverItem>
      </PopoverContent>
    </Popover>
  )
})
