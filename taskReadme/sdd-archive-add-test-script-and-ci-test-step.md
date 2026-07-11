# sdd-archive — add-test-script-and-ci-test-step

## Metadata

- **change_id**: add-test-script-and-ci-test-step
- **archived_at**: 2026-07-10
- **project**: tau (multi-provider AI coding CLI, v0.92.12)
- **repo**: /Users/vec/workspace/js/PI/tau
- **repo_head_at_archive**: 125b8bf21225c83b208270f9ec0ccce036a890ac (master, v0.92.12)
- **phase_executor_model**: cc-router-via-yesmem/model-haiku (prep/survey tier)
- **phase_role**: prep (archive is a prep role; no review pass)
- **artifact_store**: hybrid (taskReadme = filesystem truth, Engram mirror)
- **engram_mirror_status**: ok (5/5 phase artifacts mirrored — see lineage)

## Lineage

| Phase | Artifact | Bytes | Engram learning # |
|-------|----------|-------|-------------------|
| propose  | taskReadme/sdd-propose-add-test-script-and-ci-test-step.md | 6164  | #5923 |
| spec     | taskReadme/sdd-spec-add-test-script-and-ci-test-step.md    | 3594  | #5924 |
| design   | taskReadme/sdd-design-add-test-script-and-ci-test-step.md  | 6706  | #5925 |
| tasks    | taskReadme/sdd-tasks-add-test-script-and-ci-test-step.md   | 3164  | #5926 |
| apply    | (in-place: package.json + .github/workflows/ci.yml)         | +1 / +25 lines | n/a (in-tree) |
| verify   | (inline in this archive §Closure verdict)                   | n/a   | n/a |
| **archive** | taskReadme/sdd-archive-add-test-script-and-ci-test-step.md | this file | #5927 (this write) |

## Closure verdict

**PASS** (verify-code, structural check on haiku; not self-graded for quality, only structural conformance)

- 5/5 spec SCN verifications pass via grep/cat/git-diff quoted outputs.
- 2/2 design hunks applied byte-for-byte (proven by `git diff` quoted).
- `git diff --name-only` returns exactly two files: `package.json`, `.github/workflows/ci.yml` — no scope creep.
- JSON / YAML structural validity confirmed via `node -e` quoted output.
- `bun test` exit code = 1 due to **3 pre-existing failures in `src/utils/treesitter/validateEdit.test.ts`**, which is **unrelated to this change** (no `.test.ts` files were modified). Per spec acceptance criteria, this is a non-blocking baseline failure, not a regression.

## Code changes (summary)

- `package.json` (+1 line): added `"test": "bun test"` to `scripts`.
- `.github/workflows/ci.yml` (+25 lines): inserted new top-level `unit-tests:` job before the existing `test:` job, with matrix `{ubuntu-latest, macos-latest}` and 3 steps (Checkout / Setup Bun / Run bun test).

## Follow-up items (NOT in this PR)

1. **Investigate `src/utils/treesitter/validateEdit.test.ts` failures** (3 cases): `flags an edit that introduces a syntax error (.ts)`, `flags a broken new file (.tsx)`, `flags a broken edit (.py)`. Likely a real test bug or a treesitter-wasm API drift. Track as separate issue; this PR explicitly does not chase.
2. **Decide on coverage tool** — sdd-init §9 marked this as "needs user decision". Out of scope for this PR.
3. **Decide on pre-commit hook** — same; out of scope.
4. **Pin `bun-version` to a specific version** — after `unit-tests` job is green for ~2 weeks, replace `bun-version: latest` with a pinned version. Tracked here as design §Open questions.
5. **Add `bun install` step to `unit-tests` job** — only if real-world CI surfaces module resolution failures (current hypothesis: not needed; bun reads `bun.lock` directly).

## Next recommended

`ready_to_commit_and_pr`. The preflight `chained_pr_strategy = single PR per task` will be enacted by the user/orchestrator. Do **NOT** commit, push, create branch, or open PR from this archive lane — that is gated by preflight contract.

— end of archive —
