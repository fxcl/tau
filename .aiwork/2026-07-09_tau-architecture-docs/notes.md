# Notes — 横切发现、陷阱与待补

> 这不是“另一个架构文档”，而是给后续读这份研究的人留下的**横向提醒**：哪些事实不是看一眼源码就能看出来的、哪些结论还没硬验证、哪些事情以后再回来补。

## 1. 一眼看不出的事实

### 1.1 Lane dispatcher 没有中央规则表

读 `dispatcher.ts` 时最常见的误判是“它里面有个 switch/case 把 model 名映射到 lane”。**不是**。

`resolveRoute` 的真实逻辑：

- `isAnthropicModel(model)` → Claude/含 `anthropic` → `{type:'existing', reason:'anthropic-native'}`，**完全跳过 lane**，回退到现有 `claude.ts` 路径
- 否则遍历 `_lanes`，调 `lane.supportsModel(model)`，第一个 true 即中
- 都没有 → `{type:'existing', reason:'no-lane-registered'}`，还是回退 existing

**含义**：Claude 走的是共享层那条“被打磨最久”的路径；lane 是给非 Claude backend 用的“可选加速器”。新增 lane 只需要在该 lane 的 index 里实现 `supportsModel()` + `run()`，dispatcher 不动。

### 1.2 IR 借的是 Anthropic 的形状

`AnthropicStreamEvent` 的事件名（`message_start` / `content_block_delta` / `message_delta` / `message_stop`）借自 Anthropic SDK 流式协议。`base_provider.ts` 注释明确：“Abstract base class for all third-party LLM providers”。

这不是命名偷懒：lane 层（尤其 claude lane）原生消费这套形状，能让 Claude 走 lane 的路径和现有 claude.ts 路径共用大量下游逻辑。代价是给非 Claude provider 加了一层翻译，但换来 lane 统一接口。

### 1.3 bun:bundle 是“假 import”

`src/entrypoints/cli.tsx:1` 和 `src/tools/BashTool/BashTool.tsx:1` 都有：

```ts
import { feature } from 'bun:bundle'
```

这不是真实依赖——esbuild plugin 在 `build.mjs` 里把 `bun:bundle` 重定向到一个返回常量 `false` 的本地模块。这样：

- `feature('XXX')` 在 bundle 里变成 `false`
- 整个 `if (feature('XXX')) { ... }` 分支被 tree-shake 掉
- 同一个源码树，可以构建出“包含”和“剥离”两种产物（这就是 Tau 发行版剥离 Anthropic 内部工具的方式）

**含义**：源码里看到 `bun:bundle` 不可怕，但**任何新增 `feature('XXX')` 调用都必须先确认它在 `build.mjs` 的 shim 名单里**，否则会 bundle 失败或运行时报错。

### 1.4 self-learning 不走后端 fork

构建期 patch 显式把 `EXTRACT_MEMORIES` 后台 fork 路径禁用（`build.mjs` 注释里说明）。所以：

- 抽取在主进程内同步进行
- 不会出现“内存里突然多了一个 fork”的诡异表现
- 也意味着长任务末尾可能有轻微停顿（被同步抽取占）

### 1.5 两个 bin 指向同一文件

`bin: { tau: 'dist/cli.mjs', claudex: 'dist/cli.mjs' }`——`tau` 与 `claudex` 行为完全相同，区分只是用户偏好入口名。看到 README 里只说 `tau`，但 npm 装上后 `claudex` 也可用。

### 1.6 测试不是 npm test

`package.json` **没有 `test` 脚本**。`.test.ts` 文件用 bun runner 跑（基于 `bun:bundle` 的存在 + `build:bun` 脚本 + 没有 vitest/jest 配置推断）。CLAUDE.md 已记。**实际跑通**之前，不要在 CI/PR 描述里写“tests pass”——除非用 `bun test` 跑过。

### 1.7 native Go 助手是多子命令，不是单功能

`native/tau-tools/main.go` 注册了 6 个子命令：`render-markdown` / `highlight-code` / `git-summary` / `sysinfo` / `fuzzy-rank` / `pick` + `help`/`version`。它们都是同一个二进制，按 argv[1] 分派。看到 `NativeTools/pick` 或 `NativeTools/gitSummary` 是不同 tool 注册项，但都 fork/exec 同一个 `tau-tools pick` / `tau-tools git-summary`。

### 1.8 AFT 是预编译原生二进制

`src/tools/AFTTool/` 后端是 `@cortexkit/aft-{platform}-{arch}`（6 个平台 prebuilt，在 `optionalDependencies`）。这是个**第三方闭源原生 SDK**，不是本仓代码。看到 AFT 相关 import 不要以为是 npm 上的纯 JS 包。

## 2. 与 README/COMMANDS.md 的差异

- README 里没强调 lane 架构（已在新 CLAUDE.md 里补）
- COMMANDS.md 里 `/learned` 描述了 UI 行为，但**没提 `CLAUDE_CODE_DISABLE_AUTO_MEMORY` 环境变量**——后者在 `src/memdir/paths.ts`，是门控
- COMMANDS.md 里 `/safetest` 没有给具体权限模型，看 `src/commands/safetest/` 才能确认

## 3. 隐性技术债（按重要程度）

