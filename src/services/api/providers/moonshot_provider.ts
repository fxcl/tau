/**
 * Moonshot AI / Kimi provider.
 *
 * Moonshot's public API speaks the OpenAI Chat Completions shape at
 * https://api.moonshot.ai/v1 with bearer-token authentication.
 */

import { OpenAIProvider } from './openai_provider.js'
import type { ModelInfo, ProviderConfig } from './base_provider.js'
import {
  filterMoonshotModelCatalog,
  normalizeMoonshotModelId,
} from '../../../utils/model/moonshotCatalog.js'

export class MoonshotProvider extends OpenAIProvider {
  readonly name = 'moonshot'

  constructor(config: ProviderConfig) {
    super({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl ?? 'https://api.moonshot.ai/v1',
      extraHeaders: config.extraHeaders,
    })
    this.optimizePayload = false
  }

  async listModels(): Promise<ModelInfo[]> {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: this._headers(),
      signal: AbortSignal.timeout(8_000),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(
        `Moonshot /models request failed with HTTP ${response.status}${detail ? `: ${detail}` : ''}`,
      )
    }

    const data = (await response.json()) as {
      data?: Array<{
        id?: string
        name?: string
        context_length?: number
        context_window?: number
        max_context_length?: number
        supports_reasoning?: boolean
        supports_tool_calling?: boolean
        tags?: readonly string[]
      }>
    }
    const apiModels = filterMoonshotModelCatalog(data.data ?? [])
    if (apiModels.length === 0) {
      throw new Error('Moonshot /models returned no chat models.')
    }

    return apiModels
  }

  resolveModel(claudeModel: string): string {
    return normalizeMoonshotModelId(super.resolveModel(claudeModel))
  }
}
