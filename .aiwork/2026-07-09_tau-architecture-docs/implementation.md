# Implementation — Tau 关键实现细节

> 配套：`architecture.md`（分层概览）、`research.md`（依赖）。本篇按“代码逐行”粒度，覆盖构建管线、dispatcher 路由、provider 翻译、工具生命周期、self-learning。所有代码片段来自当前源码（截至 2026-07-09）。

## 1. 构建管线（build.mjs, 466 行）

### 1.1 总体

`build.mjs` 是 Node + esbuild 脚本。步骤：

1. 依赖校验 `scripts/verify-deps.mjs`（install 与启动都会跑）
2. esbuild 打包 `src/entrypoints/cli.tsx` → `dist/tau.mjs`
3. esbuild plugin **shim 替换**内部模块
4. **MACRO 注入**构建期常量
5. 生成启动器 `dist/cli.mjs`（~20 行，preflight + require bundle）
6. 触发 native 构建：`scripts/build-native-shell-parser.mjs` + `scripts/build-native-tools.mjs`

### 1.2 shim：剥离 Anthropic 内部模块

构建脚本维护一个**禁止打包的外部模块清单**（节选）：

```
@anthropic-ai/bedrock-sdk
@anthropic-ai/foundry-sdk
@anthropic-ai/{tungsten,sandbox,computer-use,browser}
@internal/{sandbox,browser-tools,skills-runtime,sessions,oauth,...}
@ant/*  (Anthropic 内部命名空间)
```

策略：这些模块在源码里被 import，但通过 esbuild plugin 的 `onResolve` 钩子**重定向到本地空 stub**，使 `feature('XXX')` 调用被替换为 `false`，从而 tree-shake 掉整个内部代码分支。

具体机制：

```js
// build.mjs 中
feature('XXX')  //  → false（编译期常量替换）
```

`src/entrypoints/cli.tsx:1` 的 `import { feature } from 'bun:bundle'` 本身也被 shim——`bun:bundle` 不是真实依赖，esbuild plugin 把它指向一个返回常量 false 的模块。

意义：源码保留了对 Claude Code 内部工具（Tungsten、Sandbox、computer-use、browser、background PR 等）的引用，但**编译产物里这些分支被整段移除**，实现“同一份源码、不同发行版”的分叉策略。

### 1.3 MACRO 注入

构建期把以下常量写成字面量：

- `VERSION` ← package.json version（`0.92.12`）
- `CLAUDE_CODE_ENTRYPOINT` ← `'cli'` / `'mcp'` / …（决定入口行为分支）
- 相关 feature flag

注入方式：esbuild `define`。运行时这些是普通字面量，非环境变量。

### 1.4 后处理 patch（构建后对 bundle 的二次改写）

`build.mjs` 在 esbuild 输出后，对 `dist/tau.mjs` 做字符串级 patch（节选自源码注释与逻辑）：

| 改写 | 目的 |
|---|---|
| 关闭“读 config 的 guard” | 外部发行版不需要内部 config gate |
| `assertMinVersion` → no-op | Tau 自有版本管理，不走 Anthropic 的版本强校验 |
| `EXTRACT_MEMORIES` 后台 fork → 禁用 | self-learning **不**用后台 fork 抽取（显式注释说明） |
| `jsonc-parser` UMD → ESM | 该包 dist 是 UMD，需修成 ESM 才能被 bundle |
| CJS→ESM 互操作修复 | ajv、semver、shell-quote、qrcode、asciichart、vscode-jsonrpc、react、react-reconciler 的 CJS default import 修复 |
| `React.useEffectEvent` polyfill | React 19 的 useEffectEvent 在某些路径未稳定，注入 polyfill |

### 1.5 启动器 cli.mjs

`dist/cli.mjs`（启动器，不是 bundle）做的事：

1. **preflight**：`scripts/verify-deps.mjs` 检查关键运行时依赖（ripgrep、node 版本、native 二进制等）
2. **self-heal**：发现缺失依赖时尝试修复
3. `import('./tau.mjs')` 启动主逻辑
4. 环境变量 `TAU_SKIP_PREFLIGHT=1` 可跳过 preflight（用于开发/调试）

两个 bin 名 `tau` / `claudex` 都指向这个启动器。

## 2. Lane dispatcher 路由（src/lanes/dispatcher.ts）

### 2.1 数据结构

