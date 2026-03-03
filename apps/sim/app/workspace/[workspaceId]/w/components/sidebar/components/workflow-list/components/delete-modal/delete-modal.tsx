'use client'

import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/emcn'
import { useTranslation } from '@/hooks/use-translation'

interface DeleteModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean
  /**
   * Callback when modal should close
   */
  onClose: () => void
  /**
   * Callback when delete is confirmed
   */
  onConfirm: () => void
  /**
   * Whether the delete operation is in progress
   */
  isDeleting: boolean
  /**
   * Type of item being deleted
   * - 'mixed' is used when both workflows and folders are selected
   */
  itemType: 'workflow' | 'folder' | 'workspace' | 'mixed'
  /**
   * Name(s) of the item(s) being deleted (optional, for display)
   * Can be a single name or an array of names for multiple items
   */
  itemName?: string | string[]
}

/**
 * Reusable delete confirmation modal for workflow, folder, and workspace items.
 * Displays a warning message and confirmation buttons.
 *
 * @param props - Component props
 * @returns Delete confirmation modal
 */
export function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  itemType,
  itemName,
}: DeleteModalProps) {
  const { t } = useTranslation()
  const isMultiple = Array.isArray(itemName) && itemName.length > 1
  const isSingle = !isMultiple

  const displayNames = Array.isArray(itemName) ? itemName : itemName ? [itemName] : []

  let title = ''
  if (itemType === 'workflow') {
    title = isMultiple ? t('deleteModal.deleteWorkflows') : t('deleteModal.deleteWorkflow')
  } else if (itemType === 'folder') {
    title = isMultiple ? t('deleteModal.deleteFolders') : t('deleteModal.deleteFolder')
  } else if (itemType === 'mixed') {
    title = t('deleteModal.deleteItems')
  } else {
    title = t('deleteModal.deleteWorkspace')
  }

  const renderDescription = () => {
    if (itemType === 'workflow') {
      if (isMultiple) {
        return (
          <>
            {t('deleteModal.confirmDelete')}{' '}
            <span className='font-medium text-[var(--text-primary)]'>
              {displayNames.join(', ')}
            </span>
            ? {t('deleteModal.workflowsDescription')}
          </>
        )
      }
      if (isSingle && displayNames.length > 0) {
        return (
          <>
            {t('deleteModal.confirmDelete')}{' '}
            <span className='font-medium text-[var(--text-primary)]'>{displayNames[0]}</span>?{' '}
            {t('deleteModal.workflowDescription')}
          </>
        )
      }
      return `${t('deleteModal.confirmDelete')} ${t('deleteModal.thisWorkflow')}? ${t('deleteModal.workflowDescription')}`
    }

    if (itemType === 'folder') {
      if (isMultiple) {
        return (
          <>
            {t('deleteModal.confirmDelete')}{' '}
            <span className='font-medium text-[var(--text-primary)]'>
              {displayNames.join(', ')}
            </span>
            ? {t('deleteModal.foldersDescription')}
          </>
        )
      }
      if (isSingle && displayNames.length > 0) {
        return (
          <>
            {t('deleteModal.confirmDelete')}{' '}
            <span className='font-medium text-[var(--text-primary)]'>{displayNames[0]}</span>?{' '}
            {t('deleteModal.folderDescription')}
          </>
        )
      }
      return `${t('deleteModal.confirmDelete')} ${t('deleteModal.thisFolder')}? ${t('deleteModal.folderDescription')}`
    }

    if (itemType === 'mixed') {
      if (displayNames.length > 0) {
        return (
          <>
            {t('deleteModal.confirmDelete')}{' '}
            <span className='font-medium text-[var(--text-primary)]'>
              {displayNames.join(', ')}
            </span>
            ? {t('deleteModal.mixedDescription')}
          </>
        )
      }
      return `${t('deleteModal.confirmDelete')} ${t('deleteModal.selectedItems')}? ${t('deleteModal.mixedDescription')}`
    }

    // workspace type
    if (isSingle && displayNames.length > 0) {
      return (
        <>
          {t('deleteModal.confirmDelete')}{' '}
          <span className='font-medium text-[var(--text-primary)]'>{displayNames[0]}</span>?{' '}
          {t('deleteModal.workspaceDescription')}
        </>
      )
    }
    return `${t('deleteModal.confirmDelete')} ${t('deleteModal.thisWorkspace')}? ${t('deleteModal.workspaceDescription')}`
  }

  return (
    <Modal open={isOpen} onOpenChange={onClose}>
      <ModalContent size='sm'>
        <ModalHeader>{title}</ModalHeader>
        <ModalBody>
          <p className='text-[12px] text-[var(--text-secondary)]'>
            {renderDescription()}{' '}
            <span className='text-[var(--text-error)]'>{t('common.cannotBeUndone')}</span>
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant='default' onClick={onClose} disabled={isDeleting}>
            {t('common.cancel')}
          </Button>
          <Button variant='destructive' onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? t('common.deleting') : t('common.delete')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
