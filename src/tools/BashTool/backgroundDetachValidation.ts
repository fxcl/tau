/**
 * Detect commands that detach a process with a raw `&`.
 *
 * Detached processes are invisible to Tau's task tracking — they cannot be
 * listed or stopped later, and they keep holding ports and file locks (the
 * classic source of "Device or resource busy" retry loops when the model
 * later tries to restart a server or delete its database).
 * `run_in_background` gives the same concurrency with a tracked, killable
 * task, so a raw `&` is blocked with that redirection.
 *
 * Conservative by design — false blocks are worse than misses:
 * - bails out entirely on heredocs (their bodies may legitimately contain `&`)
 * - ignores `&` inside single- or double-quoted strings
 * - ignores `&&`, `|&`, and redirection forms (`2>&1`, `&>`, `<&`)
 * - allows job-control parallelism that reaps its jobs with `wait`
 */
export function detectDetachedBackgroundPattern(command: string): string | null {
  // Heredoc bodies may contain `&` as data (e.g. writing a script); skip the
  // whole check rather than risk a false block.
  if (/<<-?\s*['"]?\w+/.test(command)) return null

  // Strip quoted segments so `echo "fish & chips"` is not flagged.
  const stripped = command
    .replace(/'[^']*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')

  // `wait` reaps the background jobs before the command returns — that is
  // intentional in-command parallelism, nothing stays detached.
  if (/(^|[\s;&|(])wait([\s;)]|$)/.test(stripped)) return null

  // A background `&`: not `&&`, not `|&`, not redirection (`>&`, `&>`, `<&`).
  if (!/(?<![&><|])&(?![&>])/.test(stripped)) return null

  return 'this command detaches a process with a raw `&`'
}
