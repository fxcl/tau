# sdd-tasks — fu-1-treesitter-baseline-fix

## Metadata

- **created_at**: 2026-07-10T23:30:00Z
- **change_id**: `fu-1-treesitter-baseline-fix`
- **session_id**: `sdd-tasks-fu-1-treesitter-baseline-fix`
- **producer_model**: `cc-router-via-yesmem/model-haiku`
- **preflight_ref**: `/Users/vec/workspace/js/pi/tau/taskReadme/sdd-preflight-tau-2026-07-10-session-2.md`
- **spec_ref**: `/Users/vec/workspace/js/pi/tau/taskReadme/sdd-spec-fu-1-treesitter-baseline-fix.md`
- **design_ref**: `/Users/vec/workspace/js/pi/tau/taskReadme/sdd-design-fu-1-treesitter-baseline-fix.md`
- **propose_ref**: `/Users/vec/workspace/js/pi/tau/taskReadme/sdd-propose-fu-1-treesitter-baseline-fix.md`
- **engram_mirror_id**: `#5951` (decision card, project=tau, written 2026-07-10T23:30Z; chain: propose #5949 → design #5950 → tasks #5951; spec learning id collision noted per design §Metadata — supersedes propose via same id pool)

---

## 1. Apply stage tasks (executable checklist)

Numbered, atomic, each ≤ 5 minutes.

- **T-01** [apply-code, opus]: Edit `.github/workflows/ci.yml` to insert the new step after the `with:` block of `Setup Bun` and before `- name: Run bun test`. Exact YAML (preserve 6-space indent under `steps:`, matching existing Checkout / Setup Bun / Run bun test step style):

  ```yaml
        - name: Install dependencies
          run: bun install --frozen-lockfile
  ```

  Plus one blank line above the new step to match existing step spacing (the blank line lives between `Setup Bun` and the new `Install dependencies` step, and another blank line lives between the new step and `Run bun test`). Verify the inserted step name string literally equals `Install dependencies` (per design §2.3, matching `grep -A 1 'Install dependencies'` AC-3 verify command).

- **T-02** [apply-code, opus]: Run `git diff .github/workflows/ci.yml` to confirm the diff shows ≤ 3 added lines (2 YAML lines + 1 blank separator) and 0 removed lines. The diff must not include any other file.

- **T-03** [apply-code, opus]: Do NOT touch any other file. Verify with `git status` after edit — the only modified path must be `.github/workflows/ci.yml`. The 8 forbidden files (`validateEdit.ts`, `validateEdit.test.ts`, `parser.ts`, `FileEditTool.ts`, `package.json`, `bun.lock`, `package-lock.json`, `native/`) must all show no working-tree change.

- **T-04** [apply-unit-tests (optional but recommended), opus]: Run the pre-commit GREEN gate locally:
  ```
  cd $REPO && rm -rf node_modules && bun install --frozen-lockfile && bun run src/utils/treesitter/validateEdit.test.ts
  ```
  EXPECT: exit code 0, stdout reports `6 passed, 0 failed` (per AC-1). This is local GREEN-phase verification before push (design §5 V-2 + spec §AC-1). If lockfile drift is detected (`bun install --frozen-lockfile` exits non-zero before tests even run), STOP and escalate per spec §R2.

- **T-05** [verify-units, sonnet]: Run V-1..V-3 from design §5 (or the subset feasible locally — no CI access from this session). Specifically:
  - V-2: `bun run src/utils/treesitter/validateEdit.test.ts; echo "exit=$?"` → expect `6 passed, 0 failed`, exit 0.
  - V-3: `bun test` (full suite) → expect pass count 比 baseline 多 3, 其余 85 个文件状态不变。
  - V-1 (preflight verify-units): `rm -rf node_modules && bun install --frozen-lockfile` → expect exit 0（lockfile ↔ package.json 尚未漂移）。
  Document exit codes and `bun test` summary in the verify-units artifact (`taskReadme/sdd-verify-units-fu-1-treesitter-baseline-fix.md`, created at verify stage — NOT this task to create the file).

- **T-06** [verify-code, sonnet]: Review the apply result against spec §REQ-1..REQ-5 and AC-1..AC-5. Quote `ci.yml` diff verbatim in the verify-code artifact. Specifically:
  - V-4 (AC-3): `awk '/^  unit-tests:/,/^  [a-zA-Z]/' .github/workflows/ci.yml | grep -c '^    - name:'` → expect `4`.
  - V-5 (AC-4): `git diff --stat <base>..HEAD` → expect only `.github/workflows/ci.yml | 3 ++` (or equivalent ≤ 8 行), other 8 forbidden files absent.
  - V-6 (AC-4 延续): `git diff bun.lock && echo "exit=$?"` → expect empty output, exit 0.
  - V-7 (AC-5): `node -e "import('web-tree-sitter').then(() => console.log('ok')).catch(e => { console.error(e.message); process.exit(1) })"` → expect stdout `ok`, exit 0.
  - V-8 (REQ-5): `awk '/^  test:/,/^  [a-zA-Z]/' .github/workflows/ci.yml` → expect `test:` job step 序列与 HEAD 完全一致。

- **T-07** [gh-specialist, pty-aware]: Commit + push per design §6 chained-PR split:
  - **C-1** (`branching` state): only taskReadme files (`taskReadme/sdd-propose-fu-1-treesitter-baseline-fix.md`, `taskReadme/sdd-spec-fu-1-treesitter-baseline-fix.md`, `taskReadme/sdd-design-fu-1-treesitter-baseline-fix.md`, `taskReadme/sdd-tasks-fu-1-treesitter-baseline-fix.md`). Use commit message:
    ```
    docs(sdd): propose/spec/design/tasks for fu-1-treesitter-baseline-fix

    Adds the four phase artifacts that capture the diagnosis (env-only,
    SUT and test are correct) and the locked fix path (single CI step).

    No product/code changes in this commit; only taskReadme/.
    ```
  - **C-2** (`pushing` state): only `.github/workflows/ci.yml` (2 YAML lines + 1 blank = 3 lines git-diff). Use commit message:
    ```
    feat(ci): add `bun install --frozen-lockfile` step to unit-tests job

    Inserts the Install dependencies step between Setup Bun and
    Run bun test (spec REQ-1, design §2.1). Verifies:
      - awk '/^  unit-tests:/,/^  [a-zA-Z]/' .github/workflows/ci.yml
        | grep -c '^    - name:'   -> 4
      - bun run src/utils/treesitter/validateEdit.test.ts
        -> 6 passed, 0 failed
      - git diff bun.lock          -> empty

    Resolves: FU-1 (3 treesitter baseline failures, env-only) +
              FU-5 (missing install step), same root cause.
    ```
  - **C-3** (`pushing_docs` state): only `taskReadme/sdd-archive-fu-1-treesitter-baseline-fix.md` + 可选对 `taskReadme/sdd-init-tau-2026-07-10-session-2.md` §10.3 的 FU-1/FU-5 行做"已勾掉"的标注。Use commit message:
    ```
    docs(sdd): archive fu-1-treesitter-baseline-fix and tick FU-1/FU-5

    Closes the follow-up loop. Archive confirms 6/6 treesitter tests
    pass and 88/88 in bun test.
    ```

  Push C-1 first, then C-2, then C-3. C-1 must come first (only taskReadme); C-2 must come after T-04 GREEN gate passes.

- **T-08** [gh-specialist, pty-aware]: After C-2 push and C-3 push, do NOT create the PR yet — the PR is created at the `pr` state after archive (T-09 below) completes. This task explicitly defers PR creation to T-10.

- **T-09** [archive, haiku]: Mark archive `taskReadme/sdd-archive-fu-1-treesitter-baseline-fix.md`. Tick FU-1 and FU-5 in `taskReadme/sdd-init-tau-2026-07-10-session-2.md` §10.3 follow-up table. Reference engram mirror ids in the archive file (see §7 below).

- **T-10** [gh-specialist, pty-aware]: Create PR via `gh pr create --base develop --head <branch>`. PR title: `feat(ci): install deps step for unit-tests job (fu-1+fu-5)`. PR body should reference design §1 Approach and §2.1.c (post-insertion YAML). Fallback to `--base master` if `origin/develop` does not exist (probe first per preflight §3 chained_pr_strategy).

---

## 2. Task → verification cross-table

| Task | Spec REQ(s) | Spec AC(s) | Design Verify Command(s) |
|------|-------------|------------|--------------------------|
| T-01 | REQ-1 | AC-1, AC-3 | (insertion itself) |
| T-02 | REQ-4 | AC-4 | V-5 (git diff --stat) |
| T-03 | REQ-4 | AC-4 | (git status check) |
| T-04 | REQ-2 | AC-1 | V-1 (preflight install) + V-2 (validateEdit 6/6) |
| T-05 | REQ-2, REQ-3 | AC-2, AC-3 | V-2, V-3 |
| T-06 | REQ-1..REQ-5 | AC-1..AC-5 | V-4, V-5, V-6, V-7, V-8 |
| T-07 | (chained-PR policy) | (commit split) | (git log shows 3 commits in order) |
| T-08 | (chained-PR policy) | (PR not yet) | (no PR exists yet) |
| T-09 | (archive policy) | (follow-up tick) | (init §10.3 FU-1/FU-5 marked) |
| T-10 | (chained-PR policy) | (PR created) | (gh pr view shows PR open) |

---

## 3. Execution order

Explicit order with rationale:

1. **T-01 → T-02 → T-03** (apply in one shot): Edit ci.yml, then immediately sanity-check the diff shape (`git diff`) and that no other file changed (`git status`). Each ≤ 1 minute.
2. **T-04** (local GREEN before push): Pre-commit green gate — run the install + targeted test locally. If this fails, the diff is wrong; STOP and re-diagnose. The push in T-07 C-2 is gated on T-04 passing.
3. **T-07 C-1** (docs-only commit): Push the 4 taskReadme artifacts first per design §6 C-1. This isolates phase artifacts from code change for reviewer convenience. C-1 is independent of C-2 and can be done in parallel with T-04 (both gate T-07 C-2).
4. **T-07 C-2** (pushing): Only after T-04 passes. Push the 2-line ci.yml insertion.
5. **T-05** (verify-units after push, before archive): Sonnet reviewer runs V-1..V-3 (or feasible subset) on the pushed branch state. Document results.
6. **T-06** (verify-code after verify-units, before archive): Sonnet reviewer runs V-4..V-8 against the diff. Quote diff verbatim.
7. **T-09** (archive after both verifies pass): Haiku marks the archive file and ticks FU-1/FU-5 in init §10.3.
8. **T-07 C-3** (pushing_docs): Only if archive (T-09) is ready. Push the archive + follow-up tick as the final commit.
9. **T-08** (deferred — explicit no-op): Confirm C-2 and C-3 have been pushed; do not create PR yet.
10. **T-10** (PR — only after all 3 commits): `gh pr create --base develop` (fallback master).

Rationale: T-04 is the GREEN-phase TDD gate before any commit. C-1 is docs-only and safe to land first (lets reviewer see phase artifacts in isolation). C-2 carries the actual fix; gated on T-04. Verify stages must complete before archive, and archive must precede PR (so PR body can reference the closed follow-up).

---

## 4. Blocking conditions

List explicit conditions that block progression:

- **T-01 fails** if AC-1 verify (`grep -A 1 'Install dependencies' .github/workflows/ci.yml`) does not show the new step (literal string match for `Install dependencies`), OR the inserted `run:` line is not exactly `bun install --frozen-lockfile` (no extra flags, no `&&` chains, no `||` fallbacks — spec §REQ-1 verbatim).
- **T-02 fails** if `git diff .github/workflows/ci.yml` shows > 3 added lines OR any removed lines OR modifications to other files.
- **T-03 fails** if `git status` shows any path other than `.github/workflows/ci.yml` as modified, OR if any of the 8 forbidden files appears in the diff (byte-count must be 0 per spec §AC-4 / §REQ-4).
- **T-04 fails** if `bun run src/utils/treesitter/validateEdit.test.ts` exits non-zero, OR if the output is not `6 passed, 0 failed` (still 3/6 means install did not resolve web-tree-sitter correctly), OR if `bun install --frozen-lockfile` itself exits non-zero (lockfile drift per spec §R2 — STOP and escalate, do not retry with flags).
- **T-05 fails** if `bun test` (full suite) does not show pass count +3 vs baseline, OR if any non-treesitter test changes state from pass→fail.
- **T-06 fails** if V-4 step count is not `4`, OR if V-5 diff exceeds 8 lines, OR if any of the 8 forbidden files show byte-count change, OR if V-7 cannot import `web-tree-sitter`, OR if V-8 shows `test:` job step sequence mutated.
- **T-07 fails** if commits are not in C-1 → C-2 → C-3 order, OR if any commit touches files outside its designated set (e.g., C-2 touching a taskReadme file means C-1 / C-3 boundaries violated).
- **T-09 fails** if `taskReadme/sdd-init-tau-2026-07-10-session-2.md` §10.3 FU-1 / FU-5 lines are not visibly ticked (or annotated as resolved), OR if archive file does not reference the engram mirror ids.
- **T-10 fails** if base branch is not `develop` (fallback `master` only when origin/develop absent), OR if PR body lacks reference to design §2.1.c.

---

## 5. Notes for downstream agents

- **gh-specialist** must use `gh` CLI only (not raw `git` for branching/PR per coordinador policy + design §6 note). Branching: `gh repo sync` or `git fetch origin develop` may be used for probing, but PR creation must be `gh pr create`.
- **verify-units** must run locally (no CI access from this session). The verify-units lane only has shell + repo access, not GitHub Actions. T-04 already provides the local GREEN signal; T-05 records the post-merge verification.
- **archive** must reference engram mirror ids:
  - `#5949` (propose decision card, project=tau, written 2026-07-10T22:00Z)
  - `#5949` (spec — id collision noted per design §Metadata; supersedes propose via same id pool, see propose §11 注)
  - `#5950` (design decision card, project=tau, written 2026-07-10T23:00Z)
  - New tasks engram id (filled in §7 below after `yesmem_remember` call)
- **T-04 is optional but recommended.** If the apply lane chooses to skip T-04 (e.g., to save time), then T-05 / T-06 MUST both run before T-09 (archive) — there is no skipping verify stages. The recommendation is to run T-04 so C-2 only ships with confirmed GREEN.
- **C-2 + C-3 are code-only / docs-only respectively.** The PR body must clearly call out which commit is which so reviewer can review the ci.yml diff in isolation.

---

## 6. Lineage and citations

| 来源 | 引用位置 | 用于 |
|---|---|---|
| `taskReadme/sdd-preflight-tau-2026-07-10-session-2.md` §1, §3, §4, §Supersession | §1, §3, §5 | heavy-SDD + chained-PR + full-GAN constraints; producer/reviewer tier mapping (tasks=haiku, verify=sonnet, apply=opus); commit split policy |
| `taskReadme/sdd-spec-fu-1-treesitter-baseline-fix.md` §REQ-1..REQ-5, §AC-1..AC-5, §R1, §R2, §R3 | §1, §2, §4 | 5 REQ verbatim + 5 AC verbatim; risk constraints; REQ-4 byte-count locks the 8 forbidden files |
| `taskReadme/sdd-design-fu-1-treesitter-baseline-fix.md` §1, §2.1 (a/b/c/d), §3 T1/T2/T3, §5 V-1..V-8, §6 C-1/C-2/C-3 | §1, §2, §3, §4, §5 | YAML insertion (literal); verify commands (V-1..V-8); chained-PR commit messages |
| `taskReadme/sdd-propose-fu-1-treesitter-baseline-fix.md` §2.4 候选 A, §6 A1..A7, §7.1, §9.1, §11 | §1, §5, §6 | root cause (env-only); verbatim failure output; acceptance criteria (A1–A7); engram mirror id #5949 |
| `taskReadme/sdd-archive-add-test-script-and-ci-test-step.md` §Closure verdict, §Follow-up items 1 & 5 | §1 | verbatim failure case names; FU-5 merge rationale |
| `taskReadme/sdd-init-tau-2026-07-10-session-2.md` §10.3 follow-up table | §1 (T-09) | FU-1 / FU-5 tick target |
| `.github/workflows/ci.yml` lines 21–39 (pre-insertion `unit-tests` job) | §1 (T-01) | current step sequence; insertion target lines |
| design §2.1.a verbatim YAML block (lines 21–39) | §1 (T-01) | pre-insertion `unit-tests` job verbatim |
| design §2.1.b exact YAML to insert | §1 (T-01) | the 2 lines to insert |
| design §2.1.c post-insertion YAML (lines 21–43 post-change) | §1 (T-01) | target state after apply |
| design §5 V-1..V-8 verify commands | §2, §4 | verification cross-table; blocking conditions |

---

## 7. Engram mirror

`yesmem_remember` invocation summary:

```
project = "tau"
category = "decision"
text = "sdd-tasks fu-1-treesitter-baseline-fix: 10 atomic tasks (T-01..T-10). T-01..T-03 apply-code (opus) edits .github/workflows/ci.yml inserting `bun install --frozen-lockfile` step between Setup Bun and Run bun test. T-04 local GREEN gate via validateEdit.test.ts (6 passed 0 failed). T-05 verify-units (sonnet) runs V-1..V-3. T-06 verify-code (sonnet) runs V-4..V-8 against spec REQ-1..REQ-5 / AC-1..AC-5. T-07 gh-specialist commits C-1 (docs-only taskReadme) -> C-2 (ci.yml) -> C-3 (archive + FU-1/FU-5 tick). T-08 defers PR. T-09 archive haiku marks archive file and ticks init §10.3. T-10 gh-specialist creates PR with --base develop (fallback master). Blocking: any 8 forbidden file byte-count change, V-4 step count != 4, diff > 8 lines, lockfile drift. chain: preflight -> propose (#5949) -> spec (collision) -> design (#5950) -> tasks (this). 0 open questions per spec §R3."
keywords = treesitter, FU-1, FU-5, ci.yml, bun-install, frozen-lockfile, validateEdit, tasks, haiku, chained-PR, full-GAN
anticipated_queries = sdd-tasks fu-1-treesitter-baseline-fix; insert bun install --frozen-lockfile ci.yml unit-tests tasks checklist; FU-1 FU-5 chained-PR commit split; tau taskReadme sdd-tasks-fu-1
```

Resulting Engram learning id: **`#5951`** (filled by `yesmem_remember` 2026-07-10T23:30Z, category=decision, project=tau). Synced with §Metadata `engram_mirror_id`.

---

**result: done**

— end of tasks —