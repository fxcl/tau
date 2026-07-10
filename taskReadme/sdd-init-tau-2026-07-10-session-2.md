# sdd-init — tau (session 2, opus-grade)

> ## Supersession
>
> 本文件**取代** `taskReadme/sdd-init-tau.md`（session 1，2026-07-10，由 cc-router-via-yesmem/model-haiku 产出）。
> session 1 init 的 stack/conventions/architecture/testing_capability/registry 描述仍作为**上下文/stale contextual**
> 保留，但本文件中以下事实已被显式更正：
>
> | 项 | session 1 表述 | 实际（session 2 重新探测） | 证据 |
> |---|---|---|---|
> | `package.json` `scripts.test` | "absent" | **存在**：`"test": "bun test"`（第 35 行） | `cat package.json \| sed -n '30,40p'` |
> | `.github/workflows/ci.yml` unit-tests job | "absent" | **存在**：matrix `{ubuntu-latest, macos-latest}`，`bun-version: latest`，运行 `bun test` | `cat .github/workflows/ci.yml \| sed -n '1,55p'` |
> | `unit-tests` job 是否覆盖 Windows | (未提) | **故意排除**："bun on Windows CI is flaky" | ci.yml 注释行 |
> | session 1 完成度 | 仅 init 完毕 | 已完成完整 cycle（add-test-script-and-ci-test-step）并 archive；Engram learning #5923–#5927 | taskReadme/sdd-archive-add-test-script-and-ci-test-step.md |
> | follow-up 1（treesitter 测试 3 失败） | (未提) | 仍 open：src/utils/treesitter/validateEdit.test.ts 的 3 个 cases 是 pre-existing baseline failure，session-1 archive 显式 non-blocking | taskReadme/sdd-archive-add-test-script-and-ci-test-step.md §Closure verdict |
> | session 1 §10 next_recommended 中 chained_pr_strategy = single PR per task、review_budget = 1 | 适用 | **已被 session 2 preflight 取代**：chained-PR + full-GAN(opus+sonnet) | taskReadme/sdd-preflight-tau-2026-07-10-session-2.md §3 + §4 |
>
> 重新生成原因（per preflight §Supersession + sap.md GAN 政策）：
> session 1 init 由 haiku 在 session 1 preflight（execution_mode = `init+onboard`）下产出；session 2
> preflight 切换到 `heavy-SDD` 并要求 `full-GAN`，按 SAP 异构原则，同模型（haiku）重做 haiku
> 等于 self-review violation（FAIL），因此本 init 必须由 opus 在 session 2 preflight 下重新生成。

## Metadata

- **created_at**: 2026-07-10T20:45:00Z
- **project**: tau (multi-provider AI coding CLI, v0.92.12)
- **repo_head**: `125b8bf21225c83b208270f9ec0ccce036a890ac` on **master**
  (verified via `git rev-parse HEAD && git rev-parse --abbrev-ref HEAD`)
- **repo_root**: `/Users/vec/workspace/js/pi/tau`
  - **filesystem_case_caveat**: macOS HFS+ 大小写不敏感，`/Users/vec/workspace/js/PI/tau` 与
    `/Users/vec/workspace/js/pi/tau` 解析到同一目录。本文件全文按 preflight 约定统一用 `pi`。
- **session_id**: `sdd-init-tau-2026-07-10-session-2`
- **sub_agent_model**: `cc-router/model-opus` (production tier, GAN producer)
- **preflight_ref**: `/Users/vec/workspace/js/pi/tau/taskReadme/sdd-preflight-tau-2026-07-10-session-2.md`
- **supersedes**: `/Users/vec/workspace/js/pi/tau/taskReadme/sdd-init-tau.md` (保留为 stale contextual)
- **engram_mirror_id**: 见 §0.4

### 0.1 Authoritative preflight contract (本会话)

| 参数 | 值 |
|---|---|
| `execution_mode` | `heavy-SDD` |
| `artifact_store` | `taskReadme + Engram mirror`（filesystem = source of truth） |
| `chained_pr_strategy` | `chained-PR`（base = `develop`，fallback = `master`） |
| `review_budget` | `full-GAN (opus+sonnet)` |
| producer model (本 run) | `cc-router/model-opus` |
| reviewer model (后续 verify-* 阶段) | `cc-router/model-sonnet` |

### 0.2 SAP GAN tier-heterogeneity（本会话 contract）

| 阶段层 | 模型 |
|---|---|
| prep/survey（init/explore-*/propose/tasks/archive） | `cc-router-via-yesmem/model-haiku` |
| production（spec/design/apply-*） | `cc-router/model-opus` |
| review（verify-*） | `cc-router/model-sonnet` |

同模型自审 = FAIL；本 init 之所以必须由 opus 重做 haiku 的旧 init，正是为了避免 haiku→haiku 的同模型违规。

