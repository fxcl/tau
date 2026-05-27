import { jsonStringify } from '../../utils/slowOperations.js'
import type { AftCommandResponse } from './bridge.js'

type ZoomRange = {
  start_line?: number
  end_line?: number
}

type ZoomAnnotation = {
  name?: string
  line?: number
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  return value as Record<string, unknown>
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

export function formatAftError(
  command: string,
  response: AftCommandResponse,
): string {
  const code = asString(response.code)
  const message = asString(response.message) ?? `${command} failed`
  if (!code) return message

  const extras: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(response)) {
    if (['id', 'success', 'code', 'message'].includes(key)) continue
    extras[key] = value
  }

  const lines = [`${command}: ${code} - ${message}`]
  if (Object.keys(extras).length > 0) {
    lines.push(`data: ${jsonStringify(extras)}`)
  }
  return lines.join('\n')
}

export function formatOutlineResponse(response: AftCommandResponse): string {
  const text = asString(response.text) ?? jsonStringify(response)
  const skipped = Array.isArray(response.skipped_files)
    ? response.skipped_files
        .map(asRecord)
        .filter((item): item is Record<string, unknown> => item !== undefined)
    : []

  if (skipped.length === 0) return text

  const skippedText = skipped
    .map(item => {
      const file = asString(item.file) ?? 'unknown'
      const reason = asString(item.reason) ?? 'skipped'
      return `  ${file} - ${reason}`
    })
    .join('\n')
  return `${text}\n\nSkipped ${skipped.length} file(s):\n${skippedText}`
}

export function formatAstSearchResponse(response: AftCommandResponse): string {
  const matches = Array.isArray(response.matches)
    ? response.matches
        .map(asRecord)
        .filter((item): item is Record<string, unknown> => item !== undefined)
    : []
  const filesSearched =
    typeof response.files_searched === 'number' ? response.files_searched : 0
  const totalMatches =
    typeof response.total_matches === 'number'
      ? response.total_matches
      : matches.length
  const filesWithMatches =
    typeof response.files_with_matches === 'number'
      ? response.files_with_matches
      : 0

  if (response.no_files_matched_scope === true) {
    return 'No files matched the requested paths/globs.'
  }

  if (totalMatches === 0) {
    const hint = asString(response.hint)
    return hint
      ? `No matches found (searched ${filesSearched} files).\n\n${hint}`
      : `No matches found (searched ${filesSearched} files).`
  }

  const lines = [
    `Found ${totalMatches} match(es) in ${filesWithMatches} file(s) (${filesSearched} searched)`,
    '',
  ]
  for (const match of matches) {
    const file = asString(match.file) ?? 'unknown'
    const line = typeof match.line === 'number' ? match.line : 0
    const text = asString(match.text)
    lines.push(`${file}:${line}`)
    if (text) lines.push(`  ${text.trim()}`)
    const meta = asRecord(match.meta_variables)
    if (meta) {
      for (const [key, value] of Object.entries(meta)) {
        if (typeof value === 'string') lines.push(`  ${key}: ${value}`)
      }
    }
    lines.push('')
  }
  return lines.join('\n').trimEnd()
}

export function formatZoomResponse(
  targetLabel: string,
  response: AftCommandResponse,
): string {
  const range = asRecord(response.range) as ZoomRange | undefined
  const startLine = range?.start_line ?? 1
  const endLine = range?.end_line ?? startLine
  const kind = asString(response.kind) ?? 'symbol'
  const name = asString(response.name) ?? ''
  const content = asString(response.content) ?? ''
  const contextBefore = asStringArray(response.context_before)
  const contextAfter = asStringArray(response.context_after)

  const header =
    kind === 'lines'
      ? `${targetLabel}:${startLine}-${endLine}`
      : `${targetLabel}:${startLine}-${endLine} [${kind} ${name}]`.trimEnd()

  const contentLines = content.split('\n')
  if (contentLines[contentLines.length - 1] === '') contentLines.pop()

  const lastDisplayedLine = endLine + contextAfter.length
  const gutterWidth = String(Math.max(lastDisplayedLine, 1)).length
  const formatLine = (lineNo: number, text: string) =>
    `${String(lineNo).padStart(gutterWidth)}: ${text}`

  const lines = [header, '']
  let lineNo = startLine - contextBefore.length
  for (const line of contextBefore) lines.push(formatLine(lineNo++, line))
  for (const line of contentLines) lines.push(formatLine(lineNo++, line))
  for (const line of contextAfter) lines.push(formatLine(lineNo++, line))

  const annotations = asRecord(response.annotations)
  const callsOut = Array.isArray(annotations?.calls_out)
    ? (annotations.calls_out.map(asRecord).filter(Boolean) as ZoomAnnotation[])
    : []
  const calledBy = Array.isArray(annotations?.called_by)
    ? (annotations.called_by.map(asRecord).filter(Boolean) as ZoomAnnotation[])
    : []

  if (callsOut.length > 0) {
    lines.push('', '--- calls_out')
    for (const ref of callsOut) {
      if (ref.name) lines.push(`  ${ref.name} (line ${ref.line ?? '?'})`)
    }
  }
  if (calledBy.length > 0) {
    lines.push('', '--- called_by')
    for (const ref of calledBy) {
      if (ref.name) lines.push(`  ${ref.name} (line ${ref.line ?? '?'})`)
    }
  }

  return lines.join('\n')
}

export function formatJsonResponse(response: AftCommandResponse): string {
  return jsonStringify(response)
}
