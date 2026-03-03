'use client'

import { memo } from 'react'
import { Handle, type NodeProps, Position } from 'reactflow'
import { cn } from '@/lib/core/utils/cn'
import { CONDITIONAL_NODE_DIMENSIONS } from '@/lib/workflows/blocks/block-dimensions'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import { ActionBar } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/action-bar/action-bar'
import type { WorkflowBlockProps } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/workflow-block/types'
import { useBlockVisual } from '@/app/workspace/[workspaceId]/w/[workflowId]/hooks'

export const ConditionalNode = memo(function ConditionalNode({
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

  return (
    <div className="group relative">
      <div
        className={cn(
          'workflow-drag-handle relative z-[20] cursor-grab select-none [&:active]:cursor-grabbing',
          'rounded-[4px] border-2 border-[var(--border-1)]',
        )}
        style={{
          width: CONDITIONAL_NODE_DIMENSIONS.WIDTH,
          minHeight: CONDITIONAL_NODE_DIMENSIONS.MIN_HEIGHT,
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

        {/* Color accent bar on left */}
        <div
          className="absolute left-0 top-0 h-full w-[4px] rounded-l-[2px]"
          style={{ background: isEnabled ? (config?.bgColor ?? '#f97316') : 'gray' }}
        />

        {/* Header */}
        <div className="p-[10px] pb-[6px]">
          <span
            className="text-[12px] font-bold uppercase tracking-wider"
            style={{ color: isEnabled ? (config?.bgColor ?? '#f97316') : 'gray' }}
          >
            IF / ELSE
          </span>
          <h3
            className={cn(
              'mt-[2px] text-[16px] font-semibold',
              !isEnabled && 'text-[var(--text-muted)]',
            )}
            title={name}
          >
            {name}
          </h3>
          <p className="mt-[4px] text-[13px] text-[var(--text-tertiary)]">
            {config?.description ?? ''}
          </p>
        </div>

        {/* Divider */}
        <div className="mx-[10px] border-t border-[var(--border-1)]" />

        {/* YES / NO labels with handles */}
        <div className="relative flex flex-col gap-[8px] p-[10px]">
          <div className="flex items-center justify-end gap-[6px]">
            <span className="text-[12px] font-bold uppercase text-green-500">YES</span>
          </div>
          <div className="flex items-center justify-end gap-[6px]">
            <span className="text-[12px] font-bold uppercase text-red-500">NO</span>
          </div>
        </div>

        {/* YES handle */}
        <Handle
          type="source"
          position={Position.Right}
          id="condition-yes"
          className="!z-[10] !cursor-crosshair !border-none !bg-green-500 !right-[-6px] !h-[12px] !w-[12px] !rounded-full"
          style={{ top: '65%', transform: 'translateY(-50%)' }}
          isConnectableStart={true}
          isConnectableEnd={false}
        />

        {/* NO handle */}
        <Handle
          type="source"
          position={Position.Right}
          id="condition-no"
          className="!z-[10] !cursor-crosshair !border-none !bg-red-500 !right-[-6px] !h-[12px] !w-[12px] !rounded-full"
          style={{ top: '85%', transform: 'translateY(-50%)' }}
          isConnectableStart={true}
          isConnectableEnd={false}
        />

        {hasRing && (
          <div
            className={cn(
              'pointer-events-none absolute inset-0 z-40 rounded-[4px]',
              ringStyles,
            )}
          />
        )}
      </div>
    </div>
  )
})
