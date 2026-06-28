import { isAntigravityGeminiModel } from '../../services/api/providers/gemini_code_assist.js'

export type StatisticsModelStats = {
  inputTokens: number
  outputTokens: number
  cacheReadInputTokens: number
  cacheCreationInputTokens: number
}

export function modelUsageForStatisticsDisplay<T extends StatisticsModelStats>(
  model: string,
  usage: T,
): T {
  if (
    !isAntigravityGeminiModel(model) ||
    usage.cacheReadInputTokens <= 0 ||
    // Already-normalized sessions can have cache reads larger than uncached input.
    usage.cacheReadInputTokens >= usage.inputTokens
  ) {
    return usage
  }

  return {
    ...usage,
    inputTokens: Math.max(0, usage.inputTokens - usage.cacheReadInputTokens),
  }
}
