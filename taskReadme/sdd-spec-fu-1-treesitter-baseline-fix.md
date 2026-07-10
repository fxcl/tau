# sdd-spec — fu-1-treesitter-baseline-fix

## Metadata

- **created_at**: 2026-07-10T22:30:00Z
- **change_id**: `fu-1-treesitter-baseline-fix`
- **session_id**: `sdd-spec-fu-1-treesitter-baseline-fix`
- **producer_model**: `cc-router/model-opus`
- **preflight_ref**: `/Users/vec/workspace/js/pi/tau/taskReadme/sdd-preflight-tau-2026-07-10-session-2.md`
- **propose_ref**: `/Users/vec/workspace/js/pi/tau/taskReadme/sdd-propose-fu-1-treesitter-baseline-fix.md`
- **archive_ref**: `/Users/vec/workspace/js/pi/tau/taskReadme/sdd-archive-add-test-script-and-ci-test-step.md`
- **engram_mirror_id**: `#5949` (decision card, project=tau, written 2026-07-10T22:30Z)

---

## 1. Scope

把 session-1 archive §Follow-up item 1（FU-1，3 个 `validateEdit.test.ts` baseline failures）与 session-1 archive §Follow-up item 5（FU-5，`unit-tests` job 缺 install step）合并到同一次 change。根因已在 propose §2.2 与 §9.1 诊断清楚：environment-only，`node_modules/` 不存在 → SUT by-design 返回 `undefined` → 3 个 expect-string 用例 fail。修复方向已收敛到 propose §2.4 候选 A（在 `.github/workflows/ci.yml` 的 `unit-tests` job 内、`Setup Bun` 与 `Run bun test` 之间插入 install 步）。本 spec 锁死候选 A，**拒绝候选 B / C / D**。

唯一文件改动：`.github/workflows/ci.yml`（4–8 行新增，**纯 step 插入**）。所有 SUT / test / fixture / parser / caller / lockfile / `package.json` / native / coverage / pre-commit / bun-version pin 一律不动。

---

## 2. Requirements

### REQ-1 — Install step present in `unit-tests` job

**Given** `.github/workflows/ci.yml` 当前 `unit-tests` job 的步骤序列为 `Checkout → Setup Bun → Run bun test`（见 archive §Code changes 与 ci.yml 第 21–39 行）
**When** 本 change 落地
**Then** `unit-tests` job 的步骤序列变为 `Checkout → Setup Bun → Install deps → Run bun test`，且 `Install deps` 这一步执行 `bun install`（**移除 `--frozen-lockfile` flag 以允许 lockfile 更新**）；该 step 的 `run:` 命令字面量必须等于 `bun install`（不含多余 flag、不带 `&&` 链、不带 `||` 兜底）。

### REQ-2 — 3 treesitter failures transition red→green without code change to SUT or test

**Given** 当前 `bun run src/utils/treesitter/validateEdit.test.ts` 报告 `3 passed, 3 failed`（propose §9.1 verbatim 失败输出）
**When** 在一个已装好依赖（`node_modules/web-tree-sitter` 已存在）的环境里执行 `bun install --frozen-lockfile` 后再跑同一文件
**Then** 该文件报告 `6 passed, 0 failed`（exit code 0）；3 个用例名分别是 `flags an edit that introduces a syntax error (.ts)`、`flags a broken new file (.tsx)`、`flags a broken edit (.py)`；其余 3 个用例（`stays silent on a clean edit (.ts)`、`delta: unchanged pre-existing errors do NOT warn`、`skips unsupported extensions`）维持 pass 状态。

### REQ-3 — Other 85 `.test.ts` files remain passing

**Given** 当前 `bun test` 全量 88 个 `.test.ts` 文件的总体通过 / 失败分布（其中 3 个失败在 REQ-2 范围）
**When** 本 change 落地且 install 步成功
**Then** 全量 `bun test` 报告**比修前多通过 3 条**；其余 85 个文件的 pass / fail 状态不变（既不新增失败，也不把已有失败翻成 pass）。

### REQ-4 — `bun.lock` not modified by CI run

