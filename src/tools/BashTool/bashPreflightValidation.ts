import { readdir, stat } from 'fs/promises'
import path from 'path'
import { getCwd } from '../../utils/cwd.js'
import {
  extractLeadingCdCommand,
  normalizeForHostFs,
  resolveBashPathFrom,
} from './bashWorkdir.js'

/**
 * On Windows, Git Bash users routinely write absolute paths in POSIX form
 * (`/c/Users/...`, `/cygdrive/c/...`, `//server/share/...`). Node's
 * `fs.stat` on Windows cannot resolve these — it tries them literally and
 * reports ENOENT even when the directory clearly exists. We translate
 * before passing to fs operations so the preflight stops false-flagging
 * valid paths.
 *
 * Platform is a parameter (defaults to detected host) so tests can
 * exercise the Windows code path on any host.
 */
export const normalizeForFs = normalizeForHostFs

export type BashPreflightInput = {
  command: string
  workdir?: string
}

export type BashPreflightValidationResult =
  | { ok: true }
  | { ok: false; message: string }

function shellQuoteForHint(value: string): string {
  if (/^[A-Za-z0-9_./:\\-]+$/.test(value)) return value
  return `'${value.replace(/'/g, `'\\''`)}'`
}

async function pathExistsAsDirectory(path: string): Promise<boolean> {
  try {
    const info = await stat(path)
    return info.isDirectory()
  } catch {
    return false
  }
}

const resolveFrom = resolveBashPathFrom

function formatMissingWorkdirMessage(
  workdir: string,
  resolvedWorkdir: string,
): string {
  return [
    'Bash preflight blocked this command before execution.',
    '',
    'Reason:',
    `The requested workdir ${shellQuoteForHint(workdir)} does not exist (resolved to ${shellQuoteForHint(resolvedWorkdir)}).`,
    '',
    'Correction guidance:',
    '- Locate the real project directory before running the command.',
    "- For JavaScript projects, search for the manifest first: find .. -maxdepth 4 -name package.json -not -path '*/node_modules/*'",
    '- Retry with the correct workdir value instead of changing directories inside the command.',
    '',
    'The command was not executed.',
  ].join('\n')
}

function formatMissingCdTargetMessage(
  cdTarget: string,
  resolvedTarget: string,
  baseDir: string,
): string {
  return [
    'Bash preflight blocked this command before execution.',
    '',
    'Reason:',
    `The command starts with cd ${shellQuoteForHint(cdTarget)} && ..., but that directory does not exist from ${shellQuoteForHint(baseDir)}.`,
    `Resolved target: ${shellQuoteForHint(resolvedTarget)}`,
    '',
    'Correction guidance:',
    '- Verify the active directory and target before retrying: pwd && ls -la',
    "- If this is a subproject command, locate the manifest first: find .. -maxdepth 4 -name package.json -not -path '*/node_modules/*'",
    '- Prefer the Bash tool workdir parameter with the real directory instead of cd <dir> && <command>.',
    '',
    'The command was not executed.',
  ].join('\n')
}

// --- Script/manifest target preflight ---------------------------------------
// Catches the classic wrong-directory failure BEFORE execution: the model is
// at the project root, the file lives in a subdirectory (backend/server.js),
// and it runs `node server.js`. Instead of letting the shell fail with a bare
// ENOENT, we verify the target exists in the directory the command would run
// in — and when it doesn't, we locate it nearby and hand back the exact
// workdir/path to use.

const SCRIPT_INTERPRETERS = new Set([
  'node', 'nodejs', 'bun', 'deno', 'tsx', 'ts-node',
  'python', 'python3', 'python2', 'py', 'pypy', 'pypy3',
  'ruby', 'perl', 'php', 'lua',
  'bash', 'sh', 'zsh', 'dash', 'ksh',
  'pwsh', 'powershell',
])

const SCRIPT_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs', '.ts', '.mts', '.cts', '.tsx', '.jsx',
  '.py', '.rb', '.pl', '.php', '.lua', '.sh', '.bash', '.ps1',
])

// Flags that switch the interpreter to inline-code/module mode or consume the
// next token — a file argument can no longer be identified reliably.
const SCRIPT_BAILOUT_FLAGS = new Set(['-c', '-e', '-m', '-p', '--eval', '--print'])

const MANIFEST_RUNNERS = new Set(['npm', 'yarn', 'pnpm'])

// Subcommands that hard-require an existing package.json in the working
// directory. Deliberately narrow: `npm install <pkg>` can legitimately run
// without one (it creates it), so installs only count when bare.
const MANIFEST_SUBCOMMANDS = new Set(['run', 'start', 'test', 'build', 'dev', 'ci'])
const MANIFEST_BARE_INSTALL_SUBCOMMANDS = new Set(['install', 'i'])

// Directory names skipped while searching for a misplaced target. Hidden
// directories (leading dot) are skipped unconditionally.
const SKIPPED_SEARCH_DIRS = new Set([
  'node_modules', 'dist', 'build', 'out', 'coverage', 'target',
  'venv', '__pycache__', 'vendor',
])

function firstCommandSegment(command: string): string {
  return command.split(/&&|\|\||;|\||\n/)[0]?.trim() ?? ''
}

function tokenizeSegment(segment: string): string[] {
  const matches = segment.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? []
  return matches.map(token => token.replace(/^["']|["']$/g, ''))
}

function isDynamicToken(token: string): boolean {
  return /[*?$`{~<>]/.test(token)
}

