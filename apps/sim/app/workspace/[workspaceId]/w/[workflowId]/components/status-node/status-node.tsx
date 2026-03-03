'use client'

import { memo } from 'react'
import { Handle, type NodeProps, Position } from 'reactflow'
import { cn } from '@/lib/core/utils/cn'
import { STATUS_NODE_DIMENSIONS } from '@/lib/workflows/blocks/block-dimensions'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import { ActionBar } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/action-bar/action-bar'
import type { WorkflowBlockProps } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/workflow-block/types'
import { useBlockVisual } from '@/app/workspace/[workspaceId]/w/[workflowId]/hooks'

export const StatusNode = memo(function StatusNode({
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

  const statusColor = isEnabled ? (config?.bgColor ?? '#22c55e') : 'gray'
  const progress = 0

  return (
    <div className="group relative">
      <div
        className={cn(
          'workflow-drag-handle relative z-[20] cursor-grab select-none [&:active]:cursor-grabbing',
          'rounded-[6px] border-2',
        )}
        style={{
          width: STATUS_NODE_DIMENSIONS.WIDTH,
          minHeight: STATUS_NODE_DIMENSIONS.MIN_HEIGHT,
          borderColor: statusColor,
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

        <div className="p-[12px]">
          {/* Header with icon */}
          <div className="flex items-center gap-[8px]">
            {config?.icon && (
              <div
                className="flex h-[28px] w-[28px] flex-shrink-0 items-center justify-center rounded-full"
                style={{ background: `${statusColor}20` }}
              >
                <config.icon className="h-[16px] w-[16px]" style={{ color: statusColor }} />
              </div>
            )}
            <h3
              className={cn(
                'text-[15px] font-bold',
                !isEnabled && 'text-[var(--text-muted)]',
              )}
              title={name}
            >
              {name}
            </h3>
          </div>

          {/* Description */}
          <p className="mt-[6px] text-[12px] text-[var(--text-tertiary)]">
            {config?.description ?? ''}
          </p>

          {/* Progress bar */}
          <div className="mt-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium" style={{ color: statusColor }}>
                Progress
              </span>
              <span className="text-[11px] font-bold" style={{ color: statusColor }}>
                {progress}%
              </span>
            </div>
            <div className="mt-[4px] h-[6px] w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(0, progress))}%`,
                  background: statusColor,
                }}
              />
            </div>
          </div>
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
              'pointer-events-none absolute inset-0 z-40 rounded-[6px]',
              ringStyles,
            )}
          />
        )}
      </div>
    </div>
  )
})
