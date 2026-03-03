'use client'

import {
  Badge,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/emcn'
import type { ColumnDefinition } from '@/lib/table'
import { useTranslation } from '@/hooks/use-translation'
import { getTypeBadgeVariant } from '../lib/utils'

interface SchemaModalProps {
  isOpen: boolean
  onClose: () => void
  columns: ColumnDefinition[]
  tableName?: string
}

export function SchemaModal({ isOpen, onClose, columns, tableName }: SchemaModalProps) {
  const { t } = useTranslation()
  const columnCount = columns.length

  return (
    <Modal open={isOpen} onOpenChange={onClose}>
      <ModalContent size='md'>
        <ModalHeader>{t('tables.schema.title')}</ModalHeader>
        <ModalBody className='max-h-[60vh] overflow-y-auto'>
          <div className='mb-[10px] flex items-center justify-between gap-[8px]'>
            {tableName ? (
              <span className='truncate font-medium text-[13px] text-[var(--text-primary)]'>
                {tableName}
              </span>
            ) : (
              <div />
            )}
            <Badge variant='gray' size='sm'>
              {columnCount} {columnCount === 1 ? t('tables.schema.columnSingular') : t('tables.schema.columnPlural')}
            </Badge>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('tables.schema.column')}</TableHead>
                <TableHead>{t('tables.schema.type')}</TableHead>
                <TableHead>{t('tables.schema.constraints')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {columns.map((column) => (
                <TableRow key={column.name}>
                  <TableCell className='font-mono'>{column.name}</TableCell>
                  <TableCell>
                    <Badge variant={getTypeBadgeVariant(column.type)} size='sm'>
                      {column.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className='flex items-center gap-[6px]'>
                      {column.required && (
                        <Badge variant='red' size='sm'>
                          {t('common.required').toLowerCase()}
                        </Badge>
                      )}
                      {column.unique && (
                        <Badge variant='purple' size='sm'>
                          {t('tables.create.columnUnique').toLowerCase()}
                        </Badge>
                      )}
                      {!column.required && !column.unique && (
                        <span className='text-[var(--text-muted)]'>{t('common.none')}</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ModalBody>
        <ModalFooter>
          <Button variant='default' onClick={onClose}>
            {t('common.close')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
