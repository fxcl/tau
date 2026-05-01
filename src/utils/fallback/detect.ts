import { APIError } from '@anthropic-ai/sdk'
import type { AssistantMessage } from '../../types/message.js'

/**
 * Tight detection for "this error is the kind that fallback models can fix"
 *
 * The /fallback feature is meant to recover ONLY from quota and server-side
 * issues — i.e. errors where retrying the same prompt against a DIFFERENT
 * provider/model has a real chance of succeeding.
 *
 * INTENTIONALLY EXCLUDED (per the rule "don't catch agent error signals"):
 *   - tool/Read/Write failures (never reach the API error path)
 *   - MCP server failures
 *   - "fetch failed" / connection errors / timeouts (transient; the in-stream
 *     retry already covers these — surfacing to fallback would mask real
 *     networking problems behind a model swap)
 *   - 401/403 authentication issues (a different model on the same broken
 *     auth still 401s — fallback won't help)
 *   - 400 invalid_request (prompt-too-long, malformed PDFs, image size,
 *     tool_use mismatches — all user-input issues that fallback can't fix)
 *   - 404 model-not-found (provider-specific; user fixes via /model)
 *   - max_output_tokens (model output cap — different model has the same cap)
 */

const FALLBACK_ELIGIBLE_API_ERRORS = new Set<string>([
  'rate_limit',
  'billing_error',
])

/**
 * Match strict server-side overload / 5xx patterns in the surfaced error text
 * (when we don't have the raw thrown error object — i.e. for synthetic
 * AssistantMessages with `error: 'unknown'`).
 */
function hasServerOverloadText(text: string): boolean {
  if (!text) return false
  return (
    /\boverloaded_error\b/i.test(text) ||
    /\binternal_server_error\b/i.test(text) ||
    /\bAPI\s+Error:\s*5\d{2}\b/i.test(text) ||
    /\bRepeated\s+529\b/i.test(text) ||
    /\bcapacity[-_\s]?off[-_\s]?switch\b/i.test(text)
  )
}

function getAssistantErrorText(message: AssistantMessage): string {
  const content = message.message?.content
  if (!Array.isArray(content)) return ''
  const parts: string[] = []
  for (const block of content) {
    if (block && block.type === 'text' && typeof block.text === 'string') {
      parts.push(block.text)
    }
  }
  return parts.join('\n')
}

/**
 * Should this assistant API error message trigger the configured fallback chain?
 *
 * Strict gate: only the `error` field values explicitly tied to quota/billing,
 * plus a narrow text match for server overload errors that come back as
 * `error: 'unknown'` from the SDK's catchall branch.
 */
export function isFallbackEligibleAPIErrorMessage(
  message: AssistantMessage,
): boolean {
  if (!message || message.isApiErrorMessage !== true) {
    return false
  }
  const errorKind = String(message.error ?? '')
  if (FALLBACK_ELIGIBLE_API_ERRORS.has(errorKind)) {
    return true
  }
  if (errorKind === 'unknown') {
    const text = getAssistantErrorText(message) || message.errorDetails || ''
    return hasServerOverloadText(text)
  }
  return false
}

/**
 * Should this thrown error trigger the configured fallback chain? Used in the
 * outer try/catch when an API error escapes streaming as a thrown exception.
 *
 * Only triggers on:
 *   - APIError with status 402 (payment required), 429 (rate limit), or 5xx
 *   - "credit balance is too low" / "Extra usage is required" verbiage
 *
 * Plain `Error` (fetch failed, AbortError, generic) is REJECTED — those are
 * transport / agent-side issues that don't get fixed by switching models.
 */
export function isFallbackEligibleThrownError(error: unknown): boolean {
  if (error instanceof APIError) {
    const status = error.status
    if (typeof status === 'number') {
      if (status === 402 || status === 429) return true
      if (status >= 500 && status < 600) return true
    }
    const msg = String(error.message ?? '')
    if (
      /\bcredit balance is too low\b/i.test(msg) ||
      /\bExtra usage is required\b/i.test(msg) ||
      /\boverloaded_error\b/i.test(msg)
    ) {
      return true
    }
    return false
  }
  return false
}

/**
 * Truncate the surfaced error text so the confirmation banner stays compact.
 */
export function truncateFallbackErrorMessage(message: string): string {
  const normalized = String(message ?? '').replace(/\s+/g, ' ').trim()
  if (normalized.length <= 300) return normalized
  return `${normalized.slice(0, 297)}...`
}

export function getAssistantAPIErrorText(message: AssistantMessage): string {
  const text = getAssistantErrorText(message).trim()
  return text || String(message.errorDetails ?? message.error ?? 'Model request failed')
}
