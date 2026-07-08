/**
 * Run: bun run src/utils/model/openrouterStrictSchema.test.ts
 */

import {
  isOpenAIStrictOnOpenRouter,
  normalizeOpenAIStrictToolSchema,
} from './openrouterStrictSchema.js'

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

function assertStrictObjectInvariants(schema: any, path = 'root'): void {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return

  if (schema.type === 'object' || (Array.isArray(schema.type) && schema.type.includes('object'))) {
    const props = schema.properties ?? {}
    assert(props && typeof props === 'object' && !Array.isArray(props), `${path}.properties must be an object`)
    assert(Array.isArray(schema.required), `${path}.required must be an array`)
    assert(
      JSON.stringify(schema.required) === JSON.stringify(Object.keys(props)),
      `${path}.required=${JSON.stringify(schema.required)} props=${JSON.stringify(Object.keys(props))}`,
    )
    assert(schema.additionalProperties === false, `${path}.additionalProperties must be false`)
  }

  for (const forbidden of [
    '$schema', '$id', '$ref', '$defs', 'propertyNames', 'patternProperties',
    'minLength', 'pattern', 'format', 'const', 'if', 'then', 'else', 'x-mcp',
  ]) {
    assert(!(forbidden in schema), `${path} still has forbidden key ${forbidden}`)
  }

  for (const [key, value] of Object.entries(schema)) {
    if (value && typeof value === 'object') assertStrictObjectInvariants(value, `${path}.${key}`)
  }
}

await test('detects OpenRouter GPT and o-series strict models only', () => {
  assert(isOpenAIStrictOnOpenRouter('openai/gpt-5.5'), 'openai/gpt-5.5 should be strict')
  assert(isOpenAIStrictOnOpenRouter('gpt-4.1'), 'bare gpt-4.1 should be strict')
  assert(isOpenAIStrictOnOpenRouter('openai/o4-mini'), 'o-series should be strict')
  assert(!isOpenAIStrictOnOpenRouter('openai/gpt-oss-120b'), 'gpt-oss should not use Azure strict normalization')
  assert(!isOpenAIStrictOnOpenRouter('anthropic/claude-sonnet-4.6'), 'non-OpenAI model should not be strict')
})

await test('normalizes MCP-style loose schemas to serialized OpenAI strict invariants', () => {
  const out = normalizeOpenAIStrictToolSchema({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    'x-mcp': 'server-extension',
    propertyNames: { pattern: '^[a-z_]+$' },
    patternProperties: { '^x-': { type: 'string' } },
    properties: {
      query: { type: 'string', minLength: 1, pattern: '^x', default: 'x' },
      metadata: undefined,
      loose: {},
      allowAny: true,
      forbidden: false,
      nested: {
        type: 'object',
        properties: {
          tag: { const: 'alpha' },
          dropped: undefined,
        },
        required: ['tag', 'dropped', 'ghost'],
        additionalProperties: { type: 'string' },
      },
      list: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            uri: { type: 'string', format: 'uri' },
            missing: undefined,
          },
          required: ['uri', 'missing'],
        },
      },
    },
    required: ['query', 'metadata', 'loose', 'allowAny', 'forbidden', 'nested', 'list', 'ghost'],
    additionalProperties: { type: 'string' },
  })

  const wire = JSON.parse(JSON.stringify(out))
  assertStrictObjectInvariants(wire)
  assert(wire.properties.metadata === undefined, 'undefined metadata property must not serialize')
  assert(wire.properties.forbidden === undefined, 'false schema property must be dropped')
  assert(wire.properties.loose.type === 'string', 'loose property schema should get a fallback type')
  assert(wire.properties.allowAny.type === 'string', 'true property schema should get a fallback type')
  assert(wire.properties.nested.properties.tag.type === 'string', 'const-only property should get a fallback type')
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
