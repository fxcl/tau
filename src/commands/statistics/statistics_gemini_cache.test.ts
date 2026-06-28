/**
 * Statistics display tests for Antigravity Gemini cache accounting.
 *
 * Run: bun run src/commands/statistics/statistics_gemini_cache.test.ts
 */

import { modelUsageForStatisticsDisplay } from './model_usage_display.js'

let passed = 0
let failed = 0

async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn()
    passed++
    console.log(`  ok  ${name}`)
  } catch (e: any) {
    failed++
    console.log(`  FAIL ${name}: ${e?.message ?? String(e)}`)
  }
}

function assert(cond: unknown, hint: string): void {
  if (!cond) throw new Error(hint)
}

async function main(): Promise<void> {
  console.log('statistics Antigravity Gemini cache display:')

  await test('Antigravity Gemini input display excludes cache reads', () => {
    const usage = modelUsageForStatisticsDisplay('gemini-3.5-flash-medium', {
      inputTokens: 565_328,
      outputTokens: 4_524,
      cacheReadInputTokens: 480_529,
      cacheCreationInputTokens: 0,
    })

    assert(usage.inputTokens === 84_799, `inputTokens=${usage.inputTokens}`)
    assert(usage.cacheReadInputTokens === 480_529, `cacheReadInputTokens=${usage.cacheReadInputTokens}`)
    assert(usage.outputTokens === 4_524, `outputTokens=${usage.outputTokens}`)
  })

  await test('Claude on Antigravity keeps standard input display', () => {
    const usage = modelUsageForStatisticsDisplay('claude-sonnet-4-6', {
      inputTokens: 565_328,
      outputTokens: 4_524,
      cacheReadInputTokens: 480_529,
      cacheCreationInputTokens: 0,
    })

    assert(usage.inputTokens === 565_328, `inputTokens=${usage.inputTokens}`)
    assert(usage.cacheReadInputTokens === 480_529, `cacheReadInputTokens=${usage.cacheReadInputTokens}`)
  })

  await test('already-normalized Antigravity Gemini input is not double-subtracted', () => {
    const usage = modelUsageForStatisticsDisplay('gemini-3.5-flash-medium', {
      inputTokens: 565_328,
      outputTokens: 4_524,
      cacheReadInputTokens: 3_203_525,
      cacheCreationInputTokens: 0,
    })

    assert(usage.inputTokens === 565_328, `inputTokens=${usage.inputTokens}`)
    assert(usage.cacheReadInputTokens === 3_203_525, `cacheReadInputTokens=${usage.cacheReadInputTokens}`)
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

void main()
