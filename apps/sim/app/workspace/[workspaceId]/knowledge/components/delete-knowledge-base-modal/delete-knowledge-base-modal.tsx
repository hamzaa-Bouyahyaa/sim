'use client'

import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/emcn'
import { useTranslation } from '@/hooks/use-translation'

interface DeleteKnowledgeBaseModalProps {
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
   * Name of the knowledge base being deleted
   */
  knowledgeBaseName?: string
}

/**
 * Delete confirmation modal for knowledge base items.
 * Displays a warning message and confirmation buttons.
 */
export function DeleteKnowledgeBaseModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  knowledgeBaseName,
}: DeleteKnowledgeBaseModalProps) {
  const { t } = useTranslation()

  return (
    <Modal open={isOpen} onOpenChange={onClose}>
      <ModalContent size='sm'>
        <ModalHeader>{t('knowledge.deleteModal.title')}</ModalHeader>
        <ModalBody>
          <p className='text-[12px] text-[var(--text-secondary)]'>
            {knowledgeBaseName ? (
              <>
                {t('knowledge.deleteModal.confirmText')}{' '}
                <span className='font-medium text-[var(--text-primary)]'>{knowledgeBaseName}</span>?
                {' '}{t('knowledge.deleteModal.description')}
              </>
            ) : (
              `${t('knowledge.deleteModal.confirmText')} ${t('knowledge.deleteModal.description')}`
            )}{' '}
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
