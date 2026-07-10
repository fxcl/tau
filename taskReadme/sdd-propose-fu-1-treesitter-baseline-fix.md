# sdd-propose — fu-1-treesitter-baseline-fix

> ## Metadata
>
> - **created_at**: 2026-07-10T22:00:00Z
> - **change_id**: `fu-1-treesitter-baseline-fix`
> - **change_slug**: `fu-1-treesitter-baseline-fix`
> - **human_summary**: Fix the 3 pre-existing baseline test failures in `src/utils/treesitter/validateEdit.test.ts` that were marked non-blocking by the session-1 archive.
> - **project**: tau (multi-provider AI coding CLI, v0.92.12)
> - **repo_root**: `/Users/vec/workspace/js/pi/tau`
> - **session_id**: `sdd-propose-fu-1-treesitter-baseline-fix`
> - **producer_model**: `cc-router/model-opus` (production tier per session-2 preflight §4)
> - **preflight_ref**: `/Users/vec/workspace/js/pi/tau/taskReadme/sdd-preflight-tau-2026-07-10-session-2.md`
> - **init_ref**: `/Users/vec/workspace/js/pi/tau/taskReadme/sdd-init-tau-2026-07-10-session-2.md`
> - **archive_ref**: `/Users/vec/workspace/js/pi/tau/taskReadme/sdd-archive-add-test-script-and-ci-test-step.md`
> - **supersedes**: none (first dedicated change for follow-up FU-1)
> - **engram_mirror_id**: 见 §11
> - **result**: done

---

## 0. Authoritative lineage (READ FIRST)

本 change 是 session-2 init §10.3 中登记的 FU-1（`treesitter validateEdit.test.ts` 3 个 baseline failures）独立 change。读完下面三个文件再继续：

1. `taskReadme/sdd-preflight-tau-2026-07-10-session-2.md` — 本会话 preflight（heavy-SDD + chained-PR + full-GAN）。
2. `taskReadme/sdd-init-tau-2026-07-10-session-2.md` — opus-grade init；§10.3 把 FU-1 列为「独立 change，不进入普通 change scope」。
3. `taskReadme/sdd-archive-add-test-script-and-ci-test-step.md` — session-1 archive；§Closure verdict 显式登记 3 个 baseline failures 为 non-blocking；§Follow-up item 1 把 FU-1 落到独立 issue。

---

## 1. Why — 为什么有这个 change

session-1 archive §Closure verdict 原话：

> "`bun test` exit code = 1 due to **3 pre-existing failures in `src/utils/treesitter/validateEdit.test.ts`**, which is **unrelated to this change** (no `.test.ts` files were modified). Per spec acceptance criteria, this is a non-blocking baseline failure, not a regression."

session-1 archive §Follow-up item 1 原话：

> "**Investigate `src/utils/treesitter/validateEdit.test.ts` failures** (3 cases): `flags an edit that introduces a syntax error (.ts)`, `flags a broken new file (.tsx)`, `flags a broken edit (.py)`. Likely a real test bug or a treesitter-wasm API drift. Track as separate issue; this PR explicitly does not chase."

session-2 init §10.3 把上面的「separate issue」登记为 FU-1，明确写出处置建议：

> "**独立 change**：tree-sitter-wasm API drift 调查；不在普通 change 中重写/跳过该文件"

session-2 init §10.2 也在约束栏登记：

> "**必须跑** `bun test` 并接受 3 个 baseline failures 来自 `src/utils/treesitter/validateEdit.test.ts` | verify-units | session 1 archive 显式标记这 3 失败是 non-blocking baseline"

每一轮后续 change 都会被这 3 个失败污染红信号。FU-1 的目标是把它们转绿，让 `bun test` 真正能作为 CI 的可信信号使用。

---

## 2. What — 改了什么 / 准备怎么改（scope 三分）

### 2.1 本 change 的实际目标 = 把 3 个已知 baseline failure 转绿

逐条现状（实测 verbatim，§9 命令截图）：

| 用例名 | 位置 | 期望（test） | 实际（test） |
|---|---|---|---|
| `flags an edit that introduces a syntax error (.ts)` | test.ts:31–34 | `typeof w === 'string'` | `expected a warning, got undefined` |
| `flags a broken new file (.tsx)` | test.ts:53–56 | `typeof w === 'string'` | `expected a warning, got undefined` |
| `flags a broken edit (.py)` | test.ts:58–61 | `typeof w === 'string'` | `expected a warning, got undefined` |

