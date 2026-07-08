import { formatPatch, structuredPatch } from 'diff'
import { join, resolve } from 'path'
import { createElement } from 'react'
import { z } from 'zod/v4'

import { buildTool, type ToolDef } from '../../Tool.js'
import { Text } from '../../ink.js'
import { openPath } from '../../utils/browser.js'
import { getCwd } from '../../utils/cwd.js'
import { readFileSafe } from '../../utils/file.js'
import { pathToLocalFileUrl } from '../../utils/fileUrls.js'
import { lazySchema } from '../../utils/lazySchema.js'
import {
  ensureArtifactDir,
  htmlEscape,
  resolveArtifactDir,
  slugifyArtifactTitle,
  uniqueArtifactSlug,
  writeArtifactFile,
} from '../shared/htmlArtifacts.js'
import { DIFF_ARTIFACT_TOOL_NAME } from './constants.js'

const MAX_DIFF_BYTES = 512 * 1024

const DESCRIPTION =
  'Write a shareable browser HTML diff artifact plus a unified patch file.'

const PROMPT = `Create a durable diff artifact between two files.

Use when the user asks for a reviewable/shareable diff artifact, not for ordinary quick comparison. For quick in-terminal comparison, use FileDiff instead. This writes an HTML file and a .patch file under .tau/diff-artifacts by default, and returns absolute paths, canonical file:// URLs, and counts.`