```ts
interface Lane {
  name: string
  displayName: string
  healthy: boolean
  supportsModel(model: string): boolean          // lane 自报能否处理
  run(context: LaneRunContext): AsyncGenerator<AnthropicStreamEvent, LaneRunResult>
}

type LaneRunContext = { model: string; signal: AbortSignal; cwd: string; /* … */ }
type LaneRunResult = { usage: NormalizedUsage; /* … */ }
```

### 2.2 路由算法

```ts
function isAnthropicModel(model: string): boolean {
  const m = model.toLowerCase()
  return m.startsWith('claude-') || m.includes('anthropic')
}

function findLaneForModel(model: string): Lane | null {
  for (const lane of _lanes) {
    if (lane.supportsModel(model)) return lane
  }
  return null
}

function resolveRoute(model: string): LaneRoute {
  if (isAnthropicModel(model))
    return { type: 'existing', reason: 'anthropic-native' }   // 不进 lane

  const lane = findLaneForModel(model)
  if (!lane)        return { type: 'existing', reason: 'no-lane-registered' }
  if (!lane.healthy) return { type: 'existing', reason: 'lane-unhealthy' }
  return { type: 'native', lane }
}

function dispatch(model, context): AsyncGenerator<AnthropicStreamEvent, LaneRunResult> | null {
  const route = resolveRoute(model)
  if (route.type === 'native') return route.lane.run(context)
  return null   // 调用方回退到现有 claude.ts 路径
}
```

### 2.3 关键不变量

- **Claude 永不进 lane**——走共享层 `claude.ts`（最成熟、功能最全的路径）
- 路由**只问 lane 的 supportsModel**，不解析 model 字符串做集中匹配 → 新增 lane 零侵入
- 任一异常（无 lane / 不健康）都**回退 existing**，绝不抛错中断用户请求
- `healthy` 反映 lane 自检（API 可达、配置就绪）；lane 自检失败时把自己标记 unhealthy

## 3. Provider 适配层（src/services/api/providers/）

### 3.1 IR：AnthropicStreamEvent

`base_provider.ts` 定义统一中间表示（节选，行号近似）：

```ts
// ~line 60
export interface AnthropicStreamEvent {
  type:
    | 'message_start'
    | 'content_block_start'
    | 'content_block_delta'
    | 'content_block_stop'
    | 'message_delta'
    | 'message_stop'
    | 'error' | 'ping' | …
  // 各 type 的专属字段（index, delta, content_block, message, usage …）
}

// ~line 170
export interface ProviderMessage {
  role: 'user' | 'assistant' | 'system'
  content: ContentBlock[]          // text / image / tool_use / tool_result
}

// ~line 196
export interface ProviderTool {
  name: string
  description: string
  input_schema: object             // JSON Schema（与 Anthropic tool 定义一致）
}
```

**注意命名**：这套 IR 借用 Anthropic 的流式事件形状（message_start / content_block_delta …），但 provider 本身可以接 OpenAI、Gemini、Bedrock 等。IR 选 Anthropic 形状是因为 lane 层（尤其 claude lane）原生消费它，开销最小。

### 3.2 BaseProvider 抽象

```ts
export abstract class BaseProvider {
  abstract completeStream(params: {
    model: string
    messages: ProviderMessage[]
    tools?: ProviderTool[]
    signal: AbortSignal
    // …
  }): AsyncIterable<AnthropicStreamEvent>

  // 共享：错误归一化、重试、限流处理、usage 统计
  protected normalizeError(e: unknown): ProviderError
  protected buildUsage(raw: unknown): NormalizedUsage
}
```

每个 provider 子类实现 `completeStream`：发请求 → 解析厂商流式响应 → 逐块 `yield` AnthropicStreamEvent。

### 3.3 辅助：buildProviderStreamResult

`base_provider.ts` 还导出 `buildProviderStreamResult(...)`：把 OpenAI 风格的 chunk 列表或非流式响应，**装订成** AnthropicStreamEvent 流（message_start → 各 content_block_* → message_delta → message_stop）。供那些只给非流式/聚合响应的厂商快速适配。

### 3.4 范例：DeepSeek（deepseek_provider.ts，55 行）

```ts
/**
 * DeepSeek provider — extends OpenAIProvider.
 * DeepSeek 与 OpenAI Chat Completions 几乎完全兼容，
 * 仅在 reasoning（deepseek-reasoner）的字段处理上有差异。
 */
export class DeepSeekProvider extends OpenAIProvider {
  // 复用 OpenAIProvider 的 completeStream
  // 仅覆写：model 映射、reasoning content 的展开、部分参数
}
```