/**
 * Extract the script-file target of the first command in a (possibly
 * compound) command line, or null when there is no statically checkable
 * file target. Conservative by design: any ambiguity returns null.
 */
export function extractScriptFileTarget(command: string): string | null {
  const tokens = tokenizeSegment(firstCommandSegment(command))
  let i = 0
  // Skip leading VAR=value environment assignments
  while (i < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i]!)) i++
  const head = tokens[i]
  if (!head || isDynamicToken(head)) return null

  // Direct relative execution: ./script.sh, ../tools/run.py
  if (/^\.\.?[\\/]/.test(head)) return head

  const headBase = head
    .replace(/\.exe$/i, '')
    .split(/[\\/]/)
    .pop()!
    .toLowerCase()
  if (!SCRIPT_INTERPRETERS.has(headBase)) return null
  i++
  // Run-style subcommand that takes a file (deno run x.ts, bun run x.ts)
  if ((headBase === 'deno' || headBase === 'bun') && tokens[i] === 'run') i++

  for (; i < tokens.length; i++) {
    const token = tokens[i]!
    if (SCRIPT_BAILOUT_FLAGS.has(token)) return null
    if (token.startsWith('-')) continue
    // First positional argument: only treat as a file when it looks like one
    if (isDynamicToken(token)) return null
    const ext = path.extname(token).toLowerCase()
    if (!SCRIPT_EXTENSIONS.has(ext)) return null
    return token
  }
  return null
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await stat(normalizeForFs(target))
    return true
  } catch {
    return false
  }
}

/**
 * Breadth-first search for a file name under rootDir. Bounded (depth,
 * directory count, match count) so it stays fast even in big repos.
 */
async function findFileCandidates(
  rootDir: string,
  fileName: string,
  { maxDepth = 4, maxDirs = 500, maxMatches = 3 } = {},
): Promise<string[]> {
  const fsRoot = normalizeForFs(rootDir)
  const wantLower = fileName.toLowerCase()
  const caseInsensitive = process.platform === 'win32'
  const matches: string[] = []
  const queue: Array<{ dir: string; depth: number }> = [{ dir: fsRoot, depth: 0 }]
  let visited = 0
  while (queue.length > 0 && visited < maxDirs && matches.length < maxMatches) {
    const { dir, depth } = queue.shift()!
    visited++
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      const matchesName = caseInsensitive
        ? entry.name.toLowerCase() === wantLower
        : entry.name === fileName
      if (entry.isFile() && matchesName) {
        matches.push(path.relative(fsRoot, path.join(dir, entry.name)))
        if (matches.length >= maxMatches) break
      } else if (
        entry.isDirectory() &&
        depth < maxDepth &&
        !entry.name.startsWith('.') &&
        !SKIPPED_SEARCH_DIRS.has(entry.name)
      ) {
        queue.push({ dir: path.join(dir, entry.name), depth: depth + 1 })
      }
    }
  }
  return matches
}

function formatCandidateLines(candidates: string[]): string[] {
  return candidates.map(candidate => {
    const dir = path.dirname(candidate)
    const workdirHint = dir === '.' ? '' : ` → re-run with workdir: ${shellQuoteForHint(dir)}`
    return `- ${candidate}${workdirHint}`
  })
}

function formatMissingScriptTargetMessage(
  target: string,
  resolvedTarget: string,
  baseDir: string,
  candidates: string[],
): string {
  const fileName = path.basename(normalizeForFs(target))
  const location =
    candidates.length > 0
      ? [`Found ${fileName} elsewhere under ${shellQuoteForHint(baseDir)}:`, ...formatCandidateLines(candidates)]
      : [`Searched nearby subdirectories of ${shellQuoteForHint(baseDir)}: no file named ${shellQuoteForHint(fileName)} exists there either.`]
  return [
    'Shell preflight blocked this command before execution.',
    '',
    'Reason:',
    `${shellQuoteForHint(target)} does not exist in ${shellQuoteForHint(baseDir)} (the directory this command would run in).`,
    `Resolved target: ${shellQuoteForHint(resolvedTarget)}`,
    '',
    ...location,
    '',
    'Correction guidance:',
    '- Re-run with the workdir parameter set to the directory that actually contains the file, or reference the file by the path listed above.',
    '- If the file lives somewhere else entirely, locate it first (e.g. Glob pattern **/' + fileName + ') instead of guessing paths.',
    '',
    'The command was not executed.',
  ].join('\n')
}

