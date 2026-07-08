export interface OpenRouterStrictTool {
  function: {
    parameters: Record<string, unknown>
  }
}

export function normalizeOpenRouterGPTToolSchemas<T extends OpenRouterStrictTool>(
  tools: T[] | undefined,
  model: string,
): void {
  if (!tools?.length || !isOpenAIStrictOnOpenRouter(model)) return
  for (const tool of tools) {
    tool.function.parameters = normalizeOpenAIStrictToolSchema(tool.function.parameters)
  }
}

export function isOpenAIStrictOnOpenRouter(model: string): boolean {
  const id = model.toLowerCase().replace(/:.+$/, '')
  const local = id.startsWith('openai/') ? id.slice('openai/'.length) : id
  return /^(gpt-(?:4|5)|o[1-9]|chatgpt-)/.test(local)
}

export function normalizeOpenAIStrictToolSchema(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const normalized = normalizeOpenAIStrictSchema(schema)
  return isPlainRecord(normalized) ? normalized : { type: 'object', properties: {}, required: [], additionalProperties: false }
}

function normalizeOpenAIStrictSchema(node: unknown): unknown {
  if (node === undefined) return undefined
  if (node === null || typeof node !== 'object') return node
  if (Array.isArray(node)) {
    const items = node
      .map(normalizeOpenAIStrictSchema)
      .filter(item => item !== undefined)
    return items
  }

  const obj = node as Record<string, unknown>
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (OPENAI_STRICT_SCHEMA_DROP_KEYS.has(key)) continue
    if (key.startsWith('x-')) continue

    if (key === 'properties') {
      const props = normalizeProperties(value)
      if (props) result.properties = props
      continue
    }

    const child = normalizeOpenAIStrictSchema(value)
    if (child !== undefined) result[key] = child
  }

  if (schemaNodeAllowsObject(result)) {
    const props = normalizeProperties(result.properties)
    result.properties = props ?? {}
    result.required = Object.keys(result.properties)
    result.additionalProperties = false
  } else if (result.type && !hasCombiner(result)) {
    delete result.properties
    delete result.required
    delete result.additionalProperties
  }

  return result
}

function normalizeProperties(value: unknown): Record<string, unknown> | undefined {
  if (!isPlainRecord(value)) return undefined

  const out: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    const normalized = normalizeOpenAIStrictSchema(child)
    if (normalized !== undefined) out[key] = normalizePropertySchema(normalized)
  }
  return out
}

function normalizePropertySchema(value: unknown): unknown {
  if (value === true) return { type: 'string' }
  if (value === false) return undefined
  if (!isPlainRecord(value)) return value
  if (hasSchemaIntent(value)) return value
  return { type: 'string' }
}

function schemaNodeAllowsObject(node: Record<string, unknown>): boolean {
  if (node.type === 'object') return true
  return Array.isArray(node.type) && node.type.includes('object')
}

function hasCombiner(node: Record<string, unknown>): boolean {
  return Array.isArray(node.anyOf) || Array.isArray(node.oneOf) || Array.isArray(node.allOf)
}

function hasSchemaIntent(node: Record<string, unknown>): boolean {
  return (
    typeof node.type === 'string'
    || Array.isArray(node.type)
    || Array.isArray(node.enum)
    || hasCombiner(node)
  )
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

const OPENAI_STRICT_SCHEMA_DROP_KEYS = new Set([
  '$schema', '$id', '$ref', '$comment', '$defs', 'definitions',
  'default', 'examples', 'deprecated', 'readOnly', 'writeOnly', 'title',
  'patternProperties', 'propertyNames', 'minProperties', 'maxProperties',
  'unevaluatedProperties', 'dependentRequired', 'dependentSchemas',
  'pattern', 'format', 'minLength', 'maxLength',
  'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf',
  'prefixItems', 'unevaluatedItems', 'contains', 'minContains', 'maxContains',
  'minItems', 'maxItems', 'uniqueItems',
  'contentMediaType', 'contentEncoding',
  'const', 'not', 'if', 'then', 'else',
])