### 0.3 File-system truth + Engram mirror 约定

- **唯一真相源**：filesystem（`taskReadme/sdd-init-tau-2026-07-10-session-2.md`）。
- **Engram 镜像**：通过 `yesmem_remember(project="tau", category="fact", ...)` 写入，仅作镜像，
  不替代文件系统。Engram learning id 见 §0.4。
- **禁止并行目录**：不写 `proposals/<change>.md`、`specs/<change>.md`、`designs/<change>.md`、
  `tasks/<change>.md`、`sdd/`、`.sdd/`、`openspec/`、`.openspec/`。这些路径在 §6 中逐项确认仍不存在。

### 0.4 Engram learning id（已写入，2026-07-10）

- **init card**: `#5947`（`yesmem_remember` 写入，category=fact，supersedes `#5921` 即 session 1 init card）
- **registry card**: `#5948`（`yesmem_remember` 写入，category=fact，supersedes `#5922` 即 session 1 registry card）
- 重做本 init 时：用 `forget_memory` 删除 `#5947` / `#5948`，然后重新 `yesmem_remember`，并在 §0.4 更新。

## 1. Stack detection（重新探测，2026-07-10）

| 项 | 值 | 证据 |
|---|---|---|
| language | TypeScript（`strict: true`、`allowImportingTsExtensions: true`、`jsx: react-jsx`、`target/module: ESNext`、`moduleResolution: bundler`） | `/Users/vec/workspace/js/pi/tau/tsconfig.json` |
| runtime | Node.js ≥ 20（`engines.node: ">=20.0.0"`），CI matrix 跑 Node 20.x + 22.x | `/Users/vec/workspace/js/pi/tau/package.json` 第 56 行；`.github/workflows/ci.yml` |
| module_system | ESM（`"type": "module"`） | `package.json` 第 12 行 |
| package_manager | npm（CI 跑 `npm ci`；build 路径为 Node + esbuild） | `package.json` scripts + ci.yml |
| lockfiles | `bun.lock`（89953 bytes） + `package-lock.json`（351344 bytes）双锁并存 | `ls -la` |
| 锁文件分工 | `bun.lock` 供 test runner 使用；`package-lock.json` 驱动 `npm ci` | CLAUDE.md 「Big-picture architecture」段 + 双锁文件大小观察 |
| bundler | esbuild `^0.28.0`（devDep） | `package.json` 第 167 行 |
| test_runner | bun（standalone 运行 `*.test.ts`；无 `bunfig.toml`） | `find src -name "*.test.ts" \| wc -l = 88`；sample `src/utils/path.test.ts` 第 3 行 `Run: bun run src/utils/path.test.ts` |
| native_helpers | Go 二进制：`native/shell-parser/`（1 file `main.go`） + `native/tau-tools/`（7 files: main.go + fuzzy/git/highlight/markdown/pick/sysinfo） | `find native -name "*.go"` 共 8 个 `.go` |
| native-ts shims | `src/native-ts/{color-diff, file-index, yoga-layout}` | `ls src/native-ts` |
| optional_native | `@cortexkit/aft-*-<platform>`（6 个 per-OS 二进制，optionalDependencies），peer dep `@computer-use/nut-js ^4.2.0` | `package.json` 第 144–158 行 |
| observability | OpenTelemetry SDK trace/logs/metrics（`@opentelemetry/{api,core,resources,sdk-logs,sdk-metrics,sdk-trace-base,semantic-conventions}`） + `pino ^9.0.0` + `ajv ^8.17.1` schema validation | `package.json` dependencies |
| rpc / protocol | MCP（`@modelcontextprotocol/sdk ^1.12.1`）+ ACP（`@agentclientprotocol/sdk ^0.26.0`）+ vscode-languageserver stack + tree-sitter-wasm | `package.json` dependencies |
| CLI 入口 | `bin.tau` 与 `bin.claudex` 均指向 `dist/cli.mjs`（双 alias） | `package.json` 第 14–18 行 |
| 启动脚本 | `npm run build` = `node build.mjs`；`npm run build:bun` = `bun run build.ts`；`npm run test` = `bun test`（**注意：session 1 标"absent"，已被本表更正**） | `package.json` scripts |

## 2. Conventions

- **path_alias**：`src/*` → `./src/*`（tsconfig `paths`）。跨主模块边界时优先使用 alias 而非深相对路径。
- **tsconfig**：`strict: true`、`allowImportingTsExtensions: true`、`allowJs: true` + `checkJs: false`、
  `forceConsistentCasingInFileNames: true`、`skipLibCheck: true`。