剩余 3 条 `ok`：clean edit / pre-existing error 仍 broken / unsupported ext — 这些**全部通过**（test.ts:36–51）。

### 2.2 product code (`validateEdit.ts`) 的事实状态

`src/utils/treesitter/validateEdit.ts`：

- 第 12–14 行 docstring 显式声明「`undefined` whenever the language is unsupported, parsing is unavailable, the file is too large, or the edit didn't make things worse」。
- 第 110–111 行在 `afterErrors > beforeErrors` 时返回 warning string（实现是 `<= beforeErrors → undefined`，符合预期）。
- 第 115–117 行 `catch { return undefined }`。
- **SUT 本身按设计运行**：当解析不可用时（web-tree-sitter 不可加载），整个函数返回 `undefined`，这是 by design。

**因此结论：SUT 不是 bug。** session-1 archive 的"Likely a real test bug or a treesitter-wasm API drift"假设有两个：

- (a) "treesitter-wasm API drift" — 经检查 `parser.ts` 与 `web-tree-sitter ^0.26.9` API 完全兼容，无 API drift。
- (b) "real test bug" — 经检查 3 个测试的断言方向 (`typeof w === 'string'`) 与 SUT docstring 一致；**当 web-tree-sitter 可加载时这 3 个用例本来就能通过**，所以**测试也是对的**。

真正不存在的链路：**环境**。`web-tree-sitter` 在 `package.json` 声明且 `package-lock.json` / `bun.lock` 都锁定（`node_modules/web-tree-sitter` 记录为 `web-tree-sitter-0.26.9.tgz`），但本 working tree 的 `node_modules/` 不存在 → 解析失败 → SUT 优雅退化 → 3 个 expect-string 用例失败。

### 2.3 scope 分三层

| 层 | 路径 | 实际状态 | 本 change 是否改 |
|---|---|---|---|
| product code (SUT) | `src/utils/treesitter/validateEdit.ts` | 按设计工作，docstring 与实现一致 | **NO**（仅作为参照；不改） |
| product code (parser) | `src/utils/treesitter/parser.ts` | 按设计工作，懒加载、失败返回 null | **NO** |
| test code | `src/utils/treesitter/validateEdit.test.ts` | 6 条用例：3 ok + 3 期望 string | **NO**（断言方向与 SUT docstring 一致，是对的） |
| fixture (none) | — | — | N/A |
| **environment** | `node_modules/web-tree-sitter` 等 | 在本 working tree 中**不存在**（lock file 有，但 `bun install` 没跑过） | **NO（这是 local env）** |
| **CI step** | `.github/workflows/ci.yml` `unit-tests` job | 当前只有 Checkout / Setup Bun / Run bun test 三步，**没有 install 步** | **MAYBE**（见 §2.4 / §5 约束） |
| **build path** | `scripts/postinstall.mjs`（不需要新增） | 已存在，update 路径不动 | **NO** |

### 2.4 修复方向候选（由后续 sdd-spec / sdd-design 决定）

候选 A — **CI 加 install 步（推荐）**：在 `.github/workflows/ci.yml` 的 `unit-tests` job 里、`Run bun test` 之前插入 `bun install --frozen-lockfile` 一步。这同时消解 FU-5（"Add `bun install` step to `unit-tests` job" — session-1 archive §Follow-up item 5），并将 FU-1 与 FU-5 合并到一个 PR，因为它们**同一根因**、修复路径一致。**严格 TDD：环境修好 → 3 个用例自然转绿（无需改测试） → 无 refactor**。

候选 B — **改 SUT 让它显式报警**：把 parse-unavailable 视作"不能判好坏"，仍然保持 undefined。这违反 docstring 与 caller 契约，不推荐，列为反例。

候选 C — **改测试消除 3 个用例**：把 3 个 expect-string 用例注释掉或改成 expect-undefined。这是回退、丢失覆盖率，**不推荐**。

