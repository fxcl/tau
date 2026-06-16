/**
 * OpenCode Go transformer (https://opencode.ai/zen/go/).
 *
 * Go is the same OpenCode gateway as Zen, sharing the same credential
 * (OPENCODE_API_KEY). The ONLY thing that changes is the base path:
 *   Zen → https://opencode.ai/zen/v1
 *   Go  → https://opencode.ai/zen/go/v1
 *
 * Everything else is identical to Zen — request shaping, reasoning/thinking
 * effort injection, the rate-limit UA gate + session-affinity headers, and
 * cache_control management. So we clone the Zen transformer wholesale and
 * override ONLY the identity and the default base URL. Nothing is hardcoded:
 * the model list is live-fetched from `https://opencode.ai/zen/go/v1/models`
 * (no staticCatalog), exactly like Zen live-fetches `/zen/v1/models`, and the
 * small-fast mapping is inherited from Zen (its open-model branches —
 * glm-/kimi-/qwen/minimax — already resolve to ids that exist on Go).
 *
 * This file does NOT modify the Zen transformer; it spreads it, so any future
 * Zen fix flows to Go automatically.
 */

import type { Transformer } from './base.js'
import { opencodeTransformer } from './opencode.js'

export const opencodeGoTransformer: Transformer = {
  ...opencodeTransformer,
  id: 'opencodego',
  displayName: 'OpenCode Go',
  defaultBaseUrl: 'https://opencode.ai/zen/go/v1',
}