- **顶层布局**（root）：
  - `src/`（产品代码：`lanes/`、`tools/`、`commands/`、`services/`、`entrypoints/`、...）
  - `native/`（Go helpers：`shell-parser/`、`tau-tools/`）
  - `scripts/`（`build-native-*.mjs`、`preinstall.mjs`、`postinstall.mjs`、`smoke_command_help.mjs`、`verify-deps.mjs`）
  - `tau-vscode/`（独立 VSCode 扩展子包，own `package.json` v0.6.0、own lint `scripts/lint.js`、own `node --test` runner）
  - `docs/`、`plugins/`、`editors/`、`taskReadme/`、`build.mjs`、`build.ts`、`tsconfig.json`、`CLAUDE.md`
- **naming**：文件名 kebab-case（`smoke_command_help.mjs`、`bashCommandPlanner.test.ts`）；
  PascalCase 给 components/screens；lane 目录用裸 family 名（`claude/`、`gemini/`、`codex/`、...）。
- **entry bins**：`tau` 与 `claudex` 都是 `dist/cli.mjs` 的 dual alias。
- **formatting / linting at repo root**：**NONE** — 无 `.eslintrc*`、`eslint.config.*`、`.prettierrc*`、
  `prettier.config.*`。Lint 只存在于 `tau-vscode/scripts/lint.js`，作用域隔离。
- **type_checking**：TypeScript 通过 `tsconfig.json`；**没有** `tsc --noEmit` 脚本串入 `package.json` 或 CI。
- **file_headers / 测试 docstring**：测试文件顶部带 docstring 注明运行方式（例 `src/utils/path.test.ts` 第 3 行
  `Run: bun run src/utils/path.test.ts`），确认 bun-as-runner 约定。
- **`.gitignore`**（project-local hygiene）：除标准 `node_modules/`/`dist/`/`.claude/`/`*.log`/`.env*` 之外，
  显式忽略 `reference/`、`tmp/`、`src/utils/fallback/detect.test.ts`、`proxy.mjs`。
  后两条表明作者把局部实验/scratch 局部忽略，避免污染仓库。
- **`.npmrc`**：`fund=false`（关闭 npm funding 求捐）。

## 3. Architecture map

### 3.1 Top-level `src/` 顶层（57 entries）

```
src/
├── entrypoints/         # cli.tsx（主 TUI）、mcp.ts、init.ts、sdk/、sandboxTypes.ts、agentSdkTypes.ts
├── lanes/               # 中心 lane 架构
│   ├── index.ts         # dispatcher 入口
│   ├── dispatcher.ts    # 自动按 model name → lane 路由
│   ├── bridge.ts        # lane ↔ shared-layer interop
│   ├── provider-bridge.ts  # shared HTTP providers（openai-compat）
│   ├── types.ts         # lane 接口
│   ├── tool_filter.ts
│   ├── shared/          # lane 间复用代码（cache_stability / mcp_bridge / sandbox /
│   │                    #   shell_workdir / search_replace / apply_patch / system_slots /
│   │                    #   volatile_freeze / memory_merge / lazy_tools_core / health_score /
│   │                    #   invariants / cross_lane_parity / shim_deletion_readiness / tool_use_ir）
│   │                    #   多带 .test.ts sibling
│   └── <lane>/          # 9 lane 目录：claude/ cline/ codex/ cursor/ gemini/ kilo/ kiro/ openai-compat/ qwen/
├── services/
│   ├── api/
│   │   ├── providers/   # 20 个 .ts 文件（含 base_provider.ts 定义 AnthropicStreamEvent IR；
│   │   │                #   内含 3 个 .test.ts：gemini_cache.test.ts / gemini_code_assist.test.ts /
│   │   │                #   openai_provider.test.ts / sanitizeProviderMessages.test.ts）
│   │   ├── adapters/    # 跨厂商 IR 适配器（含 gemini_to_anthropic_cache.test.ts / openai_responses.test.ts）
│   │   └── *.ts at root # claude.ts / client.ts / providerUsage.ts / cacheAffinity.ts / errors.ts 等
│   ├── tools/           # 服务层工具（含 fuzzy/）
│   ├── mcp/ plugins/ oauth/ voice/ snapshot/ settingsSync/ compact/ extractMemories/ lsp/ pty/
├── tools/               # 69 个 self-contained 工具目录；每个工具独立目录
│                        #   （AFTTool/AgentTool/ArtifactCanvasTool/AskUserQuestionTool/BashTool/
│                        #    BriefTool/ChangeRiskTool/CodebaseRetrievalTool/ComputerTool/ConfigTool/
│                        #    DeployPreviewTool/DiffArtifactTool/EnterPlanModeTool/EnterWorktreeTool/
│                        #    ExitPlanModeTool/ExitWorktreeTool/FileDiffTool/FileEditTool/FileReadTool/
│                        #    FileWriteTool/GitHistorySearchTool/GlobTool/GrepTool/InspectSiteTool/
│                        #    IntegrationHubTool/ListMcpResourcesTool/LSPTool/McpAuthTool/MCPTool/
│                        #    MermaidRenderTool/NativeTools/NotebookEditTool/PackageManagerTool/
│                        #    PowerShellTool/ProjectWorkflowTool/PtyTool/ReadMcpResourceTool/
│                        #    RemoteTriggerTool/REPLTool/RepoContextScoutTool/...）
├── commands/            # 123 个 slash command 目录；`learned/` 为 self-learning hub；
│                        #   `safetest/`、`statistics/` 等
├── components/ screens/ ink/   # Ink + React TUI
├── acp/                 # Agent Client Protocol support
├── mcp/ plugins/ hooks/ skills/ voice/ vim/ keybindings/   # extension surfaces
├── query/               # token budgeting、stop hooks、config、deps
├── assistant/ bridge/ buddy/ coordinator/ lanes/ moreright/ remote/ tasks/  # subsystems
├── native-ts/           # TS shims → Go 二进制（color-diff、file-index、yoga-layout）
├── bootstrap/ migrations/ state/ schemas/ types/ utils/ constants/ context/   # cross-cutting
├── memdir/ outputStyles/ server/ upstreamproxy/ replLauncher.tsx/
└── *.tsx/*.ts at root   # main.tsx、cli.tsx、QueryEngine.ts、history.ts、Task.ts、Tool.ts、ink.ts、...
```

