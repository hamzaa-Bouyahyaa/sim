import { ProductCardIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'

export const ProductCardBlock: BlockConfig = {
  type: 'product_card',
  name: 'Product Card',
  description: 'Display a rich content card',
  longDescription: 'Show a visual card with image preview, title, description, and tags. Great for content display and media workflows.',
  category: 'blocks',
  nodeType: 'richCard',
  bgColor: '#8b5cf6',
  icon: ProductCardIcon,
  subBlocks: [
    {
      id: 'title',
      title: 'Title',
      type: 'short-input',
      placeholder: 'Card title',
    },
    {
      id: 'description',
      title: 'Description',
      type: 'long-input',
      placeholder: 'Card description...',
    },
  ],
  tools: {
    access: [],
  },
  inputs: {},
  outputs: {
    content: { type: 'json', description: 'The card content data' },
  },
}
