'use client'

import type { RefObject } from 'react'
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDivider,
  PopoverItem,
} from '@/components/emcn'
import { useTranslation } from '@/hooks/use-translation'

/**
 * Props for CanvasMenu component
 */
export interface CanvasMenuProps {
  isOpen: boolean
  position: { x: number; y: number }
  menuRef: RefObject<HTMLDivElement | null>
  onClose: () => void
  onUndo: () => void
  onRedo: () => void
  onPaste: () => void
  onAddBlock: () => void
  onAutoLayout: () => void
  onFitToView: () => void
  onOpenLogs: () => void
  onToggleVariables: () => void
  onToggleChat: () => void
  isVariablesOpen?: boolean
  isChatOpen?: boolean
  hasClipboard?: boolean
  disableEdit?: boolean
  disableAdmin?: boolean
  canUndo?: boolean
  canRedo?: boolean
  isInvitationsDisabled?: boolean
  /** Whether the workflow has locked blocks (disables auto-layout) */
  hasLockedBlocks?: boolean
}

/**
 * Context menu for workflow canvas.
 * Displays canvas-level actions when right-clicking empty space.
 */
export function CanvasMenu({
  isOpen,
  position,
  menuRef,
  onClose,
  onUndo,
  onRedo,
  onPaste,
  onAddBlock,
  onAutoLayout,
  onFitToView,
  onOpenLogs,
  onToggleVariables,
  onToggleChat,
  isVariablesOpen = false,
  isChatOpen = false,
  hasClipboard = false,
  disableEdit = false,
  canUndo = false,
  canRedo = false,
  hasLockedBlocks = false,
}: CanvasMenuProps) {
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
        {/* History actions */}
        <PopoverItem
          className='group'
          disabled={disableEdit || !canUndo}
          onClick={() => {
            onUndo()
            onClose()
          }}
        >
          <span>{t('contextMenu.canvas.undo')}</span>
          <span className='ml-auto opacity-70 group-hover:opacity-100'>⌘Z</span>
        </PopoverItem>
        <PopoverItem
          className='group'
          disabled={disableEdit || !canRedo}
          onClick={() => {
            onRedo()
            onClose()
          }}
        >
          <span>{t('contextMenu.canvas.redo')}</span>
          <span className='ml-auto opacity-70 group-hover:opacity-100'>⌘⇧Z</span>
        </PopoverItem>

        {/* Edit and creation actions */}
        <PopoverDivider />
        <PopoverItem
          className='group'
          disabled={disableEdit || !hasClipboard}
          onClick={() => {
            onPaste()
            onClose()
          }}
        >
          <span>{t('contextMenu.canvas.paste')}</span>
          <span className='ml-auto opacity-70 group-hover:opacity-100'>⌘V</span>
        </PopoverItem>
        <PopoverItem
          className='group'
          disabled={disableEdit}
          onClick={() => {
            onAddBlock()
            onClose()
          }}
        >
          <span>{t('contextMenu.canvas.addBlock')}</span>
          <span className='ml-auto opacity-70 group-hover:opacity-100'>⌘K</span>
        </PopoverItem>
        <PopoverItem
          className='group'
          disabled={disableEdit || hasLockedBlocks}
          onClick={() => {
            onAutoLayout()
            onClose()
          }}
          title={hasLockedBlocks ? t('contextMenu.canvas.unlockBlocksForAutoLayout') : undefined}
        >
          <span>{t('contextMenu.canvas.autoLayout')}</span>
          <span className='ml-auto opacity-70 group-hover:opacity-100'>⇧L</span>
        </PopoverItem>
        <PopoverItem
          onClick={() => {
            onFitToView()
            onClose()
          }}
        >
          {t('contextMenu.canvas.fitToView')}
        </PopoverItem>

        {/* Navigation actions */}
        <PopoverDivider />
        <PopoverItem
          className='group'
          onClick={() => {
            onOpenLogs()
            onClose()
          }}
        >
          <span>{t('contextMenu.canvas.openLogs')}</span>
          <span className='ml-auto opacity-70 group-hover:opacity-100'>⌘L</span>
        </PopoverItem>
        <PopoverItem
          onClick={() => {
            onToggleVariables()
            onClose()
          }}
        >
          {isVariablesOpen ? t('contextMenu.canvas.closeVariables') : t('contextMenu.canvas.openVariables')}
        </PopoverItem>
        <PopoverItem
          onClick={() => {
            onToggleChat()
            onClose()
          }}
        >
          {isChatOpen ? t('contextMenu.canvas.closeChat') : t('contextMenu.canvas.openChat')}
        </PopoverItem>
      </PopoverContent>
    </Popover>
  )
}
