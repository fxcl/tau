/**
 * Detached background (`&`) detection unit tests.
 *
 * Run: bun run src/tools/BashTool/backgroundDetachValidation.test.ts
 */

import { detectDetachedBackgroundPattern } from './backgroundDetachValidation.js'

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

function main(): void {
  console.log('background detach detection:')

  test('flags a server started with a trailing &', () => {
    assert(
      detectDetachedBackgroundPattern('node server.js &') !== null,
      'expected detached process to be flagged',
    )
  })

  test('flags detach followed by more commands', () => {
    assert(
      detectDetachedBackgroundPattern(
        'node server.js & sleep 2 && curl -s http://localhost:8080/api',
      ) !== null,
      'expected start-then-poll pattern to be flagged',
    )
  })

  test('flags nohup detach', () => {
    assert(
      detectDetachedBackgroundPattern('nohup python app.py &') !== null,
      'expected nohup detach to be flagged',
    )
  })

  test('flags detach without a space before &', () => {
    assert(
      detectDetachedBackgroundPattern('npm start&') !== null,
      'expected no-space detach to be flagged',
    )
  })

  test('allows && chains', () => {
    assert(
      detectDetachedBackgroundPattern('npm run build && npm test') === null,
      '&& must not be flagged',
    )
  })

  test('allows stderr redirection forms', () => {
    assert(
      detectDetachedBackgroundPattern('make 2>&1') === null,
      '2>&1 must not be flagged',
    )
    assert(
      detectDetachedBackgroundPattern('make &> build.log') === null,
      '&> must not be flagged',
    )
    assert(
      detectDetachedBackgroundPattern('exec 3<&0') === null,
      '<& must not be flagged',
    )
  })

  test('allows & inside quoted strings', () => {
    assert(
      detectDetachedBackgroundPattern('echo "fish & chips"') === null,
      'double-quoted & must not be flagged',
    )
    assert(
      detectDetachedBackgroundPattern("git commit -m 'a & b'") === null,
      'single-quoted & must not be flagged',
    )
  })

  test('allows job-control parallelism that ends with wait', () => {
    assert(
      detectDetachedBackgroundPattern('lint & typecheck & wait') === null,
      'jobs reaped by wait must not be flagged',
    )
  })

  test('bails out on heredocs', () => {
    assert(
      detectDetachedBackgroundPattern(
        'cat > run.sh <<EOF\nnode server.js &\nEOF',
      ) === null,
      'heredoc bodies must not be inspected',
    )
  })

  test('allows plain foreground commands', () => {
    assert(detectDetachedBackgroundPattern('node server.js') === null, 'plain command')
    assert(detectDetachedBackgroundPattern('ls -la | grep src') === null, 'pipeline')
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main()