### 3.2 Lane architecture（CLAUDE.md 大图）

> "The central concept is a **lane**: a complete native agent loop for one model family
> (anthropic/claude, gemini, codex, openai-compat, qwen, kiro, cursor, cline, kilo).
> Each lane owns its own agent loop, tool registry, system prompt, and API client."

- Interop 边界 = `AnthropicStreamEvent`（`src/services/api/providers/base_provider.ts`）。
- 所有 vendor API 翻译到这一 IR；bridge 层将它们暴露为统一的 tool / permission / MCP surface。
- 路由是自动的 — 用户选 model，永远不显式选 lane；dispatcher 从 model name 解析。
- Lane 目录实测：`claude/ cline/ codex/ cursor/ gemini/ kilo/ kiro/ openai-compat/ qwen/` 共 **9 个** lane
  + `shared/`（lane 间共用）。

### 3.3 Shared services layer

`src/` 在 `lanes/` 之外的所有代码拥有：session、permissions、tool 实现、MCP、UI、slash commands。

### 3.4 Entrypoints

- `src/entrypoints/cli.tsx` — 主 TUI（Ink + React）
- `src/entrypoints/mcp.ts` — MCP server
- `src/entrypoints/init.ts` — project onboarding
- `src/entrypoints/sdk/` — headless SDK surface（`controlSchemas.ts`、`coreSchemas.ts`、`coreTypes.ts`）

### 3.5 Native helpers

- `native/shell-parser/main.go`（1 文件）→ 由 `src/tools/BashTool/` 使用
- `native/tau-tools/`（7 文件：`main.go` + `fuzzy/git/highlight/markdown/pick/sysinfo`）→
  由 `src/services/tools/fuzzy/` 与 file-index 子系统使用
- TS shims：`src/native-ts/{color-diff, file-index, yoga-layout}/`
- 构建：`scripts/build-native-shell-parser.mjs`、`scripts/build-native-tools.mjs`（均为 esbuild 风格 Node 脚本）

### 3.6 Build mechanics

`build.mjs` 是 esbuild 驱动的 Node 脚本。它：

1. 把 `src/entrypoints/cli.tsx:1` 用的 `bun:bundle` feature-flag imports 做 shim
2. 内联 `MACRO` 常量（VERSION 等）
3. 输出 `dist/tau.mjs`（bundle 后的 CLI）+ `dist/cli.mjs`（launcher）
4. `prepublishOnly` 在发布前跑 `node build.mjs`

`build.ts` 是另一条 Bun 路径（`npm run build:bun`），仅作 contributor-convenience，
**不** 是 shipped artifact（CI `build-bun` job 也只在 ubuntu-latest 上跑）。

## 4. Testing capability（重新探测）

- **runner**：bun（隐式：通过 file extension + `bun.lock` + 测试文件 docstring `Run: bun run …`）。
- **file_pattern**：`*.test.ts`，colocated with source。
- **`.test.ts` count**（重测）：`find src -name "*.test.ts" -type f \| wc -l = 88`
  （session 1 报 88，本会话复核一致）。
