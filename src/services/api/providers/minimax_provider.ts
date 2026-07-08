/**
 * MiniMax AI provider -- OpenAI-compatible chat completions.
 *
 * Primary routing uses the shared openai-compat lane. This legacy shim
 * exists for CLAUDEX_NATIVE_LANES=off and other fallback paths.
 */

import { OpenAIProvider } from './openai_provider.js'
import type { ModelInfo, ProviderConfig } from './base_provider.js'
import { filterMiniMaxModelCatalog } from '../../../utils/model/minimaxCatalog.js'

export class MiniMaxProvider extends OpenAIProvider {
  readonly name = 'minimax'

  constructor(config: ProviderConfig) {
    super({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl ?? 'https://api.minimax.io/v1',
      extraHeaders: config.extraHeaders,
    })
  }

  async listModels(): Promise<ModelInfo[]> {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: this._headers(),
      signal: AbortSignal.timeout(8_000),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(
        `MiniMax /models request failed with HTTP ${response.status}${detail ? `: ${detail}` : ''}`,
      )
    }

    const data = (await response.json()) as {
      data?: Array<{
        id?: string
        name?: string
        context_length?: number
        context_window?: number
        max_context_length?: number
        max_tokens?: number
        supports_tool_calling?: boolean
        tags?: readonly string[]
      }>
    }
    const apiModels = filterMiniMaxModelCatalog(data.data ?? [])
    if (apiModels.length === 0) {
      throw new Error('MiniMax /models returned no text models.')
    }

    return apiModels
  }
}
