import { RocketIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'

export const DeployBlock: BlockConfig = {
  type: 'deploy',
  name: 'Deploy',
  description: 'Deploy to production',
  longDescription: 'Trigger a deployment action. This circle node serves as a quick-action endpoint in your workflow.',
  category: 'blocks',
  nodeType: 'circleNode',
  bgColor: '#6366f1',
  icon: RocketIcon,
  subBlocks: [],
  tools: {
    access: [],
  },
  inputs: {},
  outputs: {
    deployed: { type: 'boolean', description: 'Whether deployment succeeded' },
  },
}
