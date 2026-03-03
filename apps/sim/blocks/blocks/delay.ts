import { TimerIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'

export const DelayBlock: BlockConfig = {
  type: 'delay',
  name: 'Delay',
  description: 'Wait for a specified duration',
  longDescription: 'Pause the workflow execution for a configurable amount of time before continuing to the next block.',
  category: 'blocks',
  nodeType: 'minimalPill',
  bgColor: '#f59e0b',
  icon: TimerIcon,
  subBlocks: [
    {
      id: 'duration',
      title: 'Duration (seconds)',
      type: 'short-input',
      placeholder: '5',
    },
  ],
  tools: {
    access: [],
  },
  inputs: {},
  outputs: {
    completed: { type: 'boolean', description: 'Whether the delay completed' },
  },
}