要点：

- **继承复用**：OpenAI 兼容厂商（DeepSeek、Groq、GLM、Minimax、OpenRouter…）大多直接 `extends OpenAIProvider`，只覆写差异点
- `OpenAIProvider` 负责 OpenAI Chat Completions 响应 → AnthropicStreamEvent 的翻译；这是 openai-compat lane 的基础
- providerShim.ts 把上游 SDK 内部类型桥接到本仓 ProviderMessage/ProviderTool

### 3.5 翻译工作流（一次 completeStream）

```
入参: model + ProviderMessage[] + ProviderTool[]
  → 1. 反向翻译: ProviderMessage → 厂商消息格式 (OpenAI chat / Gemini content / …)
  → 2. 反向翻译: ProviderTool → 厂商工具格式
  → 3. 发请求 (undici/fetch), 流式
  → 4. 逐 chunk:
       厂商 delta → 归一化为 AnthropicStreamEvent
       yield event
  → 5. message_stop 时附带 usage
```

## 4. 工具生命周期（tools/）

### 4.1 定义模式

以 `BashTool` 为例（`src/tools/BashTool/BashTool.tsx`，`.tsx` 因含 TUI 渲染）：

```tsx
import { feature } from 'bun:bundle'     // 编译期常量
import type { ToolResultBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'

export const bashTool = buildTool({
  name: 'Bash',
  description: '…',
  inputSchema: z.object({
    command: z.string(),
    // …run_in_background, timeout, description…
  }),
  async call(ctx: ToolUseContext, input) {
    // 1. 前置安全检查 (bashPreflightValidation + tree-sitter AST)
    // 2. 权限决策 (ctx.permission)
    // 3. execa/node-pty 执行
    // 4. 进度回报 → ctx 报告 → TUI
    // 5. 返回 ToolResultBlockParam[]
  },
  // TUI 渲染: ToolUseMessage / BashToolResultMessage 组件
})
```

### 4.2 ToolUseContext（共享层注入）

工具 `call` 收到的上下文提供：

- `permission` — 权限决策器（allow/deny/ask）
- `session` — 会话状态、消息历史
- `cwd`、`signal: AbortSignal`
- `sendMessage` / `reportProgress` — 回报 TUI
- `mcp` — MCP 客户端（供工具调用外部 MCP）
- `memory` — self-learning 写入器

工具**不直接调 lane**——它们是“被调起”的：lane 消费 provider 流，遇到 `tool_use` content block 时，按 `name` 查 tool registry，调 `tool.call(ctx, input)`，把返回的 `ToolResultBlockParam[]` 作为下一轮 `user` 消息喂回。

### 4.3 安全检查链（BashTool 特有）

```
command 字符串
  → tree-sitter bash AST 解析 (src/utils/bash/ast.ts, parseForSecurity)
  → bashPreflightValidation (src/tools/BashTool/bashPreflightValidation.ts, ~1100 行)
       · 危险命令模式 (rm -rf, curl|sh, fork bomb…)
       · 项目工具标记匹配 (matchProjectToolMarkers)
       · 沙箱/容器要求
  → 权限决策 (allow / ask / deny)
  → 执行
```

`matchProjectToolMarkers` 检测命令里是否引用了项目自定义工具入口（如 `vp`, `rg`, `fd`），用于自适应提示。

### 4.4 工具注册

工具在 lane 启动时从共享 registry 装配进该 lane 的 tool registry。不同 lane 可暴露不同工具子集（例如 codex lane 可能不支持某些 Claude 专属工具）。

## 5. Self-learning（/learned）

### 5.1 组件

| 文件 | 职责 |
|---|---|
| `src/commands/learned/index.ts` | slash 命令入口：菜单（查看/学习/编辑/删除/开关） |
| `src/memdir/paths.ts` | 存储路径 + 开关门控（`isAutoMemoryEnabled`，读 `CLAUDE_CODE_DISABLE_AUTO_MEMORY`） |
| `src/memdir/findRelevantMemories.ts` | 给定上下文，检索相关 lesson（`findRelevantMemories`, line 39） |
| `src/memdir/memoryAge.ts` | lesson 时效（`memoryAgeDays`, `memoryAge`） |
| `src/memdir/teamMemPrompts.ts` | 把 lesson 装配进 system prompt |
| `src/memdir/teamMemPaths.ts` | 团队级 vs 用户级 lesson 路径分层 |

### 5.2 触发与门控