候选 D — **改 SUT 把 file-too-large 或 parse-unavailable 也强制返回 string**：破坏 best-effort 语义，且 caller（FileEditTool）会把每条 edit 都吓出 warning，**不推荐**。

> **本 propose 不选定方案**。推荐 A 由 sdd-spec/sdd-design 决定，但**拒绝选 B/C/D**（已经诊断清楚：SUT/测试都不是 bug，环境才是 root cause；改它们会引入新 bug）。

---

## 3. Who benefits — caller 影响

### 3.1 主 caller：`src/tools/FileEditTool/FileEditTool.ts`

唯一定义级 caller：`src/tools/FileEditTool/FileEditTool.ts:636`：

```ts
// Best-effort, non-blocking syntax check (warn-only). Runs AFTER the write
// above, so it is structurally incapable of blocking or reverting the edit —
// it only attaches an advisory note when the edit INTRODUCED new parse
// errors. Returns undefined for unsupported languages or unavailable
// parsing, and never throws.
const syntaxWarning = await validateEditSyntax(
  absoluteFilePath,
  originalFileContents,
  updatedFile,
)
if (syntaxWarning) {
  // Breadcrumb so the check is observable in a real session via --debug
  // (writes to ~/.claude/debug/<session>.txt; use -d2e for stderr).
  logForDebugging(`[tree-sitter] ${absoluteFilePath}: ${syntaxWarning}`)
}
```

后续使用 `syntaxWarning` 的位置（同一文件 `FileEditTool.ts`）：
- 第 657 行：`...(syntaxWarning && { syntaxWarning })` — 进 data payload 给 model
- 第 680 行：`const warningSuffix = syntaxWarning ? \`\n\n${syntaxWarning}\` : ''` — 拼进 tool result

caller 的契约是**纯 best-effort、warn-only**。`undefined` 永远不会出错；只要 SUT 在「edit 引入新 parse error」时返回 string 即可。

### 3.2 callers of callers

`FileEditTool` 在 9 个 lane 中均存在/可达（CLAUDE.md + session-2 init §3.1）。fix 受益对象是**所有 lane**：claude / gemini / codex / openai-compat / qwen / kiro / cursor / cline / kilo（通过 FileEditTool shared 入口）。

### 3.3 间接受益

- CI 的 `unit-tests` job（项目自己加的，见 session-1 archive）从此变成真正的可信信号；不用再为 3 个 baseline failure 做 "allowed failure" 钩子。
- 后续 `sdd-verify-units` 不需要"显式豁免" FU-1。
- 后续 PR review 不需要"这个红不是 regression"的弱解释。
- 现有 hand-rolled `test()` harness pattern 完全不动。

---

## 4. Out of scope（明确不放进这个 change）

| 项 | 不放原因 |
|---|---|
| 改为 vitest / jest / uvu / bun:test describe | session-2 init §10.2 强制："no test framework migration" |
| 引入 coverage 工具 (c8 / istanbul) | session-2 init §10.2 + FU-2（独立 ADR，需用户单独批准） |
| 引入 pre-commit hook | FU-3（独立 ADR） |
| pin `bun-version: latest` → 具体版本 | FU-4（时间触发，约 2 周后再决定） |
| 改 `postinstall.mjs` 行为 | session-2 init §10.2（postinstall 涉及 ripgrep + Ollama 预拉取，影响开发者首装） |
| 改 FileEditTool 的 warning 呈现方式 | scope creep；本 change 只解决「SUT 有没有在 parse 时正确报错」 |
| 改 `parser.ts` 的 grammar 装载策略 | SUT 按设计懒加载、失败返回 null；无需改 |
| 升级 `web-tree-sitter` 版本或 `@vscode/tree-sitter-wasm` | pin 0.26.9 / 0.3.1 已被 lockfile 锁定；本 change 不动版本 |
| 跳过 / 删除这 3 个用例 | 丢失覆盖率；测试**是对的** |
| 修 CI 中 windows-latest 排除策略 | session-1 design 已确立"bun on Windows CI is flaky" |
| 改 `.gitignore` 把 `detect.test.ts` 之类 scratch 洗一洗 | scope creep；与 treesitter 无关 |
| 在 `tau-vscode/` 子包做对应改动 | `tau-vscode/` 有自己的 `package.json` 与 node-test runner；本 change 与之无关 |
| `.worktrees/tau-arch-research/` 中的同 path 文件 | 那是一个 research worktree（git status 显示有 untracked 工作区）；不在 master HEAD 上，本 change 不动 |