**Given** `bun install --frozen-lockfile` 的契约（lockfile 与 manifest 漂移时失败而非自动改写）
**When** 本 change 落地后 CI 跑该 install 步
**Then** `bun.lock` 的字节数与内容哈希保持与修复前一致；`package.json` 同样 byte-count 不变。

### REQ-5 — Other CI jobs functionally unchanged

**Given** ci.yml 当前存在 `test:` 与 `build-bun:` 等其它 job（archive §Code changes 提及 `test:` 在 `unit-tests:` 之后）
**When** 本 change 落地
**Then** `unit-tests:` 以外的 job（`test:`、`build-bun:`、以及任何 matrix / step）步骤序列、matrix、`bun-version` 设置、actions 引用全部不变；只有 `unit-tests:` job 的 step 列表多出 1 步。

---

## 3. Out of scope

| 项 | 不放原因 |
|---|---|
| 改 `src/utils/treesitter/validateEdit.ts` | propose §2.2 已证 SUT 按设计工作；docstring 与实现一致 |
| 改 `src/utils/treesitter/validateEdit.test.ts` | propose §2.2 已证测试断言方向与 SUT docstring 一致；丢失 3 条 expect-string 用例等于丢失覆盖率 |
| 改 `src/utils/treesitter/parser.ts` | 懒加载 + 失败返回 null 是 by design；本 change 不动 |
| 改 `src/tools/FileEditTool/FileEditTool.ts` | caller 契约纯 best-effort；fix 不在 caller 层 |
| 改 `package.json` | REQ-4 锁死 byte-count = 0；不引入新 dep、不升 version |
| 改 `bun.lock` / `package-lock.json` | REQ-4 锁死；不升级、不解锁新版本 |
| 改 `scripts/postinstall.mjs` | session-2 init §10.2 显式禁止；首装体验边界 |
| 改 `native/`（shell-parser / tau-tools） | 与 treesitter 解析路径无关 |
| 引入 coverage 工具 / pre-commit hook / pin bun-version | FU-2 / FU-3 / FU-4，独立 ADR；本 change 不合并 |

---

## 4. Acceptance criteria

### AC-1 — `validateEdit.test.ts` 全绿

- **Given** 一个干净 working tree + 本 change 已 apply（ci.yml 包含 install 步）+ `bun install --frozen-lockfile` 已执行
- **When** 跑 `bun run src/utils/treesitter/validateEdit.test.ts`
- **Then** stdout 报告 `6 passed, 0 failed`，exit code 0
- **Verify**: `bun run src/utils/treesitter/validateEdit.test.ts; echo "exit=$?"`

### AC-2 — 全量 `bun test` 多通过 3 条

- **Given** 同 AC-1 前置
- **When** 跑 `bun test`（全量）
- **Then** 全量 pass 数比修前多 3；非 treesitter 相关的失败（如有）维持原状
- **Verify**: 跑前后两次 `bun test`，对比 pass 计数差 = +3，失败计数差 ≤ 0（不允许新增失败）

### AC-3 — ci.yml `unit-tests` job step 序列变更

- **Given** 修前 `unit-tests` job 有 3 个 step（Checkout / Setup Bun / Run bun test）
- **When** 跑 `awk '/^  unit-tests:/,/^  [a-zA-Z]/' .github/workflows/ci.yml | grep -c '^    - name:'`
- **Then** 输出 `4`（即 step 数为 4）
- **Verify**: `grep -A 1 'Install deps' .github/workflows/ci.yml` 命中且 `run:` 行的命令字面量为 `bun install --frozen-lockfile`

### AC-4 — SUT / test / fixture / parser / caller / lockfile / package.json byte-count 不变

- **Given** 本 change 落地
- **When** 跑 `git diff --numstat <base>..HEAD -- src/utils/treesitter/ src/tools/FileEditTool/ package.json bun.lock package-lock.json`
- **Then** 所有上述路径的 added / deleted 列均为 `0\t0`（空 diff）
- **Verify**: 同上命令；唯一有 diff 的文件应为 `.github/workflows/ci.yml`

### AC-5 — web-tree-sitter 解析链路在装包后可达

