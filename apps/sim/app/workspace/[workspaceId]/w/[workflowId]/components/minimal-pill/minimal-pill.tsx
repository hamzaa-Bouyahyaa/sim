'use client'

import { memo } from 'react'
import { Handle, type NodeProps, Position } from 'reactflow'
import { cn } from '@/lib/core/utils/cn'
import { MINIMAL_PILL_DIMENSIONS } from '@/lib/workflows/blocks/block-dimensions'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import { ActionBar } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/action-bar/action-bar'
import type { WorkflowBlockProps } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/workflow-block/types'
import { useBlockVisual } from '@/app/workspace/[workspaceId]/w/[workflowId]/hooks'

export const MinimalPill = memo(function MinimalPill({
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

  const Icon = config?.icon

  return (
    <div className="group relative">
      <div
        className={cn(
          'workflow-drag-handle relative z-[20] flex cursor-grab items-center gap-[8px] select-none [&:active]:cursor-grabbing',
          'rounded-full border-2 border-[var(--border-1)] px-[12px] py-[6px]',
        )}
        style={{
          width: MINIMAL_PILL_DIMENSIONS.WIDTH,
          height: MINIMAL_PILL_DIMENSIONS.HEIGHT,
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

        {Icon && (
          <div
            className="flex h-[24px] w-[24px] flex-shrink-0 items-center justify-center rounded-full"
            style={{ background: isEnabled ? config.bgColor : 'gray' }}
          >
            <Icon className="h-[14px] w-[14px] text-white" />
          </div>
        )}

        <span
          className={cn(
            'truncate text-[14px] font-semibold',
            !isEnabled && 'text-[var(--text-muted)]',
          )}
          title={name}
        >
          {name}
        </span>

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
              'pointer-events-none absolute inset-0 z-40 rounded-full',
              ringStyles,
            )}
          />
        )}
      </div>
    </div>
  )
})