`isAutoMemoryEnabled()` (`src/memdir/paths.ts:30`) 的**优先级链**（第一个定义的胜出）：

1. 环境变量 `CLAUDE_CODE_DISABLE_AUTO_MEMORY`：`1`/`true` → 关；`0`/`false` → 开
2. `CLAUDE_CODE_SIMPLE`（`--bare`）→ 关
3. `CLAUDE_CODE_REMOTE` 且未设置 `CLAUDE_CODE_REMOTE_MEMORY_DIR` → 关（CCR 无持久化）
4. `settings.json` 的 `autoMemoryEnabled` 字段（支持项目级 opt-out）
5. 默认开

`isExtractModeActive()`（同文件）—— self-learning 的主开关：默认**关**，且要求 auto-memory 开启。开启后统辖 `extractMemories`（turn-end fork）、`autoDream`、`/remember`、`/dream`、team sync。

构建期 patch 显式把后台 fork 路径禁用（`build.mjs` 注释里说明），所以抽取走主进程内同步路径。

### 5.3 生命周期

```
任务完成
  → 判定“实质性” (heuristic: 工具调用数 / 跨度 / 用户确认)
  → 若启用且非 extract 模式 → 生成 1 条候选 lesson (通用、可复用原则)
  → UI: Approve / Edit / Skip
  → Approve → 写入 memdir (团队级 or 用户级)
  → 下次会话: findRelevantMemories → teamMemPrompts 注入 system prompt
```

设计约束（来自 COMMANDS.md 与源码）：

- lesson 是**单条可移植原则**，不是项目特定 trivia
- 团队级 lesson 与用户级 lesson 分层存储（`teamMemPaths`）
- 时效（`memoryAge`）参与相关性排序

## 6. native Go 助手

### 6.1 shell-parser (`native/shell-parser/main.go`)

- 单文件 Go 程序
- 子命令 `parse <shell>`：stdin 读 shell 命令 → stdout 输出 AST JSON
- 被 `src/utils/bash/ast.ts` 调用做安全分析
- `scripts/build-native-shell-parser.mjs` 编译为 `native/bin/shell-parser{,.exe}`

### 6.2 tau-tools (`native/tau-tools/`)

Go module（`go.mod`/`go.sum`），`main.go` 注册子命令：

| 子命令 | 文件 | 行为 |
|---|---|---|
| `render-markdown` | `markdown.go` | stdin/file → ANSI 渲染 Markdown |
| `highlight-code` | `highlight.go` | stdin/file → 语法高亮 ANSI |
| `git-summary` | `git.go` | 输出仓库只读 JSON 摘要 |
| `sysinfo` | `sysinfo.go` | CPU/内存/磁盘/进程 JSON |
| `fuzzy-rank` | `fuzzy.go` | 行分隔条目模糊排序（配合 `fuse.js`/`fuzzysort`） |
| `pick` | `pick.go` | Bubble Tea 交互选择器 |
| `help`/`version` | `main.go` | 自描述 |

`scripts/build-native-tools.mjs` 编译为 `native/bin/tau-tools{,.exe}`。TS 侧通过 `src/native-ts/` 调用。

### 6.3 选用 Go 的理由（推断）

- tree-sitter CLI 与 bash 解析在 Node 侧已有 `web-tree-sitter`，但**纯 Go 的 shell 解析**部署更简单（单二进制、无 WASM 加载）
- Markdown/代码高亮用 Go（如 `glamour` 类库）比纯 JS 在大输出下更稳
- fuzzy-rank 在大列表下性能优于纯 JS

## 7. 持久化与凭据

| 技术 | 用途 |
|---|---|
| `better-sqlite3` | 会话消息、usage 统计、lesson 索引（同步 API，TUI 友好） |
| `keytar` | 系统 keychain 存 API key（macOS Keychain / Windows Credential Manager / Linux Secret Service） |
| `electron-store` / `conf` | 配置持久化（c12 多源合并） |
| `src/migrations/` | schema 演进迁移 |

## 8. 未覆盖（留给后续）

- 单条 lane 的完整 agent loop（建议以 `src/lanes/claude/loop.ts` 或 `gemini/` 为例另开文档）
- ACP 双向 convert 映射（`src/acp/convert.ts`）
- cursor lane 的 protobuf 协议（`src/lanes/cursor/protobuf*`）
- plugin 注册时机与生命周期（`src/plugins/builtinPlugins.ts` + `bundled/`）
- query 循环在共享层的实现（`src/query/` 与 claude.ts）
