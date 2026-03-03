'use client'

import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/emcn'
import type { ChunkData } from '@/lib/knowledge/types'
import { useDeleteChunk } from '@/hooks/queries/knowledge'
import { useTranslation } from '@/hooks/use-translation'

interface DeleteChunkModalProps {
  chunk: ChunkData | null
  knowledgeBaseId: string
  documentId: string
  isOpen: boolean
  onClose: () => void
}

export function DeleteChunkModal({
  chunk,
  knowledgeBaseId,
  documentId,
  isOpen,
  onClose,
}: DeleteChunkModalProps) {
  const { t } = useTranslation()
  const { mutate: deleteChunk, isPending: isDeleting } = useDeleteChunk()

  const handleDeleteChunk = () => {
    if (!chunk || isDeleting) return

    deleteChunk({ knowledgeBaseId, documentId, chunkId: chunk.id }, { onSuccess: onClose })
  }

  if (!chunk) return null

  return (
    <Modal open={isOpen} onOpenChange={onClose}>
      <ModalContent size='sm'>
        <ModalHeader>{t('knowledge.chunks.deleteChunk')}</ModalHeader>
        <ModalBody>
          <p className='text-[12px] text-[var(--text-secondary)]'>
            {t('knowledge.chunks.deleteConfirm')}{' '}
            <span className='text-[var(--text-error)]'>{t('common.cannotBeUndone')}</span>
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant='default' disabled={isDeleting} onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant='destructive' onClick={handleDeleteChunk} disabled={isDeleting}>
            {isDeleting ? t('common.deleting') : t('common.delete')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
