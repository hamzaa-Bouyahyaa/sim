'use client'

import { memo } from 'react'
import { Handle, type NodeProps, Position } from 'reactflow'
import { cn } from '@/lib/core/utils/cn'
import { CIRCLE_NODE_DIMENSIONS } from '@/lib/workflows/blocks/block-dimensions'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import { ActionBar } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/action-bar/action-bar'
import type { WorkflowBlockProps } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/workflow-block/types'
import { useBlockVisual } from '@/app/workspace/[workspaceId]/w/[workflowId]/hooks'

export const CircleNode = memo(function CircleNode({
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
  const bgColor = isEnabled ? (config?.bgColor ?? '#6366f1') : 'gray'

  return (
    <div className="group relative">
      <div
        className={cn(
          'workflow-drag-handle relative z-[20] flex cursor-grab items-center justify-center select-none [&:active]:cursor-grabbing',
          'rounded-full border-2 border-[var(--border-1)]',
        )}
        style={{
          width: CIRCLE_NODE_DIMENSIONS.DIAMETER,
          height: CIRCLE_NODE_DIMENSIONS.DIAMETER,
          background: bgColor,
          boxShadow: 'var(--block-shadow)',
        }}
        onClick={handleClick}
        title={name}
      >
        {!data.isPreview && (
          <ActionBar blockId={id} blockType={type} disabled={!userPermissions.canEdit} />
        )}

        {/* Top handle */}
        <Handle
          type="target"
          position={Position.Top}
          id="target-top"
          className="!z-[10] !cursor-crosshair !border-none !bg-white/80 !top-[-6px] !h-[10px] !w-[10px] !rounded-full"
          isConnectableStart={false}
          isConnectableEnd={true}
        />

        {/* Left handle */}
        <Handle
          type="target"
          position={Position.Left}
          id="target"
          className="!z-[10] !cursor-crosshair !border-none !bg-white/80 !left-[-6px] !h-[10px] !w-[10px] !rounded-full"
          style={{ top: '50%', transform: 'translateY(-50%)' }}
          isConnectableStart={false}
          isConnectableEnd={true}
        />

        {/* Icon */}
        {Icon && <Icon className="h-[24px] w-[24px] text-white" />}

        {/* Right handle */}
        <Handle
          type="source"
          position={Position.Right}
          id="source"
          className="!z-[10] !cursor-crosshair !border-none !bg-white/80 !right-[-6px] !h-[10px] !w-[10px] !rounded-full"
          style={{ top: '50%', transform: 'translateY(-50%)' }}
          isConnectableStart={true}
          isConnectableEnd={false}
        />

        {/* Bottom handle */}
        <Handle
          type="source"
          position={Position.Bottom}
          id="source-bottom"
          className="!z-[10] !cursor-crosshair !border-none !bg-white/80 !bottom-[-6px] !h-[10px] !w-[10px] !rounded-full"
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
