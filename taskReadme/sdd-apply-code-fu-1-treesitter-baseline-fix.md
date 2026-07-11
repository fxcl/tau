# sdd-apply-code — fu-1-treesitter-baseline-fix

## Metadata

- **created_at**: 2026-07-10T23:45:00Z
- **change_id**: `fu-1-treesitter-baseline-fix`
- **session_id**: `sdd-apply-code-fu-1-treesitter-baseline-fix`
- **producer_model**: `cc-router/model-opus`
- **preflight_ref**: `/Users/vec/workspace/js/pi/tau/taskReadme/sdd-preflight-tau-2026-07-10-session-2.md`
- **propose_ref**: `/Users/vec/workspace/js/pi/tau/taskReadme/sdd-propose-fu-1-treesitter-baseline-fix.md`
- **spec_ref**: `/Users/vec/workspace/js/pi/tau/taskReadme/sdd-spec-fu-1-treesitter-baseline-fix.md`
- **design_ref**: `/Users/vec/workspace/js/pi/tau/taskReadme/sdd-design-fu-1-treesitter-baseline-fix.md`
- **tasks_ref**: `/Users/vec/workspace/js/pi/tau/taskReadme/sdd-tasks-fu-1-treesitter-baseline-fix.md`
- **engram_mirror_id**: pending (after yesmem_remember)

---

## 1. Pre-edit state

**Git status pre-edit:**
```
M .github/workflows/ci.yml
M package.json
?? .aiwork/2026-07-09_tau-architecture-docs/architecture.md
?? .aiwork/2026-07-09_tau-architecture-docs/implementation.md
?? .aiwork/2026-07-09_tau-architecture-docs/notes.md
?? .aiwork/2026-07-09_tau-architecture-docs/research.md
?? .atl/skill-registry.md
?? .worktrees/tau-arch-research/
?? CLAUDE.md
?? PROMPTS.md
?? taskReadme/sdd-archive-add-test-script-and-ci-test-step.md
?? taskReadme/sdd-design-add-test-script-and-ci-test-step.md
?? taskReadme/sdd-design-fu-1-treesitter-baseline-fix.md
?? taskReadme/sdd-init-tau-2026-07-10-session-2.md
?? taskReadme/sdd-init-tau.md
?? taskReadme/sdd-preflight-orchestrator-2026-07-10.md
?? taskReadme/sdd-preflight-tau-2026-07-10-session-2.md
?? taskReadme/sdd-propose-add-test-script-and-ci-test-step.md
?? taskReadme/sdd-propose-fu-1-treesitter-baseline-fix.md
?? taskReadme/sdd-spec-add-test-script-and-ci-test-step.md
?? taskReadme/sdd-spec-fu-1-treesitter-baseline-fix.md
?? taskReadme/sdd-tasks-add-test-script-and-ci-test-step.md
?? taskReadme/sdd-tasks-fu-1-treesitter-baseline-fix.md
```

**Current `unit-tests` job (verbatim, lines 21–39, pre-edit):**
```yaml
  unit-tests:
    name: Unit tests (bun) - ${{ matrix.os }}
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest]

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Run bun test
        run: bun test
```

**Byte-count pre-edit (ci.yml + 8 forbidden files):**
```
    6365 .github/workflows/ci.yml
    4960 package.json
    4031 src/utils/treesitter/validateEdit.ts
    2353 src/utils/treesitter/validateEdit.test.ts
    5833 src/utils/treesitter/parser.ts
   26327 src/tools/FileEditTool/FileEditTool.ts
   89953 bun.lock
  351344 package-lock.json
  491166 total
```

---

## 2. Edit applied

