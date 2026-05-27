import React from 'react'
import { MessageResponse } from '../../components/MessageResponse.js'
import { Text } from '../../ink.js'
import { getDisplayPath } from '../../utils/file.js'
import type { AftOutput } from './AFTTools.js'

type AnyInput = Record<string, unknown>

function shortPath(value: unknown, verbose: boolean): string | null {
  if (typeof value !== 'string' || value.length === 0) return null
  return verbose ? value : getDisplayPath(value)
}

export function userFacingName(): string {
  return 'AFT'
}

export function renderAftToolUseMessage(
  input: Partial<AnyInput>,
  { verbose }: { verbose: boolean },
): React.ReactNode {
  const op = typeof input.op === 'string' ? input.op : null
  const target =
    shortPath(input.target, verbose) ??
    shortPath(input.filePath, verbose) ??
    shortPath(input.directory, verbose)
  const symbol = typeof input.symbol === 'string' ? input.symbol : null
  const pattern = typeof input.pattern === 'string' ? input.pattern : null

  const parts: string[] = []
  if (op) parts.push(op)
  if (target) parts.push(target)
  if (symbol) parts.push(symbol)
  if (pattern) parts.push(pattern)
  return parts.join(' - ') || 'code intelligence'
}

export function renderAftToolResultMessage(output: AftOutput): React.ReactNode {
  const firstLine = output.text.split(/\r?\n/, 1)[0] || output.command
  return (
    <MessageResponse>
      <Text>{firstLine}</Text>
    </MessageResponse>
  )
}
