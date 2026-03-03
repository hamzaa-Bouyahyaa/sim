'use client'

import { memo } from 'react'
import { Handle, type NodeProps, Position } from 'reactflow'
import { cn } from '@/lib/core/utils/cn'
import { RICH_CARD_DIMENSIONS } from '@/lib/workflows/blocks/block-dimensions'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import { ActionBar } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/action-bar/action-bar'
import type { WorkflowBlockProps } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/workflow-block/types'
import { useBlockVisual } from '@/app/workspace/[workspaceId]/w/[workflowId]/hooks'

export const RichCard = memo(function RichCard({
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

  const tags: string[] = []

  return (
    <div className="group relative">
      
      <div
        className={cn(
          'workflow-drag-handle relative z-[20] cursor-grab select-none overflow-hidden [&:active]:cursor-grabbing',
          'rounded-[8px] border-2 border-[var(--border-1)]',
        )}
        style={{
          width: RICH_CARD_DIMENSIONS.WIDTH,
          minHeight: RICH_CARD_DIMENSIONS.MIN_HEIGHT,
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
          style={{ top: '50%', transform: 'translateY(-50%)' }}
          isConnectableStart={false}
          isConnectableEnd={true}
        />

        {/* Image preview area */}
        <div
          className="flex items-center justify-center"
          style={{
            height: RICH_CARD_DIMENSIONS.IMAGE_HEIGHT,
            background: isEnabled
              ? `linear-gradient(135deg, ${config?.bgColor ?? '#8b5cf6'}22, ${config?.bgColor ?? '#8b5cf6'}44)`
              : 'var(--surface-2)',
          }}
        >
          {config?.icon ? (
            <config.icon
              className="h-[48px] w-[48px]"
              style={{ color: isEnabled ? (config?.bgColor ?? '#8b5cf6') : 'gray' }}
            />
          ) : (
            <div
              className="h-[48px] w-[48px] rounded-[8px]"
              style={{
                background: isEnabled ? (config?.bgColor ?? '#8b5cf6') : 'gray',
                opacity: 0.3,
              }}
            />
          )}
        </div>

        {/* Content */}
        <div className="p-[12px]">
          <h3
            className={cn(
              'text-[15px] font-bold',
              !isEnabled && 'text-[var(--text-muted)]',
            )}
            title={name}
          >
            {name}
          </h3>
          <p className="mt-[4px] text-[12px] text-[var(--text-tertiary)] line-clamp-2">
            {config?.description ?? ''}
          </p>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="mt-[8px] flex flex-wrap gap-[4px]">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-[8px] py-[2px] text-[10px] font-medium"
                  style={{
                    background: isEnabled ? `${config?.bgColor ?? '#8b5cf6'}20` : 'var(--surface-2)',
                    color: isEnabled ? (config?.bgColor ?? '#8b5cf6') : 'var(--text-muted)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <Handle
          type="source"
          position={Position.Right}
          id="source"
          className="!z-[10] !cursor-crosshair !border-none !bg-[var(--workflow-edge)] !right-[-6px] !h-[12px] !w-[12px] !rounded-full"
          style={{ top: '50%', transform: 'translateY(-50%)' }}
          isConnectableStart={true}
          isConnectableEnd={false}
        />

        {hasRing && (
          <div
            className={cn(
              'pointer-events-none absolute inset-0 z-40 rounded-[8px]',
              ringStyles,
            )}
          />
        )}
      </div>
    </div>
  )
})
