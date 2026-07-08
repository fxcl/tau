/**
 * Run: bun run src/utils/model/agent.test.ts
 */

import {
  resolveAntigravityOpus46AgentModel,
} from './antigravityAgentModel.js'
import {
  isConcreteOpenAIGptModelForProvider,
  selectFreshOpenAIGptModelForProvider,
  shouldInheritOpenRouterGptAlias,
} from './openaiGptModels.js'
import {
  getRuntimeSkillModel,
  resolveSkillFrontmatterModel,
  shouldHonorSkillModelOverride,
} from './skillModel.js'

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

function main(): void {
  console.log('agent model resolver:')

  test('Antigravity Opus 4.6 default agents inherit the parent model', () => {
    const resolved = resolveAntigravityOpus46AgentModel(
      undefined,
      'claude-opus-4-6-thinking',
      'antigravity',
    )
    assert(resolved === 'claude-opus-4-6-thinking', `model=${resolved}`)
  })

  test('Antigravity Opus 4.6 sonnet agents stay on Antigravity Claude', () => {
    const resolved = resolveAntigravityOpus46AgentModel(
      'sonnet',
      'claude-opus-4-6-thinking',
      'antigravity',
    )
    assert(resolved === 'claude-sonnet-4-6', `model=${resolved}`)
  })

  test('Antigravity Opus 4.6 fast agents do not fall back to OpenAI', () => {
    const resolved = resolveAntigravityOpus46AgentModel(
      'haiku',
      'claude-opus-4-6-thinking',
      'antigravity',
    )
    assert(resolved === 'gemini-3.5-flash-low', `model=${resolved}`)
  })

  test('Antigravity Opus 4.6 tool model aliases use Antigravity models', () => {
    const haiku = resolveAntigravityOpus46AgentModel(
      'haiku',
      'claude-opus-4-6-thinking',
      'antigravity',
    )
    const sonnet = resolveAntigravityOpus46AgentModel(
      'sonnet',
      'claude-opus-4-6-thinking',
      'antigravity',
    )
    const opus = resolveAntigravityOpus46AgentModel(
      'opus',
      'claude-opus-4-6-thinking',
      'antigravity',
    )

    assert(haiku === 'gemini-3.5-flash-low', `haiku=${haiku}`)
    assert(sonnet === 'claude-sonnet-4-6', `sonnet=${sonnet}`)
    assert(opus === 'claude-opus-4-6-thinking', `opus=${opus}`)
  })

  test('non-Antigravity providers are untouched', () => {
    const resolved = resolveAntigravityOpus46AgentModel(
      'haiku',
      'claude-opus-4-6-thinking',
      'openai',
    )
    assert(resolved === null, `model=${resolved}`)
  })

  test('OpenRouter GPT sonnet agents inherit the session GPT model', () => {
    const concrete = isConcreteOpenAIGptModelForProvider(
      'openai/gpt-5.4',
      'openrouter',
    )
    const inherit = shouldInheritOpenRouterGptAlias(
      'sonnet',
      'openai/gpt-5.4',
      'openrouter',
    )
    const fresh = selectFreshOpenAIGptModelForProvider({
      fallback: 'openai/gpt-5.5',
      selected: 'openai/gpt-5.4',
      provider: 'openrouter',
      renderedMainLoopModel: 'openai/gpt-5.5',
    })
    const directOpenAi = shouldInheritOpenRouterGptAlias(
      'sonnet',
      'openai/gpt-5.4',
      'openai',
    )
    const haiku = shouldInheritOpenRouterGptAlias(
      'haiku',
      'openai/gpt-5.4',
      'openrouter',
    )

    assert(concrete, 'OpenRouter openai/gpt-* should count as concrete GPT')
    assert(inherit, 'expected OpenRouter GPT sonnet alias to inherit parent')
    assert(fresh === 'openai/gpt-5.4', `fresh=${fresh}`)
    assert(!directOpenAi, 'direct OpenAI provider should keep normal aliases')
    assert(!haiku, 'haiku aliases should keep the fast-model mapping')
  })

  test('non-Cursor skill aliases inherit the caller model', () => {
    const openrouter = resolveSkillFrontmatterModel('sonnet', 'openrouter')
    const kiro = resolveSkillFrontmatterModel('gpt-5.4', 'kiro')
    const antigravity = resolveSkillFrontmatterModel(
      'claude-sonnet-4-6',
      'antigravity',
    )

    assert(openrouter === undefined, `openrouter=${openrouter}`)
    assert(kiro === undefined, `kiro=${kiro}`)
    assert(antigravity === undefined, `antigravity=${antigravity}`)
  })

  test('runtime skill models are ignored outside Cursor', () => {
    const openrouter = getRuntimeSkillModel('claude-sonnet-4-6', 'openrouter')
    const kiro = getRuntimeSkillModel('gpt-5.4', 'kiro')

    assert(openrouter === undefined, `openrouter=${openrouter}`)
    assert(kiro === undefined, `kiro=${kiro}`)
  })

  test('Cursor keeps existing skill model override behavior', () => {
    const resolved = getRuntimeSkillModel('sonnet', 'cursor')

    assert(shouldHonorSkillModelOverride('cursor'), 'cursor should be honored')
    assert(resolved === 'sonnet', `model=${resolved}`)
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main()