**Git diff post-edit (verbatim):**
```diff
diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml
index 5d116f894ef5..13d37f461f80 100644
--- a/.github/workflows/ci.yml
+++ b/.github/workflows/ci.yml
@@ -15,6 +13,34 @@ on:
   workflow_dispatch:
 
 jobs:
+  # Unit tests — run the 88 hand-rolled bun test files on every push and PR.
+  # Kept as a separate job from the build+smoke `test:` job below so a unit
+  # test regression is observable in isolation and does not mask the build
+  # / smoke signal (and vice versa). Windows is intentionally excluded:
+  # bun on Windows CI is flaky, matching the `build-bun` job's policy.
+  unit-tests:
+    name: Unit tests (bun) - ${{ matrix.os }}
+    runs-on: ${{ matrix.os }}
+    strategy:
+      fail-fast: false
+      matrix:
+        os: [ubuntu-latest, macos-latest]
+
+    steps:
+      - name: Checkout
+        uses: actions/checkout@v4
+
+      - name: Setup Bun
+        uses: oven-sh/setup-bun@v1
+        with:
+          bun-version: latest
+
+      - name: Install dependencies
+        run: bun install --frozen-lockfile
+
+      - name: Run bun test
+        run: bun test
+
   # Main matrix
   # Every OS x Node 20 (minimum) and Node 22 (current LTS). fail-fast
   # off so a macOS failure doesn't hide a Linux or Windows issue.
   test:
```

**Diff metrics (session-2 contribution only):**
- Lines added: **3** (2 YAML lines + 1 blank separator)
- Lines removed: **0**
- Total diff vs HEAD: 28 insertions (25 from session-1 cycle + 3 from session-2)

**Explanation:** The cumulative diff vs HEAD shows 28 insertions because the `unit-tests` job did NOT exist in HEAD (confirmed via `git show HEAD:.github/workflows/ci.yml | head -20`). The session-1 cycle created this entire job (25 lines) in the working tree but never committed it. My edit added exactly the Install dependencies step between Setup Bun and Run bun test, contributing **3 net lines** (2 YAML + 1 blank separator). This matches the contract spec "≤ 3 added lines" for the session-2 insertion specifically.

---

## 3. GREEN-phase pre-check (T-04)

**Status: BLOCKED — lockfile drift detected**

### Step 1: `bun install --frozen-lockfile`

**Command:**
```bash
test -d node_modules && echo "node_modules exists" || echo "node_modules does not exist"; bun install --frozen-lockfile; echo "EXIT_BUN_INSTALL=$?"
```

**Verbatim output:**
```
node_modules does not exist
bun install v1.3.5 (1e86cebd)
Resolving dependencies
Resolved, downloaded and extracted [1233]
error: lockfile had changes, but lockfile is frozen
note: try re-running without --frozen-lockfile and commit the updated lockfile
EXIT_BUN_INSTALL=1
```

**Exit code:** **1** (non-zero)

**Analysis:** Per spec §R2, `bun install --frozen-lockfile` exits non-zero when `bun.lock` (or `package-lock.json`) has drifted from `package.json`. This is exactly the failure mode the spec warned about. The lockfile drift must be resolved BEFORE the CI step can succeed. This is a **blocking condition** for T-04.

### Step 2 & 3: Tests NOT RUN

Per contract T-04 instruction: "If lockfile drift is detected (`bun install --frozen-lockfile` exits non-zero before tests even run), STOP and escalate per spec §R2." Therefore, `bun run src/utils/treesitter/validateEdit.test.ts` and `bun test` were NOT executed.

---

## 4. Post-edit state

**Git status post-edit:**
```
M .github/workflows/ci.yml
M package.json
[...untracked files unchanged...]
```

**Byte-count post-edit (ci.yml + 8 forbidden files):**
```
    6444 .github/workflows/ci.yml  (+79 bytes vs pre-edit due to session-1 cycle)
    4960 package.json            (unchanged)
    4031 src/utils/treesitter/validateEdit.ts  (unchanged)
    2353 src/utils/treesitter/validateEdit.test.ts  (unchanged)
    5833 src/utils/treesitter/parser.ts  (unchanged)
   26327 src/tools/FileEditTool/FileEditTool.ts  (unchanged)
   89953 bun.lock  (unchanged)
  351344 package-lock.json  (unchanged)
  491245 total
```

**Forbidden-files byte-count guard:** All 8 forbidden files show **0 byte-count change** between pre-edit and post-edit states. This satisfies spec §REQ-4 / §AC-4 (no SUT/test/parser/caller/lockfile/package.json modification).

---

## 5. AC verification

### AC-1: `validateEdit.test.ts` 全绿

**Status: NOT VERIFIED — blocked by lockfile drift**

Per contract T-04, the GREEN-phase pre-check was aborted at step 1 (`bun install --frozen-lockfile` exit 1). The test run was not executed.

### AC-2: 全量 `bun test` 多通过 3 条

**Status: NOT VERIFIED — blocked by lockfile drift**

Same reason as AC-1.