1. **`bun:bundle` 残留** — 源码与 esbuild 构建高度耦合，新人很容易踩坑
2. **依赖量级（78 deps）** — 多数为 ink 生态与 UI 工具，单点升级需要谨慎；`patch-package` 在依赖中说明有 node_modules 定制修复
3. **6 个 `@cortexkit/aft-*` 平台二进制** — 跨平台分发需保证对应二进制可下载，否则 `AFTTool` 在该平台直接不可用
4. **node-pty 双源** — `node-pty`（optionalDeps）与 `@lydell/node-pty`（dependencies）并存，可能是为某平台的 prebuilt fallback；具体取舍原因未在源码注释中找到
5. **CLAUDE_CODE_* 环境变量前缀** — 多个门控用此前缀（`CLAUDE_CODE_DISABLE_AUTO_MEMORY` 等），与 Anthropic 命名空间重叠；Tau 的发行版是否沿用还是改名，看具体脚本而定

## 4. 未硬验证的项（[UNVERIFIED] 汇总）

| 项 | 当前位置 | 如何验证 |
|---|---|---|
| devDeps 列表 | `package.json` | 已核实 ✓ |
| optionalDeps 列表 | `package.json` | 已核实 ✓ |
| `bun:bundle` 的 feature flag 完整 shim 名单 | `build.mjs` | 读 build.mjs 的 feature() 调用点 vs shim 名单 |
| `@types/pdfkit` 对应的实际调用路径 | `src/` | `rg 'pdfkit\\|PDFDocument'` |
| patch-package 是否在使用 | repo | `ls patches/` |
| node-pty 双源原因 | 源码 | 读 `@lydell/node-pty` 的 README + 该仓导入处注释 |
| `@cortexkit/aft` 的语义与 API | AFTool 目录 | 读 `src/tools/AFTTool/index.ts` + 该 npm 包的 dist |
| cursor lane 的 protobuf schema | `src/lanes/cursor/` | 读 `protobuf.ts` 及 `.proto` 文件 |
| ACP convert 的双向映射 | `src/acp/convert.ts` | 全文 |
| plugins 生命周期 | `src/plugins/builtinPlugins.ts` | 全文 |

## 5. 推荐的进一步研究路径

按“从大到小、从公共到私”的顺序：

1. **共享层 query 循环**（`src/query/` + `claude.ts`）—— 一次完整对话的实际执行流
2. **claude lane** (`src/lanes/claude/loop.ts`) —— 如果 lane 路径生效，具体跑什么
3. **cursor lane 的 protobuf** —— 最复杂的一条 lane
4. **ACP convert** —— 与外部编辑器对接的关键转换
5. **plugin 系统** —— 真正的扩展点（hooks / commands / tools 注册）
6. **native-ts 调用点** —— Go 二进制被调用的所有位置与参数契约

## 6. 与同类项目的对比（观感层面）

| 项目 | 与 Tau 的关系 | 关键差异 |
|---|---|---|
| **Claude Code** | 同源（明显的 fork 痕迹：tool 名/hook 机制/CLAUDE.md/`bun:bundle`/内部模块 shim） | Tau 多 provider；剥离了部分 Anthropic 内部工具；加 self-learning |
| **OpenCode** | 架构借鉴（lane/plugin/provider 概念相似） | OpenCode 是纯多 provider，没有 Claude 那套工具面 |
| **Cline / Cursor / Codex CLI** | 作为 lane 被纳入 | 这些本身是独立 CLI；Tau 把它们的 backend 当作可调度的 backend |
| **droid / cline / continue** | 同类竞品 | 不在 lane 列表里 |

> Tau 的定位可以概括为“**Claude Code 体验 + OpenCode 多 backend**”，加上 self-learning 差异化。

## 7. 给后续会话的建议

- **改 build**：先读 `build.mjs` 的 shim/plugin/post-process patch 段——所有 Anthropic 内部模块的剥离都在那里。新增 `feature()` 调用前先确认 shim 已存在
- **改 lane 路由**：改 `dispatcher.ts` 通常错，先看是不是该改某个 lane 的 `supportsModel()`
- **新增 provider**：如果 OpenAI 兼容，继承 `OpenAIProvider`；否则实现 `BaseProvider.completeStream` 返回 `AsyncIterable<AnthropicStreamEvent>`，再考虑是否需要 `buildProviderStreamResult` 装订
- **新增工具**：建 `src/tools/<Name>Tool/`，用 `buildTool()`，注意 TUI 渲染组件放 `<Name>Tool.tsx`，安全敏感工具（如 Bash）必须有 preflight 检查链
- **改 self-learning**：门控在 `src/memdir/paths.ts` 的 `isAutoMemoryEnabled()`，存储路径在 `teamMemPaths.ts`
- **跑测试**：`bun test <path>`，不要找 `npm test`（不存在）

## 8. 本次研究的方法学记录

- 信息源优先级：源码（已读全文/全文节选）→ `package.json`（已结构化）→ README/COMMANDS.md（部分）→ 第三方文档（未引）
- 没有运行任何代码进行验证（未跑 `npm run build`、未跑 `bun test`）
- 推断项全部标注 `[UNVERIFIED]` 或列在 §4 的核验表中
- 文档语言：中文叙述 + 英文代码/路径/命令，与 README/CLAUDE.md 一致
