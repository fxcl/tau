/**
 * Optional prebuilt tool toggle unit tests.
 *
 * Run: bun run src/utils/prebuiltToolToggles.test.ts
 */

import {
  AFT_OUTLINE_TOOL_NAME,
  AFT_ZOOM_TOOL_NAME,
} from '../tools/AFTTool/constants.js'
import { ARTIFACT_CANVAS_TOOL_NAME } from '../tools/ArtifactCanvasTool/constants.js'
import { DIFF_ARTIFACT_TOOL_NAME } from '../tools/DiffArtifactTool/constants.js'
import { LSP_TOOL_NAME } from '../tools/LSPTool/prompt.js'
import { TEST_SEARCH_TOOL_NAME } from '../tools/TestSearchTool/constants.js'
import { WEB_BROWSER_TOOL_NAME } from '../tools/WebBrowserTool/constants.js'
import {
  filterDisabledPrebuiltTools,
  isOptionalPrebuiltToolName,
  isPrebuiltToolDisabledByToolName,
  normalizeDisabledPrebuiltToolIds,
  setPrebuiltToolToggleEnabled,
} from './prebuiltToolToggles.js'

let passed = 0
let failed = 0

function test(name: string, fn: () => void): void {
  try {
    fn()
    passed++
    console.log(`  ok  ${name}`)
  } catch (error: unknown) {
    failed++
    console.log(
      `  FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

function assert(cond: unknown, hint: string): void {
  if (!cond) throw new Error(hint)
}

function assertJsonEqual(actual: unknown, expected: unknown, hint: string): void {
  const actualJson = JSON.stringify(actual)
  const expectedJson = JSON.stringify(expected)
  if (actualJson !== expectedJson) {
    throw new Error(`${hint}: expected ${expectedJson}, got ${actualJson}`)
  }
}

console.log('prebuilt tool toggles:')

test('normalizes ids, aliases, unknown values, and duplicates', () => {
  assertJsonEqual(
    normalizeDisabledPrebuiltToolIds([
      'unknown-tool',
      AFT_OUTLINE_TOOL_NAME,
      'AFT',
      LSP_TOOL_NAME.toUpperCase(),
      LSP_TOOL_NAME,
    ]),
    ['AFT', LSP_TOOL_NAME],
    'normalized disabled tools',
  )
})

test('filters every tool name in a disabled toggle group', () => {
  const tools = [
    { name: AFT_OUTLINE_TOOL_NAME },
    { name: AFT_ZOOM_TOOL_NAME },
    { name: LSP_TOOL_NAME },
    { name: 'Read' },
  ]

  assertJsonEqual(
    filterDisabledPrebuiltTools(tools, { disabledPrebuiltTools: ['AFT'] }).map(
      tool => tool.name,
    ),
    [LSP_TOOL_NAME, 'Read'],
    'filtered tools',
  )
})

test('checks disabled state by concrete tool name', () => {
  const settings = { disabledPrebuiltTools: ['AFT'] }
  assert(
    isPrebuiltToolDisabledByToolName(AFT_ZOOM_TOOL_NAME, settings),
    'AFT alias should be disabled',
  )
  assert(
    !isPrebuiltToolDisabledByToolName(LSP_TOOL_NAME, settings),
    'LSP should stay enabled',
  )
  assert(isOptionalPrebuiltToolName(AFT_OUTLINE_TOOL_NAME), 'AFT is optional')
  assert(!isOptionalPrebuiltToolName('Read'), 'basic tools are not optional')
})

test('recognizes new browser and artifact tools as optional', () => {
  const settings = {
    disabledPrebuiltTools: [
      WEB_BROWSER_TOOL_NAME,
      ARTIFACT_CANVAS_TOOL_NAME,
      DIFF_ARTIFACT_TOOL_NAME,
    ],
  }

  assert(
    isPrebuiltToolDisabledByToolName(WEB_BROWSER_TOOL_NAME, settings),
    'WebBrowser should be optional',
  )
  assert(
    isPrebuiltToolDisabledByToolName(ARTIFACT_CANVAS_TOOL_NAME, settings),
    'ArtifactCanvas should be optional',
  )
  assert(
    isPrebuiltToolDisabledByToolName(DIFF_ARTIFACT_TOOL_NAME, settings),
    'DiffArtifact should be optional',
  )
})

test('sets toggles with canonical ordering and rejects unknown ids', () => {
  const disabled = setPrebuiltToolToggleEnabled(
    [TEST_SEARCH_TOOL_NAME, 'unknown-tool'],
    AFT_ZOOM_TOOL_NAME,
    false,
  )

  assertJsonEqual(
    disabled,
    ['AFT', TEST_SEARCH_TOOL_NAME],
    'disabled tool order',
  )
  assertJsonEqual(
    setPrebuiltToolToggleEnabled(disabled ?? [], AFT_OUTLINE_TOOL_NAME, true),
    [TEST_SEARCH_TOOL_NAME],
    're-enabled AFT',
  )
  assert(
    setPrebuiltToolToggleEnabled(disabled ?? [], 'Read', false) === null,
    'basic tools should not be toggleable',
  )
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