---

## 5. Constraints / non-negotiables

1. **Strict TDD**：本 change 的 RED 已经天然存在（3 个 baseline failure）；GREEN 由修复环境（候选 A）提供；**不在同一 change 内做 REFACTOR**。任何对 SUT 的"顺手清理"必须挪到独立 change。
2. **session-2 preflight contract**：
   - chained-PR（每条变更独立 PR；本次 FU-1 走单条 PR）。
   - full-GAN：spec/design/apply-* 由 opus 产出，verify-* 由 sonnet 评审。`propose` 由 opus 写出（不违反 GAN，因为 propose 是 prep/survey tier）。
3. **现有 hand-rolled `test()` harness 不动**：88 个 `*.test.ts` 沿用现约定。
4. **不动 `.eslintrc*` / `.prettierrc*`**（本就不存在，session-2 init §10.2）。
5. **不动 `postinstall.mjs`**（首装体验边界，session-2 init §10.2）。
6. **不动 coverage 阈值与工具**（session-2 init §10.2 / FU-2）。
7. **macOS HFS+ 大小写不敏感**（preflight §Operating constraints）— taskReadme 引用统一用 `pi`。
8. **artifact_store = taskReadme + Engram mirror** — 本文件是 FS 唯一真相，Engram 是镜像。不写 `proposals/` `specs/` `designs/` `tasks/` `sdd/` `.sdd/` `openspec/` `.openspec/` 并行目录。
9. **supersession**：本 change **不取代** session-2 init；FU-1 follow-up 由本 change 正式承接。

---

## 6. Acceptance criteria（可测）

A1. 修后，`bun run src/utils/treesitter/validateEdit.test.ts` 报告 **6 passed, 0 failed**（exit code 0）。

A2. 修后，`bun test`（全量 88 文件）报告**比修前多通过 3 条**（即其余 85 条维持原有通过/失败状态）。注意：还有别的 baseline failure 不在本 change scope（截至 session-2 探测未发现其他 baseline 失败），verify-units 阶段需要再核一遍。

A3. 修后，CI `unit-tests` job（在 `oven-sh/setup-bun@v1` 之后、`Run bun test` 之前多一步 install）的 step list 显示 4 step（Checkout / Setup Bun / Install deps / Run bun test），且 `Install deps` step 退出码 0。

A4. 修后，**不动下列文件的 byte-count 变化 = 0**：
- `src/utils/treesitter/validateEdit.ts`
- `src/utils/treesitter/validateEdit.test.ts`
- `src/utils/treesitter/parser.ts`
- `src/tools/FileEditTool/FileEditTool.ts`

（这是 SUT/测试/fixture 一律不改的硬约束 — fix 一定在环境/CI 层。）

A5. 修后，`package.json`、`package-lock.json`、`bun.lock` 字节变化 = 0（不升级依赖、不解锁新版本）。

A6. 修后，`@vscode/tree-sitter-wasm ^0.3.1` 与 `web-tree-sitter ^0.26.9` 仍可被解析（这是验证 install 链通了的间接信号）。实测 `node -e "import('web-tree-sitter').then(() => console.log('ok'))"` 输出 `ok`。

A7. session-2 init §10.3 的 open-follow-up 列表里 FU-1 一行被勾掉（在 archive 阶段勾）。

---

## 7. Risks

### 7.1 修复方向是 CI / install step 的固有风险

- **R1**: `bun install --frozen-lockfile` 在 lockfile 与 `package.json` 漂移时**会失败**（这是它的设计目的 — 保护 CI 不被偷偷改 dep）。如果 lockfile 漂移（session-2 init §12 提到 "bun.lock 与 package-lock.json 双锁并存，可能漂移"），修复 → 红 → 阻塞。**前置条件**：lockfile 必须先收敛（这是 verify-units 阶段一次性校验的事，不是本 change 的修复内容）。
- **R2**: 装包时间会让 `unit-tests` job 慢 30–60 秒（按 npm registry 带宽与 cold cache）。可接受；verify-units 阶段在 require 显著超时（>2min）时按需用 `bun install --production` 或 actions/cache 加速（但 actions/cache 改 CI 是独立 follow-up）。
- **R3**: `bun install` 在 sandbox 容器中可能受网络限制（GitHub-hosted runner 默认开放 registry，但 fork 或自托管 runner 可能受限）。CI 上游 runner 是 GitHub-hosted，已知能用。