- **test 目录分布**（24 个父目录）：
  - `src/lanes/shared/`：11（apply_patch / cache_stability / cross_lane_parity / health_score /
    invariants / mcp_bridge / search_replace / shell_workdir / shim_deletion_readiness / tool_use_ir）
    — 实际目录中还有同类，详见实测 list
  - `src/lanes/gemini/`：11（antigravity_banner / antigravity_cache / antigravity_headers /
    antigravity_latency / api_cache / ask_user_tool / image_tool_result / lazy_tools / quota /
    validated_mode / ...）
  - `src/lanes/openai-compat/`：11（cache_debug / copilot_cache / deepseek_base_url /
    deepseek_history / lazy_tools / opencode_go / openrouter_boundary / openrouter_gemini_cache /
    shell_descriptions / tool_repair / transformers）
  - `src/lanes/cursor/`：4（loop / protobuf / request / tools）
  - `src/lanes/{claude,cline,codex,kiro,qwen}/`：各 1（lane.test.ts）
  - `src/lanes/kilo/`：2（cache / tool_args）
  - `src/tools/BashTool/`：12（backgroundDetachValidation / bashCommandParts / bashCommandPlanner /
    bashFailureGuidance / bashPreflightValidation / bashRetryGuard / bashSyntaxValidation /
    bashWorkdir / commandHelp / commandSemantics / nativeShellParser / prompt）
  - `src/tools/FileEditTool/`：1（readFirstGuard）
  - `src/tools/WebSearchTool/`：1（mcpWebSearch）
  - `src/utils/`：~25
  - `src/utils/{bash,model,shell,teamMode,treesitter}/`：各 1–3
  - `src/services/api/`、`src/services/api/{adapters,providers}/`、`src/components/`、
    `src/commands/statistics/`：少数
- **test_harness_style**：**手写**（不是 bun 的 `describe`/`it` from `bun:test`）。
  Sample（`src/utils/path.test.ts`）：
  ```ts
  function test(name: string, fn: () => void): void { … try { fn(); passed++ } catch … }
  function assertEqual(actual, expected, hint) { … }
  ```
  进程只在 `failed > 0` 时非零退出；每个文件可独立跑 `bun run <file>.test.ts`。
- **coverage_support**：**NONE** — 无 `.c8rc*`、`c8.config.*`、`vitest.config.*`、`jest.config.*`、
  `bunfig.toml`；脚本与 CI 中都无 `--coverage` 标志。
