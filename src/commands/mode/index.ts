import type { Command } from '../../commands.js'

const mode = {
  type: 'local-jsx',
  name: 'mode',
  aliases: ['power', 'powermode'],
  description:
    'Switch power mode: cheap (core tools only), normal, or full power',
  argumentHint: '[cheap|normal|full]',
  isEnabled: () => true,
  isHidden: false,
  load: () => import('./mode.js'),
} satisfies Command

export default mode