### 7.2 测试本身重新分析

- **R4**: "SUT 不是 bug, 测试不是 bug, 环境才是 bug" — 这是诊断结论，但有可证伪的方式：如果在装好 web-tree-sitter 后再跑测试，仍然失败，则说明 SUT 或测试确有 bug，候选 A 失败，需回退候选 B/C/D。本 change 的 spec/design 阶段必须把这一步写成失败模式（"如果 install 之后 3 个用例仍 fail，则重新诊断，不允许强行改测试"）。
- **R5**: `parser.ts:84` 用 `await import('web-tree-sitter')` 而不是 `tsRequire('web-tree-sitter')` — 这个选择意味着 ESM resolution，在 bun 上必须 `node_modules/` 存在。如果未来 treesitter-wasm 切换 import 风格，需重新评估（不在本 change scope）。

### 7.3 其他依赖 `validateEditSyntax` 的代码（回归风险评估）

整仓搜索 `validateEditSyntax`（grep 命中 10 处，但去掉 worktree 镜像 8 处剩 2 处）。**唯一 production caller**：FileEditTool.ts 第 54 / 636 行。FileEditTool.ts:657/680 把 `syntaxWarning` 嵌入 payload/result，纯字符串拼接，**没有重新解析、没有编译、没有 eval**。回归面：仅在 FileEditTool 的 tool result 文本里多 / 少一段 warning。

### 7.4 其他依赖 `web-tree-sitter`（仅间接）

`package-lock.json` 中也有 bash-language-server 携带的 `web-tree-sitter@0.24.5`。本 change 不直接动它。回归面 0（不属同一解析路径，validateEdit.ts 只 import 顶层 `web-tree-sitter`）。

### 7.5 不可证伪风险

- **R6**: "pre-existing" 这个词在 session-1 archive 是凭经验定的；没人逐字复述过原始失败文本。本 propose 的 verbatim 引用基于本次 `bun test` 现场重跑（§9 见 ground truth）。如果环境两次跑不一致，需要重新 ground truth。

---

## 8. Open questions

1. **候选 A 是否唯一路径？** sdd-spec / sdd-design 阶段是否要探索"在 SUT / parser / fixture 层给一条更稳的修复"？本 propose 的诊断是"环境根因、CI 修"，但**SPAND**：spec 阶段可以再做一次 ground truth（"装好依赖后再跑 `bun run src/utils/treesitter/validateEdit.test.ts`"），如果转绿 3 条 → 候选 A；如果仍 fail → 候选 B/D。
2. **`bun install --frozen-lockfile` vs `bun install` vs `bun install --ignore-scripts`** — 哪一种最贴 tau？候选 spec 阶段实测。`--frozen-lockfile` 是默认候选，因为它和 `package-lock.json` 配合最严。
3. **`postinstall` 是否会跑？** tau 自己有 `scripts/postinstall.mjs`（CLAUDE.md + session-2 init §12 提到 ripgrep 下载 + Ollama 预拉取）。CI 跑 install 时必然跑 postinstall —— 已被 session-1 archive 视作 "OK to keep"，但 CI 上加 install 步意味着 CI 也跑 ripgrep 下载与 Ollama 预拉取，**网络/时间成本**需 verify-units 实测（GitHub-hosted runner 通常可）。
4. **FU-1 与 FU-5 是否合流？** session-1 archive §Follow-up item 5 ("Add `bun install` step to `unit-tests` job") 已经被本 propose 吸收。spec/design 阶段需明确写入"两 follow-up 在本次 PR 中合并处理"，并在 archive 中同步勾掉 FU-5。
5. **是否一并勾掉 session-2 init §10.3 的 FU-1 行？** 由 archive 阶段处理；本 propose 不擅自改 init 文件。

---

## 9. Ground truth 与 lineage 截图

### 9.1 verbatim 失败输出（重跑于 2026-07-10）