const inputSchema = lazySchema(() =>
  z.strictObject({
    fileA: z
      .string()
      .min(1)
      .describe('Path to the base/left file, absolute or cwd-relative.'),
    fileB: z
      .string()
      .min(1)
      .describe('Path to the compare/right file, absolute or cwd-relative.'),
    title: z
      .string()
      .optional()
      .describe('Artifact title and filename hint. Defaults to the compared filenames.'),
    outputDir: z
      .string()
      .optional()
      .describe('Output directory. Defaults to .tau/diff-artifacts.'),
    open: z
      .boolean()
      .optional()
      .describe('Open the generated HTML file with the OS default browser. Defaults to false.'),
    overwrite: z
      .boolean()
      .optional()
      .describe('Overwrite files with the same slug. Defaults to false.'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    ok: z.boolean(),
    summary: z.string(),
    fileA: z.string(),
    fileB: z.string(),
    htmlPath: z.string().optional(),
    htmlUrl: z.string().optional(),
    patchPath: z.string().optional(),
    patchUrl: z.string().optional(),
    opened: z.boolean().optional(),
    additions: z.number().optional(),
    deletions: z.number().optional(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>
export type Output = z.infer<OutputSchema>

function renderText(message: string): React.ReactNode {
  return createElement(Text, null, message)
}

function lineClass(line: string): string {
  if (line.startsWith('+++') || line.startsWith('---')) return 'meta'
  if (line.startsWith('@@')) return 'hunk'
  if (line.startsWith('+')) return 'add'
  if (line.startsWith('-')) return 'del'
  return 'ctx'
}

function renderPatchHtml(patch: string): string {
  return patch
    .split(/\r?\n/u)
    .map((line, index) => {
      const lineNo = String(index + 1).padStart(4, ' ')
      return `<div class="line ${lineClass(line)}"><span class="num">${lineNo}</span><span class="code">${htmlEscape(line || ' ')}</span></div>`
    })
    .join('\n')
}

function buildHtml(params: {
  title: string
  fileA: string
  fileB: string
  patch: string
  additions: number
  deletions: number
}): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${htmlEscape(params.title)}</title>
  <style>
    :root { color-scheme: light dark; }
    body { margin: 0; background: #f7f7f5; color: #181816; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .shell { max-width: 1280px; margin: 0 auto; padding: 28px 20px 56px; }
    header { display: flex; justify-content: space-between; gap: 16px; align-items: baseline; border-bottom: 1px solid #d9d9d2; padding-bottom: 14px; margin-bottom: 18px; }
    h1 { margin: 0; font-size: 22px; line-height: 1.2; }
    .meta { color: #66665f; font-size: 13px; }
    .paths { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; font-size: 12px; }
    .path { border: 1px solid #d9d9d2; border-radius: 6px; padding: 10px; background: #fff; overflow-wrap: anywhere; }
    .old { border-left: 4px solid #cc4b4b; }
    .new { border-left: 4px solid #2f8f54; }
    .diff { border: 1px solid #d9d9d2; border-radius: 8px; overflow: auto; background: #fff; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; font-size: 12px; line-height: 1.45; }
    .line { display: grid; grid-template-columns: 58px minmax(0, 1fr); min-width: max-content; }
    .num { user-select: none; text-align: right; color: #8b8b82; padding: 0 12px 0 8px; border-right: 1px solid #e4e4dc; }
    .code { white-space: pre; padding: 0 12px; }
    .add { background: #e8f5eb; }
    .del { background: #fdecec; }
    .hunk { background: #eef0ff; color: #3f46a3; }
    .meta { color: #66665f; }
    @media (prefers-color-scheme: dark) {
      body { background: #181816; color: #f1f1ed; }
      header, .path, .diff { border-color: #3a3a34; }
      .path, .diff { background: #20201d; }
      .meta { color: #aaa99f; }
      .num { border-color: #3a3a34; color: #8d8c83; }
      .add { background: #173721; }
      .del { background: #3a1e1e; }
      .hunk { background: #222848; color: #c7cbff; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <header>
      <h1>${htmlEscape(params.title)}</h1>
      <div class="meta">+${params.additions} -${params.deletions}</div>
    </header>
    <section class="paths">
      <div class="path old">${htmlEscape(params.fileA)}</div>
      <div class="path new">${htmlEscape(params.fileB)}</div>
    </section>
    <section class="diff">
${renderPatchHtml(params.patch)}
    </section>
  </main>
</body>
</html>
`
}

function artifactTitle(input: z.infer<InputSchema>): string {
  return input.title?.trim() || `${input.fileA} to ${input.fileB}`
}

export const DiffArtifactTool = buildTool({
  name: DIFF_ARTIFACT_TOOL_NAME,
  searchHint: 'shareable html diff artifact',
  maxResultSizeChars: 20_000,
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
    return 'Writing diff artifact'
  },
  isReadOnly() {
    return false
  },
  isConcurrencySafe(input) {
    return input.overwrite !== true
  },
  isDestructive(input) {
    return input.overwrite === true
  },
  toAutoClassifierInput(input) {
    return `${input.fileA} ${input.fileB} ${input.outputDir ?? ''}`.trim()
  },
  async validateInput(input) {
    if (!input.fileA.trim() || !input.fileB.trim()) {
      return {
        result: false,
        message: 'DiffArtifact requires both "fileA" and "fileB"',
        errorCode: 1,
      }
    }
    return { result: true }
  },
  renderToolUseMessage(input) {
    return renderText(`Writing diff artifact ${input.fileA ?? ''} -> ${input.fileB ?? ''}`.trim())
  },
  renderToolResultMessage(output) {
    return renderText(output.htmlPath ? `Wrote ${output.htmlPath}` : output.summary)
  },
  async call(input) {
    const cwd = getCwd()
    const fileAPath = resolve(cwd, input.fileA)
    const fileBPath = resolve(cwd, input.fileB)
    const a = readFileSafe(fileAPath)
    const b = readFileSafe(fileBPath)

    if (a === null || b === null) {
      const missing = [
        a === null ? input.fileA : null,
        b === null ? input.fileB : null,
      ]
        .filter(Boolean)
        .join(', ')
      return {
        data: {
          ok: false,
          summary: `Cannot read file(s): ${missing}`,
          fileA: input.fileA,
          fileB: input.fileB,
        },
      }
    }

    if (a.length + b.length > MAX_DIFF_BYTES) {
      return {
        data: {
          ok: false,
          summary: `Files too large for diff artifact (${a.length + b.length} bytes > ${MAX_DIFF_BYTES})`,
          fileA: input.fileA,
          fileB: input.fileB,
        },
      }
    }

    const sp = structuredPatch(input.fileA, input.fileB, a, b, '', '')
    const patch = formatPatch(sp)
    const additions = sp.hunks.reduce(
      (n, h) => n + h.lines.filter(l => l.startsWith('+')).length,
      0,
    )
    const deletions = sp.hunks.reduce(
      (n, h) => n + h.lines.filter(l => l.startsWith('-')).length,
      0,
    )
    const title = artifactTitle(input)
    const dir = resolveArtifactDir(input.outputDir, 'diff-artifacts')
    ensureArtifactDir(dir)
    const baseSlug = slugifyArtifactTitle(title, 'diff-artifact')
    const slug = uniqueArtifactSlug(dir, baseSlug, ['.html', '.patch'], input.overwrite)
    const patchPath = join(dir, `${slug}.patch`)
    const htmlPath = join(dir, `${slug}.html`)
    const html = buildHtml({
      title,
      fileA: input.fileA,
      fileB: input.fileB,
      patch: patch || 'Files are identical',
      additions,
      deletions,
    })

    writeArtifactFile(patchPath, patch)
    writeArtifactFile(htmlPath, html)

    const opened = input.open === true ? await openPath(htmlPath) : false

    return {
      data: {
        ok: true,
        summary: `${input.fileA} -> ${input.fileB} +${additions} -${deletions}`,
        fileA: input.fileA,
        fileB: input.fileB,
        htmlPath,
        htmlUrl: pathToLocalFileUrl(htmlPath),
        patchPath,
        patchUrl: pathToLocalFileUrl(patchPath),
        opened,
        additions,
        deletions,
      },
    }
  },
  mapToolResultToToolResultBlockParam(output, toolUseID) {
    return {
      type: 'tool_result',
      tool_use_id: toolUseID,
      is_error: output.ok ? undefined : true,
      content: output.ok
        ? [
            `Diff artifact: ${output.summary}`,
            `HTML: ${output.htmlPath}`,
            `HTML URL: ${output.htmlUrl}`,
            `Patch: ${output.patchPath}`,
            `Patch URL: ${output.patchUrl}`,
            `Opened: ${output.opened ? 'yes' : 'no'}`,
          ].join('\n')
        : output.summary,
    }
  },
} satisfies ToolDef<InputSchema, Output>)
