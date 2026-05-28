import {
  applyTeamModeOrchestratorAppState,
  type TeamModeModelState,
  type TeamModeOrchestratorStateRole,
} from './appState.js'

let passed = 0
let failed = 0

function test(name: string, fn: () => void): void {
  try {
    fn()
    passed++
    console.log(`  ok  ${name}`)
  } catch (error: any) {
    failed++
    console.log(`  FAIL ${name}: ${error?.message ?? String(error)}`)
  }
}

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

function baseState(): TeamModeModelState {
  return {
    mainLoopModel: 'tencent/hy3-preview',
    mainLoopModelForSession: 'tencent/hy3-preview',
    effortValue: 'high',
  }
}

function role(
  overrides: Partial<TeamModeOrchestratorStateRole>,
): TeamModeOrchestratorStateRole {
  return {
    provider: 'openai',
    model: 'gpt-5.2',
    ...overrides,
  }
}

function main(): void {
  console.log('team-mode app state:')

  test('orchestrator model replaces stale session model', () => {
    const next = applyTeamModeOrchestratorAppState(baseState(), role({}))
    assert(next.mainLoopModel === 'gpt-5.2', 'expected orchestrator model')
    assert(next.mainLoopModelForSession === null, 'expected session override cleared')
  })

  test('first-party orchestrator clears stale effort when none is configured', () => {
    const next = applyTeamModeOrchestratorAppState(
      baseState(),
      role({ provider: 'firstParty', model: 'claude-sonnet-4-6-20251117' }),
    )
    assert(next.effortValue === undefined, 'expected first-party effort cleared')
  })

  test('configured orchestrator effort is applied', () => {
    const next = applyTeamModeOrchestratorAppState(
      baseState(),
      role({ provider: 'firstParty', effort: 'medium' }),
    )
    assert(next.effortValue === 'medium', 'expected configured effort')
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) {
    process.exit(1)
  }
}

main()