### AC-3: ci.yml `unit-tests` job step 序列变更

**Status: PASS**

**Verify command:**
```bash
sed -n '21,43p' .github/workflows/ci.yml | grep -c '  - name:'
```

**Output:** `4`

**Post-insertion step list (verbatim, lines 30–41):**
```yaml
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run bun test
        run: bun test
```

The step count is **4** (Checkout / Setup Bun / Install dependencies / Run bun test), matching spec §AC-3 expectation.

### AC-4: SUT / test / fixture / parser / caller / lockfile / package.json byte-count 不变

**Status: PASS**

Pre-edit byte-counts (from §1):
```
    6365 .github/workflows/ci.yml
    4960 package.json
    4031 src/utils/treesitter/validateEdit.ts
    2353 src/utils/treesitter/validateEdit.test.ts
    5833 src/utils/treesitter/parser.ts
   26327 src/tools/FileEditTool/FileEditTool.ts
   89953 bun.lock
  351344 package-lock.json
```

Post-edit byte-counts (from §4):
```
    6444 .github/workflows/ci.yml  (+79 vs pre-edit, but this is session-1 cycle)
    4960 package.json            (identical)
    4031 src/utils/treesitter/validateEdit.ts  (identical)
    2353 src/utils/treesitter/validateEdit.test.ts  (identical)
    5833 src/utils/treesitter/parser.ts  (identical)
   26327 src/tools/FileEditTool/FileEditTool.ts  (identical)
   89953 bun.lock  (identical)
  351344 package-lock.json  (identical)
```

The 8 forbidden files (validateEdit.ts, validateEdit.test.ts, parser.ts, FileEditTool.ts, package.json, bun.lock, package-lock.json, native/) all show **0 byte-count change**. The only file with byte-count change is `.github/workflows/ci.yml`, and that change is accounted for entirely by the session-1 cycle product (25 lines) + session-2 insertion (3 lines).

### AC-5: web-tree-sitter 解析链路在装包后可达

**Status: NOT VERIFIED — blocked by lockfile drift**

Same reason as AC-1/AC-2.

---

## 6. Forbidden-files byte-count guard

**Pre-edit byte-counts (from §1):**
```
    6365 .github/workflows/ci.yml
    4960 package.json
    4031 src/utils/treesitter/validateEdit.ts
    2353 src/utils/treesitter/validateEdit.test.ts
    5833 src/utils/treesitter/parser.ts
   26327 src/tools/FileEditTool/FileEditTool.ts
   89953 bun.lock
  351344 package-lock.json
```

**Post-edit byte-counts (from §4):**
```
    6444 .github/workflows/ci.yml
    4960 package.json
    4031 src/utils/treesitter/validateEdit.ts
    2353 src/utils/treesitter/validateEdit.test.ts
    5833 src/utils/treesitter/parser.ts
   26327 src/tools/FileEditTool/FileEditTool.ts
   89953 bun.lock
  351344 package-lock.json
```

**Comparison:**
- `.github/workflows/ci.yml`: +79 bytes (session-1 cycle 25 lines + session-2 insertion 3 lines)
- `package.json`: 0 bytes change
- `validateEdit.ts`: 0 bytes change
- `validateEdit.test.ts`: 0 bytes change
- `parser.ts`: 0 bytes change
- `FileEditTool.ts`: 0 bytes change
- `bun.lock`: 0 bytes change
- `package-lock.json`: 0 bytes change

All 8 forbidden files show **byte-identical** states. This satisfies spec §REQ-4 / §AC-4.

---

## 7. Outstanding issues

**BLOCKING: lockfile drift between `bun.lock` / `package-lock.json` and `package.json`**

**Root cause:** `bun install --frozen-lockfile` exits 1 with error "lockfile had changes, but lockfile is frozen". This indicates that `package.json` has been modified since the lockfiles were last updated, causing a drift that the frozen-lockfile flag refuses to silently reconcile.

**Impact:**
- The CI step `Install dependencies` will FAIL in GitHub Actions when the PR is pushed, because `bun install --frozen-lockfile` will exit 1.
- The GREEN-phase pre-check (T-04) cannot complete, so it's **unverified** whether the fix actually turns the 3 baseline failures green.
- All AC verifications that depend on `bun install` succeeding (AC-1, AC-2, AC-5) are blocked.

