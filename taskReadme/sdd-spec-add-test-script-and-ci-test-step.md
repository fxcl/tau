# sdd-spec — add-test-script-and-ci-test-step

## Metadata

- **change_id**: add-test-script-and-ci-test-step
- **created_at**: 2026-07-10
- **project**: tau (multi-provider AI coding CLI, v0.92.12)
- **repo**: /Users/vec/workspace/js/PI/tau
- **phase_executor_model**: cc-router/model-opus (production tier; inline-written after two sdd-spec sub-agent invocations returned empty task_result)
- **phase_role**: production (GAN: reviewed later by sonnet)
- **predecessor**: taskReadme/sdd-propose-add-test-script-and-ci-test-step.md
- **artifact_store**: hybrid (taskReadme = filesystem truth, Engram mirror)
- **review_budget**: 1

## Requirements

- **REQ-1**: `package.json` MUST contain a `scripts.test` entry that invokes the bun test runner against the project test files.
- **REQ-2**: Running `npm test` at the repo root MUST trigger bun against all `src/**/*.test.ts` files (or, if `npm` is unavailable, the script MUST be invokable through `bun run test` with the same effect).
- **REQ-3**: `.github/workflows/ci.yml` MUST contain a new CI job, distinct from the existing build+smoke job, that runs the unit tests.
- **REQ-4**: The new CI job MUST execute on `ubuntu-latest` and `macos-latest` runners; Windows is explicitly excluded (per proposal §Out of scope).
- **REQ-5**: The change MUST NOT modify `bun.lock`, `package-lock.json`, any file under `src/`, or any other CI job in `.github/workflows/ci.yml`.

## Scenarios

- **SCN-1** (covers REQ-1, REQ-2): Given a fresh checkout, When the maintainer inspects `package.json`, Then `scripts.test` is set to a command that invokes the bun test runner. Verify: `grep -n '"test"' package.json` returns a non-empty hit, and `npm test` (or `bun run test`) exits 0 OR exits non-zero with a baseline failure that is documented in a follow-up issue.
- **SCN-2** (covers REQ-3): Given `.github/workflows/ci.yml`, When the file is read, Then there is a top-level job whose key is `unit-tests` (distinct from the existing build+smoke `test:` job). Verify: `grep -nE '^\s*unit-tests:' .github/workflows/ci.yml` returns a non-empty hit.
- **SCN-3** (covers REQ-4): Given the `unit-tests` job, When its `runs-on` / matrix is read, Then the runner set is exactly `{ubuntu-latest, macos-latest}` and does NOT include `windows-latest`. Verify: the `unit-tests` job's matrix enumerates those two OS values and Windows is absent.
- **SCN-4** (covers REQ-3): Given the `unit-tests` job steps, When read, Then the steps include (a) an action that installs bun on the runner, and (b) a step whose `run:` value is `bun test` (the binary, not `npm test`, so a broken `node_modules` cannot mask a real failure). Verify: `grep -nE 'bun test' .github/workflows/ci.yml` returns a hit inside the new job's steps.
- **SCN-5** (covers REQ-5): Given `git status` after the apply, When `git diff --name-only` is run, Then the output is exactly two lines: `package.json` and `.github/workflows/ci.yml`.

## Acceptance criteria

- The two file edits exist and match the design diff hunks byte-for-byte.
- `npm test` (or `bun run test`) exits 0, OR exits non-zero with a baseline failure that is NOT introduced by this change (per proposal §Risks, first-run failures become a follow-up issue; the spec does NOT require all 88 tests pass).
- `git diff --name-only` shows exactly two files: `package.json` and `.github/workflows/ci.yml`.
- No lint, coverage, or build commands need to succeed (none are configured).
- All 5 SCN verifications can be reproduced from a clean shell with `grep` / `cat` / `git diff` / `npm test` (or `bun run test`).

— end of spec —
