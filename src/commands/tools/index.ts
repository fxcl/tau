import type { Command } from '../../commands.js'
import { getPowerModeFromSettings } from '../../utils/powerMode.js'
import { getInitialSettings } from '../../utils/settings/settings.js'

const tools = {
  type: 'local-jsx',
  name: 'tools',
  description:
    'Interactively turn optional prebuilt tools on or off',
  argumentHint: '[on|off|status|reset] [name]',
  // Only meaningful in normal power mode: cheap forces every optional tool
  // off and full forces every optional tool on, so the command is hidden
  // there (/mode re-fetches the command list on switch).
  isEnabled: () =>
    getPowerModeFromSettings(getInitialSettings()) === 'normal',
  isHidden: false,
  load: () => import('./tools.js'),
} satisfies Command

export default tools
