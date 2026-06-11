/**
 * Bash preflight validation unit tests.
 *
 * Run: bun run src/tools/BashTool/bashPreflightValidation.test.ts
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { normalizeForFs, validateBashExecutionPreflight } from './bashPreflightValidation.js'

let passed = 0
let failed = 0

async function test(name: string, fn: () => Promise<void>): Promise<void> {
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

async function main(): Promise<void> {
  console.log('bash preflight validation:')

  const root = mkdtempSync(join(tmpdir(), 'tau-bash-preflight-'))

  try {
    await test('blocks leading cd into a missing directory', async () => {
      const result = await validateBashExecutionPreflight(
        { command: 'cd frontend && npm run build' },
        root,
      )

      assert(!result.ok, 'expected missing cd target to be blocked')
      assert(
        !result.ok && result.message.includes('Bash preflight blocked'),
        `expected preflight message, got: ${result.ok ? 'ok' : result.message}`,
      )
      assert(
        !result.ok && result.message.includes('find .. -maxdepth 4 -name package.json'),
        'expected manifest search guidance',
      )
    })

    await test('allows leading cd when the directory exists', async () => {
      mkdirSync(join(root, 'frontend'))

      const result = await validateBashExecutionPreflight(
        { command: 'cd frontend && npm run build' },
        root,
      )

      assert(result.ok, 'expected existing cd target to pass')
    })

    await test('resolves cd target from provided workdir', async () => {
      const packages = join(root, 'packages')
      mkdirSync(packages)

      const result = await validateBashExecutionPreflight(
        { command: 'cd app && npm test', workdir: 'packages' },
        root,
      )

      assert(!result.ok, 'expected missing cd target under workdir to block')
      assert(
        !result.ok && result.message.includes('packages'),
        'expected workdir context in message',
      )
    })

    await test('blocks missing workdir before shell execution', async () => {
      const result = await validateBashExecutionPreflight(
        { command: 'npm run build', workdir: 'missing' },
        root,
      )

      assert(!result.ok, 'expected missing workdir to be blocked')
      assert(
        !result.ok && result.message.includes('requested workdir'),
        'expected missing workdir message',
      )
    })

    await test('does not block dynamic cd targets', async () => {
      const result = await validateBashExecutionPreflight(
        { command: 'cd "$PROJECT_DIR" && npm test' },
        root,
      )

      assert(result.ok, 'expected dynamic cd target to pass')
    })

    await test('normalizeForFs translates Git Bash drive paths on Windows', () => {
      assert(
        normalizeForFs('/c/Workspace/site/backend', 'windows') ===
          'C:\\Workspace\\site\\backend',
        'Git Bash drive form should convert',
      )
      assert(
        normalizeForFs('/d/projects', 'windows') === 'D:\\projects',
        'lowercase drive letter should uppercase',
      )
    })

    await test('normalizeForFs translates Cygwin and UNC paths on Windows', () => {
      assert(
        normalizeForFs('/cygdrive/c/Users/foo', 'windows') === 'C:\\Users\\foo',
        'Cygwin form should convert',
      )
      assert(
        normalizeForFs('//server/share/path', 'windows') === '\\\\server\\share\\path',
        'UNC form should convert',
      )
    })

    await test('normalizeForFs leaves non-POSIX paths untouched on Windows', () => {
      assert(
        normalizeForFs('C:\\Users\\foo', 'windows') === 'C:\\Users\\foo',
        'native Windows path unchanged',
      )
      assert(
        normalizeForFs('backend', 'windows') === 'backend',
        'relative path unchanged',
      )
      assert(
        normalizeForFs('./backend/sub', 'windows') === './backend/sub',
        'dot-relative path unchanged',
      )
    })

    await test('normalizeForFs is a no-op on non-Windows hosts', () => {
      assert(
        normalizeForFs('/c/Users/foo', 'linux') === '/c/Users/foo',
        'Linux should not rewrite — /c/ is a real directory name',
      )
      assert(
        normalizeForFs('/c/Users/foo', 'macos') === '/c/Users/foo',
        'macOS should not rewrite',
      )
    })

    await test('preflight accepts Git Bash POSIX cd target on Windows', async () => {
      // Repro of the original bug: cwd is a tmpdir, command does
      // `cd <gitbash-form-of-cwd>/subdir && ...`. Pre-fix this returned
      // !ok with "does not exist"; post-fix it should resolve correctly.
      if (process.platform !== 'win32') return

      const sub = join(root, 'backend')
      mkdirSync(sub, { recursive: true })

      // Build the POSIX-style absolute path the way Git Bash users write it.
      // `C:\Users\...\tmpX\backend` → `/c/Users/.../tmpX/backend`
      const driveMatch = sub.match(/^([A-Za-z]):(.*)$/)
      if (!driveMatch) return
      const posixForm =
        '/' + driveMatch[1]!.toLowerCase() + driveMatch[2]!.replace(/\\/g, '/')

      const result = await validateBashExecutionPreflight(
        { command: `cd ${posixForm} && ls -la` },
        root,
      )

      assert(result.ok, `expected POSIX cd target to be accepted on Windows; got: ${result.ok ? 'ok' : result.message}`)
    })
    await test('blocks script run from wrong directory and suggests workdir', async () => {
      const api = join(root, 'api')
      mkdirSync(api, { recursive: true })
      writeFileSync(join(api, 'server.js'), '// fixture')

      const result = await validateBashExecutionPreflight(
        { command: 'node server.js' },
        root,
      )

      assert(!result.ok, 'expected missing script target to be blocked')
      assert(
        !result.ok && result.message.includes('does not exist'),
        `expected missing-target reason, got: ${result.ok ? 'ok' : result.message}`,
      )
      assert(
        !result.ok && result.message.includes('workdir'),
        'expected workdir suggestion',
      )
      assert(
        !result.ok && result.message.includes('api'),
        'expected the real directory in the suggestion',
      )
    })

    await test('allows script run when the file exists in the execution dir', async () => {
      const result = await validateBashExecutionPreflight(
        { command: 'node server.js', workdir: 'api' },
        root,
      )

      assert(
        result.ok,
        `expected existing script target to pass, got: ${result.ok ? 'ok' : result.message}`,
      )
    })

    await test('allows script referenced by its correct relative path', async () => {
      const result = await validateBashExecutionPreflight(
        { command: 'node api/server.js' },
        root,
      )

      assert(result.ok, 'expected correct relative path to pass')
    })

    await test('blocks missing script and reports nothing found nearby', async () => {
      const result = await validateBashExecutionPreflight(
        { command: 'python does_not_exist_anywhere.py' },
        root,
      )

      assert(!result.ok, 'expected missing script to be blocked')
      assert(
        !result.ok && result.message.includes('Searched nearby subdirectories'),
        'expected not-found-nearby message',
      )
    })

    await test('does not block dynamic or non-file script arguments', async () => {
      const dynamic = await validateBashExecutionPreflight(
        { command: 'node "$SCRIPT_PATH"' },
        root,
      )
      assert(dynamic.ok, 'dynamic argument must pass')

      const inlineCode = await validateBashExecutionPreflight(
        { command: 'python -c "print(1)"' },
        root,
      )
      assert(inlineCode.ok, 'inline code must pass')

      const plainCommand = await validateBashExecutionPreflight(
        { command: 'git status' },
        root,
      )
      assert(plainCommand.ok, 'non-interpreter command must pass')
    })

    await test('blocks npm command when package.json is only in a subdirectory', async () => {
      writeFileSync(join(root, 'api', 'package.json'), '{}')

      const result = await validateBashExecutionPreflight(
        { command: 'npm install' },
        root,
      )

      assert(!result.ok, 'expected manifest preflight to block')
      assert(
        !result.ok && result.message.includes('package.json'),
        'expected manifest reason',
      )
      assert(
        !result.ok && result.message.includes('api'),
        'expected the manifest directory in the suggestion',
      )
    })

    await test('allows npm command when package.json exists in the execution dir', async () => {
      const result = await validateBashExecutionPreflight(
        { command: 'npm install', workdir: 'api' },
        root,
      )

      assert(result.ok, 'expected manifest in workdir to pass')
    })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main()
