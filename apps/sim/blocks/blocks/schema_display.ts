import { DatabaseIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'

export const SchemaDisplayBlock: BlockConfig = {
  type: 'schema_display',
  name: 'Schema',
  description: 'Display a database schema',
  longDescription: 'Visualize database table fields with their types. Useful for mapping data structures in workflows.',
  category: 'blocks',
  nodeType: 'databaseSchema',
  bgColor: '#3b82f6',
  icon: DatabaseIcon,
  subBlocks: [
    {
      id: 'tableName',
      title: 'Table Name',
      type: 'short-input',
      placeholder: 'users',
    },
  ],
  tools: {
    access: [],
  },
  inputs: {},
  outputs: {
    schema: { type: 'json', description: 'The table schema definition' },
  },
}
