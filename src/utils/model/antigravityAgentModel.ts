import type { APIProvider } from './providers.js'

export const ANTIGRAVITY_OPUS_46_MODEL = 'claude-opus-4-6-thinking'
export const ANTIGRAVITY_SONNET_46_MODEL = 'claude-sonnet-4-6'
export const ANTIGRAVITY_FAST_AGENT_MODEL = 'gemini-3.5-flash-low'

function normalizedModelId(model: string): string {
  return model.toLowerCase().replace(/^models\//, '').replace(/\[1m\]$/i, '').trim()
}

function resolveProvider(provider: APIProvider | undefined): APIProvider {
  if (provider !== undefined) return provider
  // Lazy require keeps lightweight tests from loading the full provider/config graph.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const providers = require('./providers.js') as typeof import('./providers.js')
  return providers.getAPIProvider()
}

function isAntigravityOpus46Parent(parentModel: string): boolean {
  const normalized = normalizedModelId(parentModel)
  return (
    normalized === ANTIGRAVITY_OPUS_46_MODEL ||
    normalized === 'claude-opus-4-6'
  )
}

export function resolveAntigravityOpus46AgentModel(
  modelSpec: string | undefined,
  parentModel: string,
  provider?: APIProvider,
): string | null {
  if (resolveProvider(provider) !== 'antigravity') return null
  if (!isAntigravityOpus46Parent(parentModel)) return null

  const model = normalizedModelId(modelSpec ?? 'inherit')
  switch (model) {
    case 'inherit':
    case 'opus':
    case 'best':
    case 'opusplan':
    case ANTIGRAVITY_OPUS_46_MODEL:
    case 'claude-opus-4-6':
      return parentModel
    case 'sonnet':
    case ANTIGRAVITY_SONNET_46_MODEL:
      return ANTIGRAVITY_SONNET_46_MODEL
    case 'haiku':
      return ANTIGRAVITY_FAST_AGENT_MODEL
    default:
      return null
  }
}