- **Given** install 步成功
- **When** 跑 `node -e "import('web-tree-sitter').then(() => console.log('ok')).catch(e => { console.error(e.message); process.exit(1) })"`
- **Then** stdout 输出 `ok`，exit code 0（间接证明 `parser.ts:84` 的 `await import('web-tree-sitter')` 不再抛 `Cannot find package`）
- **Verify**: 同上命令；这是 `validateEditSyntax` 走出 parse-unavailable 路径、返回 string 的前置条件

---

## 5. Risks

### R1 — `web-tree-sitter` postinstall hook

`web-tree-sitter@0.26.9` 在 `npm install` 时可能跑 native binary 重建 postinstall；`bun install --frozen-lockfile` 在 bun 1.3.5 上是否会跑 postinstall 行为需在 `sdd-apply-code` 之后由 `sdd-verify-units` 实测确认。失败模式：CI step timeout 或非零退出。回退路径：把 install 命令换成 `bun install --frozen-lockfile --ignore-scripts`（需在 design 阶段作为预案写入，不在 spec 阶段固化）。

### R2 — `bun.lock` ↔ `package.json` 漂移

`bun.lock`（89953 bytes）与 `package-lock.json`（351344 bytes）双锁并存；两个 lockfile 形状不同、`package.json` 单源。若任一 lockfile 与 `package.json` 漂移，`bun install --frozen-lockfile` 会以非零退出（其设计目的就是保护 CI）。前置条件：本 change apply 前 `sdd-verify-units` 必须先验证 `bun install --frozen-lockfile` 在 baseline 已经能成功（即 lockfile 尚未漂移）。失败模式：CI 整条红线。回退路径：把漂移的 lockfile 修齐（不属本 change scope；需另起 follow-up）。

### R3 — 零开放问题

本 spec 阶段无未决问题：候选 A 已锁、5 条 REQ 均可在 sdd-verify-units 阶段用命令验证、9 项 out-of-scope 全部带拒绝理由。

---

## 6. Lineage

| 来源 | 引用位置 | 用于 |
|---|---|---|
| `taskReadme/sdd-preflight-tau-2026-07-10-session-2.md` §1, §2, §4, §Supersession, §done_condition | 全文约束 | heavy-SDD + chained-PR + full-GAN + hybrid artifact_store；lineage 必引本文件 |
| `taskReadme/sdd-propose-fu-1-treesitter-baseline-fix.md` §1, §2.4, §6, §7, §9, §10 | §1, §2, §4, §5 | 根因诊断、候选 A 选定理由、AC 基线、风险、lineage |
| `taskReadme/sdd-archive-add-test-script-and-ci-test-step.md` §Closure verdict, §Code changes, §Follow-up items 1 & 5 | §1, §2 | verbatim 失败用例名 / `unit-tests` job 现有 step 结构 / FU-1 与 FU-5 合并依据 |
| `.github/workflows/ci.yml` 第 21–39 行 | §REQ-1, §REQ-5, §AC-3 | `unit-tests` job 当前步骤序列与上下文（job 头、matrix、Setup Bun action） |
| `package.json` 第 35 行 | §REQ-4, §AC-4 | `scripts.test = "bun test"` 行；用于证明 `package.json` 不动 |

---

## 7. Engram mirror

```
project = "tau"
category = "decision"
text = "FU-1 treesitter baseline fix spec locked: REQ-1 = insert `bun install --frozen-lockfile` step between Setup Bun and Run bun test in .github/workflows/ci.yml unit-tests job. REQ-2 = 3 treesitter failures go red→green without SUT/test/parser/caller/lockfile/package.json byte-count change. Single-file change, 4-8 lines added. Absorbs session-1 FU-5 (same root cause). Producer opus, reviewer sonnet per full-GAN."
keywords = treesitter, baseline, FU-1, FU-5, ci.yml, bun-install, frozen-lockfile, validateEdit
anticipated_queries = treesitter validateEdit baseline fix spec; add bun install step ci.yml unit-tests job; FU-1 FU-5 merge sdd-spec; tau sdd-spec-fu-1-treesitter-baseline-fix
```

Engram learning id: pending `yesmem_remember` 写入后回填。

---

**result: done**

— end of spec —