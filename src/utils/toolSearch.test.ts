/**
 * Tool-search provider compatibility checks.
 *
 * Run via: bun run src/utils/toolSearch.test.ts
 */

import { providerSupportsAnthropicToolSearch } from './model/providerCapabilities.js'
import { extractDiscoveredToolNames } from './toolDiscoveryScan.js'

let passed = 0
let failed = 0

function test(name: string, fn: () => void): void {
  try {
    fn()
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

test('Cursor does not use Anthropic tool-search deferral', () => {
  assert(
    !providerSupportsAnthropicToolSearch('cursor'),
    'cursor must receive full tool schemas directly',
  )
})

test('Anthropic-native providers can use Anthropic tool search', () => {
  assert(providerSupportsAnthropicToolSearch('firstParty'), 'firstParty')
  assert(providerSupportsAnthropicToolSearch('bedrock'), 'bedrock')
  assert(providerSupportsAnthropicToolSearch('vertex'), 'vertex')
  assert(providerSupportsAnthropicToolSearch('foundry'), 'foundry')
})

test('other native lanes also bypass Anthropic tool-search deferral', () => {
  for (const provider of ['openai', 'gemini', 'antigravity', 'kiro'] as const) {
    assert(
      !providerSupportsAnthropicToolSearch(provider),
      `${provider} must receive full tool schemas directly`,
    )
  }
})

test('direct assistant tool_use marks deferred tool as discovered for retry', () => {
  const discovered = extractDiscoveredToolNames([
    {
      type: 'assistant',
      message: {
        id: 'msg_1',
        type: 'message',
        role: 'assistant',
        model: 'test-model',
        stop_reason: 'tool_use',
        stop_sequence: null,
        usage: { input_tokens: 1, output_tokens: 1 },
        content: [
          {
            type: 'tool_use',
            id: 'toolu_1',
            name: 'TaskUpdate',
            input: { id: '1', status: 'completed' },
          },
        ],
      },
    } as any,
  ])

  assert(discovered.has('TaskUpdate'), 'TaskUpdate should be discovered')
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
