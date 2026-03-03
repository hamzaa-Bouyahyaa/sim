'use client'

import { memo } from 'react'
import { Handle, type NodeProps, Position } from 'reactflow'
import { cn } from '@/lib/core/utils/cn'
import { DATABASE_SCHEMA_DIMENSIONS } from '@/lib/workflows/blocks/block-dimensions'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import { ActionBar } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/action-bar/action-bar'
import type { WorkflowBlockProps } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/workflow-block/types'
import { useBlockVisual } from '@/app/workspace/[workspaceId]/w/[workflowId]/hooks'

const SCHEMA_FIELDS = [
  { name: 'id', type: 'uuid', isPrimary: true },
  { name: 'name', type: 'varchar(255)' },
  { name: 'email', type: 'varchar(255)' },
  { name: 'created_at', type: 'timestamp' },
]

export const DatabaseSchema = memo(function DatabaseSchema({
  id,
  data,
  selected,
}: NodeProps<WorkflowBlockProps>) {
  const { type, config, name, isPending } = data
  const userPermissions = useUserPermissionsContext()

  const { isEnabled, handleClick, hasRing, ringStyles } = useBlockVisual({
    blockId: id,
    data,
    isPending,
    isSelected: selected,
  })

  const fields = SCHEMA_FIELDS

  return (
    <div className="group relative">
      <div
        className={cn(
          'workflow-drag-handle relative z-[20] cursor-grab select-none overflow-hidden [&:active]:cursor-grabbing',
          'rounded-[6px] border-2 border-[var(--border-1)]',
        )}
        style={{
          width: DATABASE_SCHEMA_DIMENSIONS.WIDTH,
          minHeight: DATABASE_SCHEMA_DIMENSIONS.MIN_HEIGHT,
          background: 'var(--block-glass-bg)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: 'var(--block-shadow)',
        }}
        onClick={handleClick}
      >
        {!data.isPreview && (
          <ActionBar blockId={id} blockType={type} disabled={!userPermissions.canEdit} />
        )}

        <Handle
          type="target"
          position={Position.Left}
          id="target"
          className="!z-[10] !cursor-crosshair !border-none !bg-[var(--workflow-edge)] !left-[-6px] !h-[12px] !w-[12px] !rounded-full"
          style={{ top: '24px' }}
          isConnectableStart={false}
          isConnectableEnd={true}
        />

        {/* Dark header */}
        <div
          className="flex items-center gap-[8px] px-[12px]"
          style={{
            height: DATABASE_SCHEMA_DIMENSIONS.HEADER_HEIGHT,
            background: isEnabled ? (config?.bgColor ?? '#3b82f6') : 'gray',
          }}
        >
          <div className="h-[8px] w-[8px] rounded-full bg-white/60" />
          <span className="text-[13px] font-bold text-white uppercase tracking-wider">
            {name}
          </span>
        </div>

        {/* Field rows */}
        <div className="relative">
          {fields.map((field, index) => (
            <div
              key={field.name}
              className={cn(
                'flex items-center justify-between px-[12px]',
                index < fields.length - 1 && 'border-b border-[var(--border-1)]',
              )}
              style={{ height: DATABASE_SCHEMA_DIMENSIONS.ROW_HEIGHT }}
            >
              <div className="flex items-center gap-[6px]">
                {field.isPrimary && (
                  <span className="text-[10px] text-yellow-500">PK</span>
                )}
                <span
                  className={cn(
                    'text-[12px] font-medium',
                    !isEnabled && 'text-[var(--text-muted)]',
                  )}
                >
                  {field.name}
                </span>
              </div>
              <span className="text-[11px] text-[var(--text-tertiary)]">{field.type}</span>

              {/* Per-row source handle */}
              <Handle
                type="source"
                position={Position.Right}
                id={`field-${field.name}`}
                className="!z-[10] !cursor-crosshair !border-none !bg-blue-500 !right-[-6px] !h-[10px] !w-[10px] !rounded-full"
                style={{
                  top: DATABASE_SCHEMA_DIMENSIONS.HEADER_HEIGHT + index * DATABASE_SCHEMA_DIMENSIONS.ROW_HEIGHT + DATABASE_SCHEMA_DIMENSIONS.ROW_HEIGHT / 2,
                  transform: 'translateY(0)',
                  position: 'absolute',
                }}
                isConnectableStart={true}
                isConnectableEnd={false}
              />
            </div>
          ))}
        </div>

        {hasRing && (
          <div
            className={cn(
              'pointer-events-none absolute inset-0 z-40 rounded-[6px]',
              ringStyles,
            )}
          />
        )}
      </div>
    </div>
  )
})