- **test_command_in_package_json`：**存在 `"test": "bun test"`（`package.json` 第 35 行）。
  session 1 标"absent"——**已被本会话更正**。
- **CI test step**：**存在** `.github/workflows/ci.yml` 顶部的 `unit-tests` job：
  - matrix `{ubuntu-latest, macos-latest}`（**故意排除 windows-latest**，注释："bun on Windows CI is flaky"）
  - 步骤：checkout → `oven-sh/setup-bun@v1`（`bun-version: latest`）→ `bun test`
  - trigger：push to master + pull_request to master + workflow_dispatch
  - **session 1 标"absent"——已被本会话更正**
- **tau-vscode sub-package**：独立 test runner — `npm run test = node --test ./src/*.test.js`
  （作用域仅限 `tau-vscode/`）。
- **slow_tests_handling**：**NONE** — 没有 `slow/` dir、没有 `test:integration` split、
  没有 `vitest --bail`、没有 sharding config。
- **pre-existing baseline failures**（**重要**）：session 1 archive 显式记录
  `bun test` exit 1 是因为 `src/utils/treesitter/validateEdit.test.ts` 有 3 个 pre-existing 失败用例
  （`flags an edit that introduces a syntax error (.ts)`、`flags a broken new file (.tsx)`、
  `flags a broken edit (.py)`），与该 PR 无关、列为 non-blocking follow-up。
  本 init 在「后续 change 推荐」中把这条标记为 **open follow-up**（不应在普通 change 中静默重跑/重写该测试文件）。

## 5. Strict TDD verdict

| 机制 | 是否存在 | 证据 |
|---|---|---|
| RED → GREEN → REFACTOR scaffolding（templates / lane agents） | ❌ NO | 全仓 + 全 opencode global skills 中没有 `tdd/`、`red-green-refactor` skill/agent（见 §8 完整 registry） |
| Pre-commit test hook（husky / pre-commit / lefthook） | ❌ NO | 无 `.husky/`、无 `.pre-commit-config.yaml`、无 `lefthook.yml` |
| Coverage gate（CI 在阈值下失败） | ❌ NO | 无 coverage tool；没有阈值可守 |
| Test-on-save / watch script | ❌ NO | 无 `test:watch`、无 `bun --watch` script |
| `test` script in package.json | ✅ YES（**session 2 校正**） | `"test": "bun test"`，`package.json:35` |
| CI step that runs unit tests | ✅ YES（**session 2 校正**） | `.github/workflows/ci.yml` `unit-tests` job |
| 自定义 `test()` harness 项目内统一使用 | ✅ YES | 88 个文件用同一手写 harness — 但这是约定，**非强制** |
| 测试样例存在 | ✅ YES | `src/utils/path.test.ts`、`src/lanes/shared/invariants.test.ts` 等 |

**诚实判定**：**比 session 1 显著升级**——`test` script + CI unit-tests job 现已存在，
但其余硬护栏（pre-commit、coverage、watch、RED-GREEN-REFACTOR scaffolding）**仍缺失**。
即：testing **practice** 成熟、convention 已落地，但 strict TDD 的 enforcement **仍无**。

如果 orchestrator 想开启 strict TDD，apply lanes 必须补偿：
- `sdd-verify-units` 必须运行 `bun test` 并接受 non-zero 退出当且仅当失败列表**仅**包含
  `src/utils/treesitter/validateEdit.test.ts` 的 3 个已知 baseline failures。
- 不设 coverage 阈值。
- 沿用既有 `*.test.ts` colocated 约定作为测试文件位置规范。
- 不在变更中途引入 coverage 工具（独立大决定，需用户单独批准）。

## 6. Existing SDD artifacts

按 ROOT_POLICY 禁列逐项核对：

| 路径 | 状态 |
|---|---|
| `proposals/` | **absent** |
| `specs/` | **absent** |
| `designs/` | **absent** |
| `tasks/` | **absent** |
| `sdd/` | **absent** |
| `.sdd/` | **absent** |
| `openspec/` | **absent** |
| `.openspec/` | **absent** |
| `taskReadme/` | **present**（含 9 个 markdown：session-1 preflight + session-1 init + session-1 完整 cycle (propose/spec/design/tasks/archive for `add-test-script-and-ci-test-step`) + session-2 preflight + 本文件） |
| `.atl/` | **present**（含 `skill-registry.md`，由本会话重写） |

无 stale/legacy SDD content 与本会话冲突。session 1 的 init/propose/spec/design/tasks/archive 文件
保留为**上下文/stale contextual**，仅引用、不修改。

## 7. Codegraph index status

- `.codegraph/` 目录：**absent**（`/Users/vec/workspace/js/PI/tau/.codegraph/` 不存在）。
- per skill 规则：sdd-init **MUST NOT** 初始化 codegraph（属于独立 lane）。
- 本 init 不动 codegraph 状态。

## 8. Registry summary

> 本会话额外发现的差异（vs session 1 registry）：
> - 全局 opencode skills 列表现包含 `sdd-verify`（aggregator/legacy 名称，与
>   `sdd-verify-code/-units/-pwauto/-pwcli` 并存）。session 1 未列。
> - `.atl/skill-registry.md` 由本会话**整体重写**为 session 2 版本（见 §11 artifacts）。

### 8.1 Project-local skills

**None** — `/Users/vec/workspace/js/pi/tau/skills/`、`.opencode/skills/`、`.claude/skills/`、`.atl/skills/`
均不存在。
注：`src/skills/` 是 in-product slash command 的 feature surface，不是 agent skill registry，
**不应** 被当作 agent-skills 目录。

### 8.2 Project-local agents

**None** — `/Users/vec/workspace/js/pi/tau/agents/` 不存在；无 `agent.json` / `agent.yaml` 在 repo root。

### 8.3 Project-local rules

| 路径 | Kind | Layer | 备注 |
|---|---|---|---|
| `/Users/vec/workspace/js/pi/tau/CLAUDE.md` | markdown | rule（`AGENTS.md` 的等价物） | **权威** repo context；stack、lane architecture、build、conventions 全在 |
| `/Users/vec/workspace/js/pi/tau/COMMANDS.md` | markdown | reference（非 rule） | slash command 文档 |
| `/Users/vec/workspace/js/pi/tau/PROVIDERS.md` | markdown | reference（非 rule） | provider 列表 |
| `/Users/vec/workspace/js/pi/tau/PROMPTS.md` | markdown | human note | 自由形式用户 prompt 历史，**不是 rule** |
| `/Users/vec/workspace/js/pi/tau/README.md` | markdown | project intro | 用户面向 |

无顶层 `AGENTS.md`。`CLAUDE.md` 是项目权威规则。

### 8.4 Global SDD lane skills（orchestrator 路由集）

以下 22 个 skill 全部 verified 存在于 `/Users/vec/.config/opencode/skills/<name>/SKILL.md`：

- **核心 cycle**：sdd-onboard、sdd-init、sdd-propose、sdd-spec、sdd-design、sdd-tasks
- **explore lanes**：sdd-explore-code、sdd-explore-research、sdd-explore-pwcli
- **apply lanes**：sdd-apply-code、sdd-apply-doc、sdd-apply-unit-tests、sdd-apply-pwauto-tests
- **verify lanes**：sdd-verify、sdd-verify-code、sdd-verify-units、sdd-verify-pwauto、sdd-verify-pwcli
- **support lanes**：sdd-browser-runtime-context、sdd-archive、sdd-apply（deprecated，**do not invoke**）
- **GitHub workflow**：gh-specialist

### 8.5 Detected stack skills（从 package.json deps）

| 库 | 版本 | 最佳实践 skill | 何时加载 |
|---|---|---|---|
| `@anthropic-ai/sdk` | ^0.50.1 | `claude-api`（global，`~/.claude/skills/`） | 写 Anthropic 专属 lane 代码 / prompt tooling 时 |
| `@modelcontextprotocol/sdk` | ^1.12.1 | (无 specific) | — |
| `react` + `react-reconciler` | ~19.1.0 / ~0.32.0 | (无 specific) | — |
| `esbuild` | ^0.28.0 | (adjacent: `vite`) | — |
| `zod` | ^3.25.0 | `typescript-best-practices` | 设计 schema / type contract 时 |
| `@opentelemetry/*` | various | (无 specific) | — |
| `pino` | ^9.0.0 | (无 specific) | — |
| `pyright` | ^1.1.410 | (无 specific; devDep 旁挂) | — |
| `vscode-languageserver-*` | various | `vscode-extension` | 涉及 LSP 子系统时 |
| `@vscode/tree-sitter-wasm` / `web-tree-sitter` | ^0.3.1 / ^0.26.9 | (无 specific) | — |

`package.json` 中没有任何库声明 project-local skill override。

## 9. Existing SDD artifacts (cross-session 索引)

session 1 在本 repo 已留下完整 SDD cycle 痕迹，全部位于 `taskReadme/` 下：

| 文件 | 角色 |
|---|---|
| `taskReadme/sdd-preflight-orchestrator-2026-07-10.md` | session 1 preflight（已被 session 2 preflight 取代） |
| `taskReadme/sdd-init-tau.md` | session 1 init（已被本文件取代，保留作 stale contextual） |
| `taskReadme/sdd-propose-add-test-script-and-ci-test-step.md` | session 1 cycle 的 propose |
| `taskReadme/sdd-spec-add-test-script-and-ci-test-step.md` | session 1 cycle 的 spec |
| `taskReadme/sdd-design-add-test-script-and-ci-test-step.md` | session 1 cycle 的 design |
| `taskReadme/sdd-tasks-add-test-script-and-ci-test-step.md` | session 1 cycle 的 tasks |
| `taskReadme/sdd-archive-add-test-script-and-ci-test-step.md` | session 1 cycle 的 archive（含 5/5 Engram learning #） |
| `taskReadme/sdd-preflight-tau-2026-07-10-session-2.md` | **session 2 preflight（本会话权威）** |
| `taskReadme/sdd-init-tau-2026-07-10-session-2.md` | **本文件（session 2 init）** |

## 10. Next recommended（**session 2 contract：heavy-SDD + chained-PR + full-GAN**）

**与 session 1 §10 显著不同**。preflight 强制每条变更单独立项（chained-PR），
并要求 spec/design/apply-* 全走 sonnet 评审（full-GAN）。orchestrator 下一步不应该是
`sdd-onboard`，而应是 **等用户给定新变更名后启动 `sdd-propose`**。

### 10.1 立即后续

1. orchestrator 等待用户给出**新变更名**（change_id，kebab-case）。
2. orchestrator 启动 `sdd-propose` 写 `taskReadme/sdd-propose-<change_id>.md`（producer: opus，评审: sonnet）。
3. `sdd-propose` 必须显式 reference session 2 preflight 文件并标注 lineage。
4. 标准 cycle：`propose → spec → design → tasks → apply → verify → archive`。
   - `spec/design` = opus 产出 + sonnet 评审（verify-code 阶段）
   - `apply-*` = opus 实施 + sonnet 评审
   - `archive` = haiku（prep tier）
5. 每个阶段结束后，由该阶段的 sub-agent 自行镜像到 Engram 并在 taskReadme 中登记 learning id。

### 10.2 Apply / verify lanes 在本仓库的具体约束（必须告知后续 sub-agent）

| 约束 | 适用 lane | 原因 |
|---|---|---|
| **不跑** `npm run build`（除非 change 改动 build config 本身） | apply-code / verify-code | esbuild 构建慢，且本次 change 与构建链无关时不必触发 |
| **必须跑** `bun test` 并接受 3 个 baseline failures 来自 `src/utils/treesitter/validateEdit.test.ts` | verify-units | session 1 archive 显式标记这 3 失败是 non-blocking baseline |
| **不引入** coverage 工具 mid-change | apply-* / verify-* | 独立大决定，需用户单独批准 |
| **不动** `.eslintrc*` / `.prettierrc*`（本就不存在） | apply-code | lint policy 缺失是 known 状态 |
| **不动** `src/utils/fallback/detect.test.ts`（被 `.gitignore`） | apply-* | local-only scratch |
| test 文件位置：`src/**/*.test.ts`，colocated | apply-unit-tests | 与 88 个现有 test 文件一致 |
| 红→绿：在 apply-code 之前由 apply-unit-tests 先写 RED 测试 | apply-code / apply-unit-tests | 严格 TDD 流程 |
| CI 不重写 — 仅在改动 build path / scripts 时才改 ci.yml | apply-code | scope creep 防护 |
| postinstall 行为不重写 | apply-code | 涉及 ripgrep 下载、Ollama 云模型预拉取，影响开发者首次运行 |

### 10.3 当前 open follow-up（**不进入普通 change scope**）

| ID | 描述 | 来源 | 处置建议 |
|---|---|---|---|
| FU-1 | `src/utils/treesitter/validateEdit.test.ts` 3 个 baseline failures | session 1 archive §Closure verdict | **独立 change**：tree-sitter-wasm API drift 调查；不在普通 change 中重写/跳过该文件 |
| FU-2 | 决定是否引入 coverage 工具 | sdd-init §9 | 独立 ADR / 用户决策 |
| FU-3 | 决定是否加 pre-commit hook | sdd-init §9 | 独立 ADR |
| FU-4 | `unit-tests` job `bun-version: latest` → 待 green ~2 周后 pin 固定版本 | session 1 design §Open questions | 时间触发，约 2 周后由用户/ops 决定 |
| FU-5 | `unit-tests` job 是否需加 `bun install` 步骤 | session 1 design §Open questions | 观察 trigger，必要时改 |

### 10.4 可选 follow-up（**非本 init scope**）

- 考虑初始化 `.codegraph/`（out of lane，需用户 opt-in；启用后将带来 sub-agent 上下文收益）
- 考虑为 `unit-tests` job 加缓存（actions/cache）以加速 CI

## 11. Artifacts produced by this init

| 路径 | 类型 | 说明 |
|---|---|---|
| `taskReadme/sdd-init-tau-2026-07-10-session-2.md` | taskReadme（source of truth） | 本文件 |
| `.atl/skill-registry.md` | registry index | session 2 重写版（§11.2） |
| Engram fact card | mirror | `yesmem_remember(project="tau", category="fact", ...)`，id 见 §0.4 |

### 11.1 Stat 摘要（实际探测，session 2 复核）

- 顶层目录 `src/`：57 entries（重测 `ls src | wc -l`）。
- `*.test.ts` 文件总数：88。
- Provider `.ts` 文件数：`src/services/api/providers/` 20 个。
- 工具目录数：`src/tools/` 69。
- 命令目录数：`src/commands/` 123。
- Lane 目录数：`src/lanes/` 9 + `shared/`。
- Go 文件数：8（`native/shell-parser/main.go` 1 + `native/tau-tools/*.go` 7）。
- GitHub workflow：1（`ci.yml`），内含 5 job（unit-tests / test / windows-no-bash / build-bun + push trigger）。

### 11.2 `.atl/skill-registry.md` 重写要点（vs session 1）

- `Generated by` header：opus / 2026-07-10 / session 2。
- `Source of truth` 改为 session 2 preflight 文件。
- 新增 `sdd-verify`（aggregator）记录。
- Engram mirror 状态指向 session 2 的 learning id（§0.4）。

## 12. Risks / 已知隐患

- **baseline failures 阻断绿色信号**：CI `unit-tests` job 当前会因为 3 个 pre-existing 失败而红。
  verify-units 必须按 §10.2 显式豁免这 3 个用例，否则每次 change 都会误报回归。
- **`bun-version: latest`**：未固定版本 → 临时 schema drift 可能再次打断 CI。
  设计 §Open questions 已经要求 ~2 周后再 pin。
- **没有 coverage gate** + **没有 pre-commit**：单个 sub-agent 可能引入无测试的代码改动。
  apply-code / verify-code 必须人工把关「每个 PR 至少有一个对应的 *.test.ts」或显式豁免。
- **`bun.lock` 与 `package-lock.json` 双锁并存**：若两者漂移，npm install 与 bun test 的依赖图可能
  分歧。变更时应同时更新两个锁文件。
- **postinstall 网络依赖**：CI/本地首次安装需要 ripgrep 下载 + Ollama 云模型预拉取。
  apply-* 阶段不要触碰 `scripts/postinstall.mjs`，否则首装体验可能 break。
- **macOS HFS+ 大小写不敏感**：preflight 约定 lowercase `pi`，但 `PI` 也解析到同目录；
  跨平台迁移（如 git bundle 推到 Linux CI）可能引入大小写敏感冲突。CLAUDE.md / tsconfig 已开
  `forceConsistentCasingInFileNames: true`，所以 src 内是安全的；风险在 `taskReadme/` 这种
  metadata 路径的字符串引用上，本 init 全部统一用 lowercase `pi`。

## 13. Engram 镜像（已写入）

镜像策略：本 init 写完后调用 `yesmem_remember`，记录返回的 learning id 在 §0.4。

```
project = "tau"
category = "fact"
init card id = #5947 (supersedes #5921)
registry card id = #5948 (supersedes #5922)
```

— end of init —