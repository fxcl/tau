import type { ModelInfo } from '../../services/api/providers/base_provider.js'
import { stripClineEffortVariant } from './clineThinking.js'

export const CLINE_PASS_PROVIDER = 'clinepass'
export const CLINE_PASS_LABEL = 'Cline Pass'

export const CLINE_PASS_MODEL_IDS = [
  'cline-pass/glm-5.2',
  'cline-pass/kimi-k2.7-code',
  'cline-pass/kimi-k2.6',
  'cline-pass/deepseek-v4-pro',
  'cline-pass/deepseek-v4-flash',
  'cline-pass/mimo-v2.5',
  'cline-pass/mimo-v2.5-pro',
  'cline-pass/minimax-m3',
  'cline-pass/qwen3.7-max',
  'cline-pass/qwen3.7-plus',
] as const

export type ClinePassModelId = (typeof CLINE_PASS_MODEL_IDS)[number]

const CLINE_PASS_MODEL_NAMES: Record<ClinePassModelId, string> = {
  'cline-pass/glm-5.2': 'GLM-5.2',
  'cline-pass/kimi-k2.7-code': 'Kimi K2.7 Code',
  'cline-pass/kimi-k2.6': 'Kimi K2.6',
  'cline-pass/deepseek-v4-pro': 'DeepSeek V4 Pro',
  'cline-pass/deepseek-v4-flash': 'DeepSeek V4 Flash',
  'cline-pass/mimo-v2.5': 'MiMo-V2.5',
  'cline-pass/mimo-v2.5-pro': 'MiMo-V2.5-Pro',
  'cline-pass/minimax-m3': 'MiniMax M3',
  'cline-pass/qwen3.7-max': 'Qwen3.7 Max',
  'cline-pass/qwen3.7-plus': 'Qwen3.7 Plus',
}

export function isClinePassProvider(provider: string | undefined): boolean {
  return provider === CLINE_PASS_PROVIDER
}

export function isClinePassModelId(modelId: string): modelId is ClinePassModelId {
  return (CLINE_PASS_MODEL_IDS as readonly string[]).includes(modelId)
}

export function getClinePassModelDisplayName(modelId: string): string | null {
  const baseModelId = stripClineEffortVariant(modelId).toLowerCase()
  return isClinePassModelId(baseModelId)
    ? CLINE_PASS_MODEL_NAMES[baseModelId]
    : null
}

export function getClinePassModels(): ModelInfo[] {
  return CLINE_PASS_MODEL_IDS.map(id => ({
    id,
    name: CLINE_PASS_MODEL_NAMES[id],
    provider: CLINE_PASS_LABEL,
    supportsToolCalling: true,
    tags: ['thinking', 'pro'],
  }))
}