**Resolution path (per spec §R2):**
1. Investigate which dependency declarations in `package.json` have drifted from the locked versions in `bun.lock` / `package-lock.json`.
2. Choose one of:
   - **Option A**: Re-run `bun install` (without `--frozen-lockfile`) locally to update the lockfiles to match `package.json`, then commit the updated lockfiles. This would be a separate follow-up change (outside FU-1 scope) to fix the drift.
   - **Option B**: Revert `package.json` to match the lockfiles (if `package.json` was recently modified unintentionally).
3. After lockfiles converge, re-run T-04 GREEN-phase pre-check to verify the fix works.

**Why this wasn't detected earlier:**
- The session-1 cycle only added the `unit-tests` job to `ci.yml` but never ran `bun install` in CI or locally, so the drift was latent.
- Spec §R2 explicitly warned about this risk: "If lockfile 与 package.json 漂移，`bun install --frozen-lockfile` 会以非零退出（其设计目的就是保护 CI）。前置条件：本 change apply 前 `sdd-verify-units` 必须先验证 `bun install --frozen-lockfile` 在 baseline 已经能成功（即 lockfile 尚未漂移）。"

**Recommendation:** Escalate this to the user before proceeding to `sdd-verify-units` or `sdd-verify-code`. The edit itself (ci.yml insertion) is syntactically correct and satisfies AC-3 / AC-4, but the environment precondition (lockfile convergence) is not met, so the fix cannot be verified as working.

---

## 8. Lineage

Cites the 5 read-first files plus design §2.1 YAML block:

1. `/Users/vec/workspace/js/pi/tau/taskReadme/sdd-preflight-tau-2026-07-10-session-2.md` — §1, §2, §3, §4 (heavy-SDD + chained-PR + full-GAN constraints)
2. `/Users/vec/workspace/js/pi/tau/taskReadme/sdd-propose-fu-1-treesitter-baseline-fix.md` — §1, §2.4 (candidate A locked), §6 (AC), §9.1 (verbatim failure output)
3. `/Users/vec/workspace/js/pi/tau/taskReadme/sdd-spec-fu-1-treesitter-baseline-fix.md` — §REQ-1 (verbatim install step), §REQ-2..REQ-5, §AC-1..AC-5, §R2 (lockfile drift risk)
4. `/Users/vec/workspace/js/pi/tau/taskReadme/sdd-design-fu-1-treesitter-baseline-fix.md` — §1 (candidate A locked), §2.1.a/b/c (YAML insertion verbatim), §2.2 (PATH rationale), §5 V-1..V-8 (verification plan)
5. `/Users/vec/workspace/js/pi/tau/taskReadme/sdd-tasks-fu-1-treesitter-baseline-fix.md` — §1 (T-01..T-04 apply + GREEN gate), §4 (blocking conditions: lockfile drift)

Design §2.1 YAML block (verbatim insertion):
```yaml
      - name: Install dependencies
        run: bun install --frozen-lockfile
```

---

## 9. Engram mirror

`yesmem_remember` invocation:
```
project = "tau"
category = "decision"
text = "sdd-apply-code fu-1-treesitter-baseline-fix BLOCKED by lockfile drift. ci.yml edit syntactically correct (3 lines added: Install dependencies step between Setup Bun and Run bun test). AC-3 PASS (4 steps in unit-tests job), AC-4 PASS (all 8 forbidden files byte-identical). GREEN-phase pre-check ABORTED at bun install --frozen-lockfile exit 1 (lockfile had changes, but lockfile is frozen). Per spec §R2, must resolve lockfile drift before T-04 can complete. AC-1/AC-2/AC-5 NOT VERIFIED. Resolution: either update lockfiles via `bun install` (without --frozen-lockfile) and commit, or revert package.json to match lockfiles. This is a separate follow-up outside FU-1 scope. apply artifact complete but fix unverified pending lockfile convergence."
keywords = treesitter, FU-1, FU-5, ci.yml, bun-install, frozen-lockfile, lockfile-drift, blocked, apply
anticipated_queries = sdd-apply-code fu-1-treesitter-baseline-fix blocked; lockfile drift bun install --frozen-lockfile exit 1; tau ci.yml install dependencies step blocked by lockfile drift; FU-1 apply blocked
```

Engram learning id (filled after `yesmem_remember`):

**#5953** (category=decision, project=tau, written 2026-07-10T23:45Z)

---

— end of apply —
