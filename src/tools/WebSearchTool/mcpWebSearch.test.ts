/**
 * MCP web search helper unit tests.
 *
 * Run: bun run src/tools/WebSearchTool/mcpWebSearch.test.ts
 */

import {
  parseMcpWebSearchHits,
  parseMcpWebSearchResponse,
} from './mcpWebSearch.js'

let passed = 0
let failed = 0

function test(name: string, fn: () => void): void {
  try {
    fn()
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

function payload(text: string): string {
  return JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    result: {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    },
  })
}

function main(): void {
  console.log('mcp web search:')

  test('parses plain JSON-RPC responses', () => {
    const result = parseMcpWebSearchResponse(payload('search results'))
    assert(result === 'search results', `got ${JSON.stringify(result)}`)
  })

  test('parses SSE JSON-RPC responses', () => {
    const result = parseMcpWebSearchResponse(
      `event: message\ndata: ${payload('sse results')}\n\n`,
    )
    assert(result === 'sse results', `got ${JSON.stringify(result)}`)
  })

  test('ignores non-JSON SSE data frames', () => {
    const result = parseMcpWebSearchResponse(
      `data: [DONE]\ndata: ${payload('later results')}\n\n`,
    )
    assert(result === 'later results', `got ${JSON.stringify(result)}`)
  })

  test('returns undefined when no text content exists', () => {
    const result = parseMcpWebSearchResponse(
      JSON.stringify({ jsonrpc: '2.0', id: 1, result: { content: [] } }),
    )
    assert(result === undefined, `got ${JSON.stringify(result)}`)
  })

  test('parses Exa-style title and URL hits', () => {
    const hits = parseMcpWebSearchHits(
      'Title: BBC Weather - Essaouira URL: https://www.bbc.com/weather/6547294 Published: N/A Highlights: Sunny today. Title: Travel Weather Index URL: https://example.com/weather Highlights: Windy.',
    )
    assert(hits.length === 2, `got ${JSON.stringify(hits)}`)
    assert(hits[0]?.title === 'BBC Weather - Essaouira', 'wrong first title')
    assert(
      hits[0]?.url === 'https://www.bbc.com/weather/6547294',
      'wrong first URL',
    )
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main()
