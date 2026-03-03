import { StatusCheckIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'

export const StatusCheckBlock: BlockConfig = {
  type: 'status_check',
  name: 'Status Check',
  description: 'Monitor progress status',
  longDescription: 'Track and display the progress of an operation with a visual progress bar and status indicator.',
  category: 'blocks',
  nodeType: 'statusNode',
  bgColor: '#22c55e',
  icon: StatusCheckIcon,
  subBlocks: [
    {
      id: 'target',
      title: 'Target URL',
      type: 'short-input',
      placeholder: 'https://api.example.com/status',
    },
  ],
  tools: {
    access: [],
  },
  inputs: {},
  outputs: {
    status: { type: 'string', description: 'Current status' },
    progress: { type: 'number', description: 'Progress percentage 0-100' },
  },
}
