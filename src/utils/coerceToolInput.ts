/**
 * Coerce model-provided tool inputs to match the expected Zod schema types.
 *
 * Non-frontier models (especially free-tier OpenRouter models like Nemotron,
 * Llama, etc.) frequently emit JSON strings for typed parameters — e.g.
 * `"allowedPrompts": "[{...}]"` instead of `"allowedPrompts": [{...}]`.
 *
 * This utility performs a shallow, conservative coercion pass BEFORE Zod
 * validation. If coercion produces invalid data, the downstream Zod
 * `safeParse()` still rejects it — this is a best-effort recovery layer,
 * not a replacement for validation.
 *
 * Coercions performed:
 *   - string → array:   JSON.parse if the string looks like "[...]"
 *   - string → object:  JSON.parse if the string looks like "{...}"
 *   - string → number:  parseFloat if the string is numeric
 *   - string → boolean: "true"/"false" → true/false
 */

import type { ZodTypeAny } from 'zod/v4'

/**
 * Extract the expected Zod type string for a schema node.
 * Returns the `_zod.def.type` discriminator (e.g. "array", "object",
 * "number", "boolean", "string") or null if unreadable.
 */
function getZodType(schema: ZodTypeAny): string | null {
  try {
    // Zod v4 exposes `_zod.def.type` as the discriminator
    const def = (schema as any)?._zod?.def ?? (schema as any)?._def
    if (def?.type) return def.type as string
    // Fallback: some Zod wrappers (optional, default, nullable) wrap an inner type
    if (def?.innerType) return getZodType(def.innerType)
    if (def?.schema) return getZodType(def.schema)
    return null
  } catch {
    return null
  }
}

/**
 * Extract property schemas from a Zod object schema.
 * Returns a Map of property name → ZodTypeAny, or null if not an object schema.
 */
function getObjectProperties(schema: ZodTypeAny): Map<string, ZodTypeAny> | null {
  try {
    const def = (schema as any)?._zod?.def ?? (schema as any)?._def
    const shape = def?.shape
    if (shape && typeof shape === 'object') {
      return new Map(Object.entries(shape) as Array<[string, ZodTypeAny]>)
    }
    return null
  } catch {
    return null
  }
}

/**
 * Unwrap optional/nullable/default wrappers to get the inner schema.
 */
function unwrapSchema(schema: ZodTypeAny): ZodTypeAny {
  try {
    const def = (schema as any)?._zod?.def ?? (schema as any)?._def
    const type = def?.type
    if (type === 'optional' || type === 'nullable' || type === 'default') {
      const inner = def?.innerType ?? def?.schema
      if (inner) return unwrapSchema(inner)
    }
    return schema
  } catch {
    return schema
  }
}

/**
 * Try to coerce a single value from string to the expected type.
 * Returns the coerced value, or the original if coercion isn't applicable.
 */
function coerceValue(value: unknown, expectedType: string): unknown {
  if (typeof value !== 'string') return value

  switch (expectedType) {
    case 'array': {
      const trimmed = value.trim()
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try { return JSON.parse(trimmed) } catch { /* fall through */ }
      }
      return value
    }
    case 'object': {
      const trimmed = value.trim()
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try { return JSON.parse(trimmed) } catch { /* fall through */ }
      }
      return value
    }
    case 'number':
    case 'float':
    case 'int':
    case 'integer': {
      const num = Number(value)
      if (!isNaN(num) && value.trim() !== '') return num
      return value
    }
    case 'boolean': {
      const lower = value.trim().toLowerCase()
      if (lower === 'true') return true
      if (lower === 'false') return false
      return value
    }
    default:
      return value
  }
}

/**
 * Coerce tool input values to match the expected schema types.
 *
 * This is a shallow pass — it coerces top-level properties of the input
 * object based on the schema's expected types. It does NOT deeply recurse
 * into nested objects (Zod validation handles deeper structure).
 *
 * @param input  Raw model-provided input object
 * @param schema The tool's Zod input schema
 * @returns A new object with coerced values (or the original if no schema)
 */
export function coerceToolInput(
  input: Record<string, unknown>,
  schema: ZodTypeAny,
): Record<string, unknown> {
  if (!input || typeof input !== 'object') return input

  const unwrapped = unwrapSchema(schema)
  const properties = getObjectProperties(unwrapped)
  if (!properties || properties.size === 0) return input

  let mutated = false
  const result: Record<string, unknown> = { ...input }

  for (const [key, propSchema] of properties) {
    if (!(key in result)) continue

    const innerSchema = unwrapSchema(propSchema)
    const expectedType = getZodType(innerSchema)
    if (!expectedType) continue

    const original = result[key]
    const coerced = coerceValue(original, expectedType)
    if (coerced !== original) {
      result[key] = coerced
      mutated = true
    }
  }

  return mutated ? result : input
}
