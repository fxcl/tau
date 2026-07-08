import { createElement } from 'react'
import { z } from 'zod/v4'

import { buildTool, type ToolDef } from '../../Tool.js'
import { Text } from '../../ink.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { retrievePersistedToolResult } from '../../utils/toolResultStorage.js'
import { TOOL_OUTPUT_RETRIEVE_TOOL_NAME } from './constants.js'

const DESCRIPTION =
  'Recover a bounded range from a persisted Tau tool output, background task output, or artifact. Read-only.'

const PROMPT = `Read a bounded range from a Tau persisted tool output, Tau-managed background task output, or Tau-managed artifact. This is read-only and only allows files inside Tau tool-results directories, project temp task-output directories, or the project-local .tau directory. For ordinary project files, use the Read tool instead.

Use when a prior tool result says "Full output saved to:", when a background task output_file ending in .output needs inspection, or when a path under the project's .tau directory (artifacts, diff-artifacts, mermaid, specs, …) needs inspection. Provide path OR toolUseId; if both are given, the path is tried first and the id is used as a fallback. Retrieve the smallest byte or line range needed; do not read the full original unless the task truly requires it.`

function renderText(message: string): React.ReactNode {
  return createElement(Text, null, message)
}

const inputSchema = lazySchema(() =>
  z.strictObject({
    path: z
      .string()
      .optional()
      .describe('Absolute saved-output path, background task .output path, .tau artifact path, or a filename relative to the current tool-results directory.'),
    toolUseId: z
      .string()
      .optional()
      .describe('Tool use id (or background task id) to recover from the current session tool-results / task-output directories. Used when path is omitted, or as fallback when both are provided.'),
    startByte: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe('Zero-based byte offset. Ignored when line range inputs are provided. Defaults to 0.'),
    maxBytes: z
      .number()
      .int()
      .min(1)
      .max(100_000)
      .optional()
      .describe('Maximum bytes to return. Defaults to 20000 and is capped at 100000.'),
    startLine: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe('One-based line number to start from. Enables line-range mode.'),
    lineCount: z
      .number()
      .int()
      .min(1)
      .max(2_000)
      .optional()
      .describe('Maximum lines to return in line-range mode. Defaults to 200 and is capped at 2000.'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    ok: z.boolean(),
    path: z.string().optional(),
    totalBytes: z.number().optional(),
    range: z.string().optional(),
    content: z.string().optional(),
    truncated: z.boolean().optional(),
    error: z.string().optional(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>
export type Output = z.infer<OutputSchema>

export const ToolOutputRetrieveTool = buildTool({
  name: TOOL_OUTPUT_RETRIEVE_TOOL_NAME,
  searchHint: 'recover compressed tool output',
  maxResultSizeChars: 130_000,
  shouldDefer: true,
  async description() {
    return DESCRIPTION
  },
  async prompt() {
    return PROMPT
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  userFacingName() {
    return 'Reading saved tool output'
  },
  isReadOnly() {
    return true
  },
  isConcurrencySafe() {
    return true
  },
  toAutoClassifierInput(input) {
    return `${input.path ?? ''} ${input.toolUseId ?? ''}`.trim()
  },
  async validateInput(input) {
    if (!input.path?.trim() && !input.toolUseId?.trim()) {
      return {
        result: false,
        message: 'ToolOutputRetrieve requires either path or toolUseId.',
        errorCode: 1,
      }
    }
    // Both provided is fine: resolution tries the path first, then falls back
    // to the toolUseId. Hard-erroring here just made models loop on retries.
    return { result: true }
  },
  renderToolUseMessage(input) {
    return renderText(
      input.path
        ? `Reading saved output from ${input.path}`
        : `Reading saved output for ${input.toolUseId}`,
    )
  },
  renderToolResultMessage(output) {
    if (!output.ok) return renderText(output.error ?? 'Unable to read saved output')
    return renderText(
      `${output.range ?? 'range'} from ${output.totalBytes ?? 0} byte saved output`,
    )
  },
  async call(input) {
    const result = await retrievePersistedToolResult(input)
    return { data: result }
  },
  mapToolResultToToolResultBlockParam(output, toolUseID) {
    if (!output.ok) {
      return {
        type: 'tool_result',
        tool_use_id: toolUseID,
        is_error: true,
        content: output.error ?? 'Unable to read saved output.',
      }
    }
    const lines = [
      `Path: ${output.path}`,
      `Total bytes: ${output.totalBytes}`,
      `Range: ${output.range}`,
      `Truncated: ${output.truncated ? 'yes' : 'no'}`,
      '',
      output.content ?? '',
    ]
    return { type: 'tool_result', tool_use_id: toolUseID, content: lines.join('\n') }
  },
} satisfies ToolDef<InputSchema, Output>)
