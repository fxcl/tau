/**
 * Run: bun run src/lanes/openai-compat/tool_repair.test.ts
 */

import { repairCompatToolCall } from './loop.js'

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

await test('repairs AFTZoom targets vs filePath/symbols conflict', () => {
  const repaired = repairCompatToolCall('AFTZoom', {
    filePath: 'src/components/TestFileForSimplify.tsx',
    symbols: ['TestFileForSimplify'],
    targets: [{ filePath: 'src/components/TestFileForSimplify.tsx', symbol: 'TestFileForSimplify' }],
    contextLines: 2,
  })

  assert(repaired.toolName === 'AFTZoom', `toolName=${repaired.toolName}`)
  assert(!('filePath' in repaired.input), 'filePath should be removed when targets is present')
  assert(!('symbols' in repaired.input), 'symbols should be removed when targets is present')
  assert(Array.isArray(repaired.input.targets), 'targets should be preserved')
  assert(repaired.input.contextLines === 2, 'contextLines should be preserved')
})

await test('repairs AFTDiagnostics filePath vs directory conflict', () => {
  const repaired = repairCompatToolCall('AFTDiagnostics', {
    filePath: 'src/components/TestFileForSimplify.tsx',
    directory: 'src/components',
  })

  assert(repaired.toolName === 'AFTDiagnostics', `toolName=${repaired.toolName}`)
  assert(repaired.input.filePath === 'src/components/TestFileForSimplify.tsx', 'filePath should be preserved')
  assert(!('directory' in repaired.input), 'directory should be removed when filePath is present')
})

await test('reroutes patternless AFTAstSearch to AFTOutline', () => {
  const repaired = repairCompatToolCall('AFTAstSearch', {
    lang: 'tsx',
    paths: ['src/components/TestFileForSimplify.tsx'],
    globs: ['**/*'],
    contextLines: 2,
  })

  assert(repaired.toolName === 'AFTOutline', `toolName=${repaired.toolName}`)
  assert(repaired.input.target === 'src/components/TestFileForSimplify.tsx', `target=${repaired.input.target}`)
  assert(!('pattern' in repaired.input), 'pattern should not be invented')
})

await test('preserves valid AFTAstSearch pattern calls', () => {
  const input = {
    pattern: 'function $NAME($$$)',
    lang: 'tsx',
    paths: ['src/components/TestFileForSimplify.tsx'],
  }
  const repaired = repairCompatToolCall('AFTAstSearch', input)

  assert(repaired.toolName === 'AFTAstSearch', `toolName=${repaired.toolName}`)
  assert(repaired.input === input, 'valid search input should be preserved')
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