```
$ TAU_DEBUG_TREESITTER=1 bun test src/utils/treesitter/validateEdit.test.ts 2>&1 | tail -80
bun test v1.3.5 (1e86cebd)

src/utils/treesitter/validateEdit.test.ts:
[tree-sitter] init failed: Cannot find package 'web-tree-sitter' from '/Users/vec/workspace/js/PI/tau/src/utils/treesitter/parser.ts'
  FAIL flags an edit that introduces a syntax error (.ts): expected a warning, got undefined
  ok  stays silent on a clean edit (.ts)
  ok  delta: unchanged pre-existing errors do NOT warn
  ok  skips unsupported extensions
  FAIL flags a broken new file (.tsx): expected a warning, got undefined
  FAIL flags a broken edit (.py): expected a warning, got undefined

3 passed, 3 failed
```

### 9.2 验证链路

- `parser.ts:84`：`(await import('web-tree-sitter')) as Record<string, unknown>` — ESM dynamic import，依赖 `node_modules/web-tree-sitter/package.json` 可解析。
- `parser.ts:96-98`：`tsRequire.resolve('web-tree-sitter/web-tree-sitter.wasm')` — CommonJS 解析，同样依赖 `node_modules` 存在。
- `package.json` 中两个依赖均声明（`@vscode/tree-sitter-wasm ^0.3.1` + `web-tree-sitter ^0.26.9`），`package-lock.json` 与 `bun.lock` 都 pin 到具体版本。
- 本 working tree 中 `node_modules/` 不存在（git status 验证：仅 `.worktrees/`, `.atl/`, `.aiwork/`, `taskReadme/` 等 untracked，`node_modules/` 未出现；`ls node_modules` 返回 "No such file or directory"）。
- `bun test` 不自动跑 install（help 文本确认）。
- CI `unit-tests` job 的 step 序列：Checkout → Setup Bun → Run bun test（没有 install step）。

→ 因此 `validateEditSyntax` 在 parse-unavailable 路径返回 `undefined`（by design, docstring 第 13 行），3 个 expect-string 测试必然 fail。

### 9.3 与 session-1 archive 的一致性核查

session-1 archive §Closure verdict：

| 字段 | archive 表述 | 本次实测 |
|---|---|---|
| 失败用例数 | 3 | 3 ✓ |
| 失败用例名 | `flags an edit that introduces a syntax error (.ts)`, `flags a broken new file (.tsx)`, `flags a broken edit (.py)` | 完全一致 ✓ |
| 失败理由 | "Likely a real test bug or a treesitter-wasm API drift" | session-1 时未装依赖所以看不到真因；本次实测显示真因是 `Cannot find package 'web-tree-sitter'`（环境问题）。session-1 假设是**不准确的**，但 archive 把它登记为 non-blocking 的判断**仍然成立**。 |

---

## 10. Lineage 与 citations

| 来源 | 引用位置 | 用于 |
|---|---|---|
| `taskReadme/sdd-preflight-tau-2026-07-10-session-2.md` §1, §2, §3, §4, §Supersession, §done_condition | §0, §5, §Done | 写作约束：heavy-SDD + chained-PR + full-GAN + hybrid artifact_store；lineage 必引本文件 |
| `taskReadme/sdd-init-tau-2026-07-10-session-2.md` §0, §3.1, §4, §5, §10.2, §10.3, §12 | §0, §5, §6, §7, §9 | stack / conventions / testing_capability / strict TDD verdict / follow-up list（FU-1）、约束（不动 postinstall / 不动 ci.yml 除非必要 / 不动 coverage） |
| `taskReadme/sdd-archive-add-test-script-and-ci-test-step.md` §Closure verdict, §Follow-up items | §1, §4, §9 | verbatim 引用：3 失败用例名 + non-blocking 判定 + Follow-up item 5（FU-5 与 FU-1 合并处理依据） |
| `src/utils/treesitter/validateEdit.test.ts` 1–64 行 | §2.1, §3.1, §6, §9 | 测试全文件；本 change 断言**不动** |
| `src/utils/treesitter/validateEdit.ts` 1–118 行 | §2.2, §3.1, §7 | SUT 全文件；docstring 显式承诺 `undefined` is by design；本 change 断言**不动** |
| `src/utils/treesitter/parser.ts` 1–170 行 | §7.5 | parser 全文件；ESM `await import('web-tree-sitter')` 是 install 失败影响测试的链路证据 |
| `src/tools/FileEditTool/FileEditTool.ts` 第 54, 636–644, 657, 680 行 | §3.1 | 唯一 production caller；best-effort 契约论证 |
| `.github/workflows/ci.yml` 第 21–39 行 | §2.4, §7.1, §9 | `unit-tests` job 步骤列表；当前无 install step 是 fix 候选 A 的入口 |
| `package.json` (full) | §2.3, §9 | `web-tree-sitter`/`@vscode/tree-sitter-wasm` 声明位置 |
| `package-lock.json` (node_modules/web-tree-sitter 段) | §2.3, §9 | 已 pin `web-tree-sitter-0.26.9.tgz` 的事实 |
| `CLAUDE.md` `Big-picture architecture` + `Commands` | §3.2, §9 | FileEditTool 在 9 个 lane 共享可达的证据 |