function formatMissingManifestMessage(
  runner: string,
  baseDir: string,
  candidates: string[],
): string {
  return [
    'Shell preflight blocked this command before execution.',
    '',
    'Reason:',
    `There is no package.json in ${shellQuoteForHint(baseDir)} (the directory this ${runner} command would run in), but one exists nearby:`,
    ...formatCandidateLines(candidates),
    '',
    'Correction guidance:',
    '- Re-run with the workdir parameter set to the directory that contains the right package.json.',
    '',
    'The command was not executed.',
  ].join('\n')
}

function extractManifestRunner(command: string): string | null {
  const tokens = tokenizeSegment(firstCommandSegment(command))
  let i = 0
  while (i < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i]!)) i++
  const head = tokens[i]?.toLowerCase()
  if (!head || !MANIFEST_RUNNERS.has(head)) return null
  const rest = tokens.slice(i + 1)
  // Global/prefixed/workspace invocations don't need a local manifest
  if (rest.some(t => ['-g', '--global', '--prefix', '-C', '-w', '--workspace'].includes(t))) {
    return null
  }
  const positionals = rest.filter(t => !t.startsWith('-'))
  const subcommand = positionals[0]?.toLowerCase()
  if (!subcommand) return null
  if (MANIFEST_SUBCOMMANDS.has(subcommand)) return head
  // Bare `npm install` / `yarn install` needs a manifest; `npm install <pkg>`
  // does not (it creates one).
  if (MANIFEST_BARE_INSTALL_SUBCOMMANDS.has(subcommand) && positionals.length === 1) {
    return head
  }
  return null
}

/**
 * Verify that the file/manifest a command targets actually exists in the
 * directory it will run in. Shared by BashTool and PowerShellTool so the
 * wrong-directory failure is caught before execution in both shells.
 */
export async function validateCommandTargetExists(
  command: string,
  baseDir: string,
): Promise<BashPreflightValidationResult> {
  const scriptTarget = extractScriptFileTarget(command)
  if (scriptTarget) {
    const resolvedTarget = resolveFrom(baseDir, scriptTarget)
    if (!(await pathExists(resolvedTarget))) {
      const fileName = path.basename(normalizeForFs(scriptTarget))
      const candidates = await findFileCandidates(baseDir, fileName)
      return {
        ok: false,
        message: formatMissingScriptTargetMessage(
          scriptTarget,
          resolvedTarget,
          baseDir,
          candidates,
        ),
      }
    }
  }

  const manifestRunner = extractManifestRunner(command)
  if (manifestRunner) {
    const manifestPath = resolveFrom(baseDir, 'package.json')
    if (!(await pathExists(manifestPath))) {
      const candidates = await findFileCandidates(baseDir, 'package.json', {
        maxDepth: 3,
      })
      // Only block when we can point at the right directory — a missing
      // manifest with nothing nearby may still be a legitimate invocation.
      if (candidates.length > 0) {
        return {
          ok: false,
          message: formatMissingManifestMessage(manifestRunner, baseDir, candidates),
        }
      }
    }
  }

  return { ok: true }
}

export async function validateBashExecutionPreflight(
  input: BashPreflightInput,
  cwd = getCwd(),
): Promise<BashPreflightValidationResult> {
  let baseDir = cwd

  if (input.workdir) {
    const resolvedWorkdir = resolveFrom(cwd, input.workdir)
    if (!(await pathExistsAsDirectory(resolvedWorkdir))) {
      return {
        ok: false,
        message: formatMissingWorkdirMessage(input.workdir, resolvedWorkdir),
      }
    }
    baseDir = resolvedWorkdir
  }

  let commandToCheck = input.command
  const leadingCd = extractLeadingCdCommand(input.command)
  if (leadingCd) {
    const resolvedTarget = resolveFrom(baseDir, leadingCd.target)
    if (!(await pathExistsAsDirectory(resolvedTarget))) {
      return {
        ok: false,
        message: formatMissingCdTargetMessage(leadingCd.target, resolvedTarget, baseDir),
      }
    }
    baseDir = resolvedTarget
    commandToCheck = leadingCd.remainder
  }

  return validateCommandTargetExists(commandToCheck, baseDir)
}
