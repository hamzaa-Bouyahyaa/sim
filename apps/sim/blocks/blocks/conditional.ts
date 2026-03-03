import { ConditionalIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'

export const ConditionalBlock: BlockConfig = {
  type: 'conditional',
  name: 'Conditional',
  description: 'Branch with IF/ELSE logic',
  longDescription: 'Evaluate a condition and route the workflow to the YES or NO path based on the result.',
  category: 'blocks',
  nodeType: 'conditionalNode',
  bgColor: '#f97316',
  icon: ConditionalIcon,
  subBlocks: [
    {
      id: 'expression',
      title: 'Condition',
      type: 'short-input',
      placeholder: 'e.g. value > 10',
    },
  ],
  tools: {
    access: [],
  },
  inputs: {},
  outputs: {
    result: { type: 'boolean', description: 'The condition evaluation result' },
    path: { type: 'string', description: 'Which path was taken: yes or no' },
  },
}