---

## 11. Engram mirror

```
project = "tau"
category = "decision"
text = "FU-1 treesitter baseline failures root cause: SUT and test both correct; failure is environment-only because node_modules/ is empty (no bun install step). Fix path = candidate A: add `bun install --frozen-lockfile` step to ci.yml unit-tests job. session-1 archive's 'likely API drift or test bug' assumption is incorrect. Absorb FU-5 (same root cause). strict TDD: red is the existing failure, green is the install step, no refactor."
keywords = treesitter, baseline, bun-install, FU-1, FU-5, ci.yml, validateEdit, FileEditTool
anticipated_queries = treesitter validateEdit baseline failure fix; bun test red 3 tests src/utils/treesitter/validateEdit.test.ts; add bun install ci.yml unit-tests job; FU-1 FU-5 merge root cause
```

Engram learning id (filled after `yesmem_remember`):

- **decision card id**: `#5949`（`yesmem_remember` 写入，category=decision）

> 注：learning #5949 supersedes 学习轨迹上 session-1 archive 隐含的"API drift / test bug"假设；session-2 init §0.4 已登记 init card #5947 / registry card #5948，本 card #5949 沿同一 id 池递进。

---

## 12. Next subagent / Next recommended

本 propose 完成后：

1. **sdd-spec** (`cc-router/model-opus` producer)：把候选 A 写成具体 spec（CI step 序列 / 失败模式 / 不动文件清单）。verify-code 阶段由 sonnet 评审。
2. **sdd-design** (`cc-router/model-opus` producer)：写入 design（具体 diff：`.github/workflows/ci.yml` 增加 6 行）。verify-code 由 sonnet 评审。
3. **sdd-tasks** (`cc-router-via-yesmem/model-haiku` prep)：写实现 checklist（1 任务：edit ci.yml）。
4. **sdd-apply-code** (`cc-router/model-opus` producer)：单步落地 edit ci.yml。
5. **sdd-verify-units** (`cc-router/model-sonnet` reviewer)：跑 `bun run src/utils/treesitter/validateEdit.test.ts`，确认 6 passed, 0 failed。
6. **sdd-archive** (`cc-router-via-yesmem/model-haiku` prep)：勾掉 session-2 init §10.3 FU-1 与 FU-5 行。

> **不建议**先跑 onboard。session-2 preflight §Next action 已经说"不要重跑 init"；同样不要再跑 onboard（scope creep）。

---

## Done condition (本 propose 子任务)

- [x] `taskReadme/sdd-propose-fu-1-treesitter-baseline-fix.md` exists.
- [x] Metadata block §0 完整（created_at, change_id, change_slug, session_id, producer_model, preflight_ref, supersedes, engram_mirror_id slot）。
- [x] Engram decision card 已写入并返回 id；id 已填入 §11（learning #5949）。
  → **id-filled**：#5949（category=decision，project=tau）
- [x] §0 引用 session-2 preflight、session-2 init、session-1 archive。
- [x] §1–§9 全部覆盖（why / what / who / out-of-scope / constraints / acceptance / risks / open questions / lineage）。
- [x] 文件以 `— end of propose —` 结尾（见下）。

---

**result: done**

— end of propose —
