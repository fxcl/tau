# Architecture — Tau 系统架构

> 配套阅读：`research.md`（依赖/物料）、`implementation.md`（关键流程逐行）、`notes.md`（横切发现/陷阱）。
> 所有结论基于当前源码；带 [UNVERIFIED] 的为推断。

## 1. 工程定位

Tau 是一个**多 provider 的 AI 编码 CLI**：把 Claude Code 的工具面与会话 UX，嫁接到 OpenCode 的多 provider / 插件架构上。运行时既可作为交互式 TUI（`tau`），也可作为 MCP 服务端（`mcp.ts` 入口）和 ACP 后端（`src/acp/`）对外暴露。

二进制分发：`tau` 与 `claudex` 两个命令名都指向 `dist/cli.mjs`（启动器），实际逻辑在 `dist/tau.mjs`（esbuild bundle）。

## 2. 总体分层

```
┌─────────────────────────────────────────────────────────────┐
│  入口层  entrypoints/   cli.tsx (TUI) · mcp.ts · init.ts · sdk│
├─────────────────────────────────────────────────────────────┤
│  Lane 层  lanes/        每个 model family 的原生 agent loop  │
│   ├─ dispatcher.ts     按 model 名自动路由到 lane（零配置） │
│   ├─ bridge.ts         lane ↔ shared layer 的事件桥         │
│   ├─ provider-bridge.ts  HTTP provider 供 openai-compat lane │
│   └─ <lane>/           claude·gemini·codex·openai-compat·    │
│                         qwen·kiro·cursor·cline·kilo          │
├─────────────────────────────────────────────────────────────┤
│  IR 边界  AnthropicStreamEvent                              │
│           (src/services/api/providers/base_provider.ts)      │
├─────────────────────────────────────────────────────────────┤
│  Provider 适配层  services/api/providers/                    │
│   ~20 个原生 HTTP 适配器，全部翻译成 AnthropicStreamEvent    │
├─────────────────────────────────────────────────────────────┤
│  共享层（shared layer）                                      │
│   tools/  · commands/ · plugins/ · hooks/ · skills/ · mcp/   │
│   session · permissions · state/ · query/ · migrations/      │
├─────────────────────────────────────────────────────────────┤
│  展示层  components/ · screens/ · ink/  (React + Ink TUI)    │
├─────────────────────────────────────────────────────────────┤
│  原生助手  native-ts/ → native/{shell-parser,tau-tools} (Go) │
└─────────────────────────────────────────────────────────────┘
```

核心设计：**每条 lane 自带 agent loop、tool registry、system prompt、API client；共享层负责会话、权限、工具实现、MCP、UI、命令。lane 与共享层之间通过 `AnthropicStreamEvent` 这套 IR 解耦。**

## 3. Lane 架构（核心概念）

### 3.1 什么是 lane

一条 lane = 一个 model family 的**完整原生执行环境**。不同 family（Claude、Gemini、Codex、OpenAI 兼容厂商、Qwen、Kiro、Cursor、Cline、Kilo）的消息格式、工具协议、流式事件各不相同，各自维护一条 lane 把这些差异封装在内。

`src/lanes/index.ts` 的注释明确表达设计意图：

> 用户从不感知 lane——选一个 model，dispatcher 自动选 lane。

### 3.2 lane 清单

| Lane | 模型 family | 实现目录 |
|---|---|---|
| `claude` (anthropic) | Claude / Anthropic 直连、Bedrock、Vertex | `src/lanes/claude/` |
| `gemini` | Google Gemini / Antigravity | `src/lanes/gemini/` |
| `codex` | OpenAI Codex (Responses API) | `src/lanes/codex/` |
| `openai-compat` | 所有 OpenAI 兼容厂商（DeepSeek、Groq、GLM、Minimax、OpenRouter…） | `src/lanes/openai/`（与 `provider-bridge.ts` 配合） |
| `qwen` | 通义千问 | `src/lanes/qwen/` |
| `kiro` | AWS Kiro | `src/lanes/kiro/` |
| `cursor` | Cursor（私有 protobuf） | `src/lanes/cursor/` |
| `cline` | Cline 兼容 | `src/lanes/cline/` |
| `kilo` | Kilo | `src/lanes/kilo/` |

### 3.3 路由：dispatcher

`src/lanes/dispatcher.ts` 是**去中心化**的路由：每条 lane 自己声明能处理哪些 model，dispatcher 只是“问一遍、选第一个说 yes 的”。**没有中央的 model-name 规则表**。

两条主路径：

```ts
// 1. Anthropic 模型 → 走原有 claude.ts 路径，不进 lane
function isAnthropicModel(model: string): boolean {
  const m = model.toLowerCase()
  return m.startsWith('claude-') || m.includes('anthropic')
}

// 2. 非 Anthropic → 遍历注册的 lane，supportsModel 返回 true 即选中
function findLaneForModel(model: string): Lane | null
```

`resolveRoute(model)` 输出：

```
{ type: 'native', lane }                              // 健康 lane 命中
{ type: 'existing', reason: 'anthropic-native' }       // Anthropic 模型
{ type: 'existing', reason: 'no-lane-registered' }    // 无 lane 认领
{ type: 'existing', reason: 'lane-unhealthy' }        // lane 报错/不可用
```

`dispatch(model, context)`：native 路由返回 `lane.run(context)`（`AsyncGenerator<AnthropicStreamEvent, LaneRunResult>`）；`existing` 返回 `null`，调用方回退到原有的 `claude.ts`（即共享层 agent loop）。

含义：

- 新增 lane 只需在该 lane 的 `index.ts` 实现 `supportsModel()` + `run()`；dispatcher 无需改动
- Claude 是“一等公民”，走经过长期打磨的共享层路径；其它 backend 才是 lane
- 当所有 lane 都不健康时，**静默回退到现有路径**而不是拒绝请求——这是显式的“graceful degradation”

### 3.4 事件协议：bridge 与 lane 事件

`bridge.ts` 是 lane 与共享层的胶水。dispatcher 向上发出统一的 lane 事件流（节选自 dispatcher 的类型定义）：

```
{ type: 'lane_start'; model; cwd }
{ type: 'lane_message'; message }        // assistant 文本/工具调用
{ type: 'lane_tool_result'; tool; result }
{ type: 'lane_permission_request'; tool }
{ type: 'lane_mcp'; ... }
{ type: 'lane_compaction'; reason; tokensSaved }
{ type: 'lane_retry'; attempt; reason }
{ type: 'lane_end'; reason; usage: NormalizedUsage }
```

共享层订阅这些事件驱动 TUI、持久化、统计、self-learning。

### 3.5 共享 HTTP provider 池

`src/lanes/provider-bridge.ts` 让 openai-compat 这类 lane 复用 `src/services/api/providers/` 下已经写好的 ~20 个 provider（OpenAI、Gemini、GLM、Groq、DeepSeek、Minimax…）。**provider 把厂商响应翻译成 `AnthropicStreamEvent`；lane 在此之上跑自己的 agent loop。** 这样厂商适配与协议适配两层职责分离。

## 4. IR 边界：AnthropicStreamEvent

`src/services/api/providers/base_provider.ts` 定义 lane/provider 之间的统一中间表示：

| 类型 | 行 | 角色 |
|---|---|---|
| `AnthropicStreamEvent` | ~60 | 流式事件联合类型（message_start / content_block_delta / tool_use / message_delta…） |
| `ProviderMessage` | ~170 | 归一化的消息（role + content blocks） |
| `ProviderTool` | ~196 | 工具定义归一化（name + input_schema + description） |

**所有 provider 的 `completeStream`（或同名方法）都返回 `AsyncIterable<AnthropicStreamEvent>`。** lane 消费这个流，无需关心厂商是 OpenAI Chat Completions、Gemini generateContent、还是 Bedrock invoke-with-response-stream。

这种设计的好处：新增一个 provider 只需实现“厂商响应 → AnthropicStreamEvent”的翻译；新增一条 lane 则把 family 特有的 agent loop 逻辑写进 lane 目录。两者正交。

## 5. 工具系统（tools/）

### 5.1 组织

- `src/tools/<Name>Tool/`：一个目录一个工具（约 70+ 个）。典型成员：`index.ts`（注册 + schema）、`<Name>Tool.tsx`（执行 + TUI 渲染）、辅助 `.ts`。
- 共享工具基础设施在 `src/tools/shared/`、`src/tools/testing/`。
- 工具通过 `buildTool(...)` 构造 `ToolDef`，含 `name` / `inputSchema(zod)` / `description` / `call(ctx, input)` / TUI 渲染组件。

### 5.2 工具执行上下文

工具 `call` 收到 `ToolUseContext`（共享层提供），可访问：会话状态、权限决策器、当前 cwd、AbortSignal、消息发送器、MCP 客户端、self-learning 写入器等。工具不直接调 lane——它们是被 lane 在 tool_use 事件中调起的。

### 5.3 值得注意的工具

| 工具 | 说明 |
|---|---|
| `BashTool` | shell 命令执行；前置安全检查走 `bashPreflightValidation.ts` + tree-sitter AST (`src/utils/bash/ast.ts`) |
| `Edit`/`Write`/`Read` | 文件操作（Claude Code 同名工具面） |
| `Agent`/`Task`/`TaskCreate` 等 | 子 agent 与任务管理（对齐 Claude Code 新工具面） |
| `AFTTool` | 后端为 `@cortexkit/aft-*` 原生二进制（optionalDeps） |
| `NativeTools` | 调用 Go 助手 `tau-tools` 子命令 |

## 6. 会话与状态

| 模块 | 职责 |
|---|---|
| `src/bootstrap/state.ts` | 进程级单例：session id、cwd、设置、启动时探测 |
| `src/state/` | React/Ink 的全局 store（`AppState`、selectors），驱动 TUI |
| `src/migrations/` | 跨版本数据迁移（配置/会话 schema 演进） |
| `src/services/`（其它子目录） | 会话持久化（better-sqlite3）、消息存储、凭据（keytar） |

会话是共享层拥有的，lane 只持有“当前一轮对话”的局部状态——这是 lane 能热插拔的前提。

## 7. 命令系统（commands/）

- 123 个 slash 命令，目录 `src/commands/<name>/`，每个 `index.ts` 导出一个 `satisfies Command` 对象（含 `name`、`description`、`call`）。
- 命令在共享层注册，跨 lane 通用（命令本身不感知 lane）。
- 值得注意：
  - `learned/` — self-learning 控制中心（见下）
  - `safetest/` — 安全测试编排
  - `statistics/` — 使用统计（带 Gemini cache 测试）

## 8. Self-learning（/learned）

Tau 的差异化特性：在完成实质性任务后（或按需），提议**一条通用、可复用的 lesson**（框架陷阱、整类 bug、约束、用户偏好），经用户 Approve/Edit/Skip 后，跨会话/项目携带。

实现分两块：

| 模块 | 职责 |
|---|---|
| `src/commands/learned/` | UI 与交互（查看/学习/编辑/删除/开关） |
| `src/memdir/` | 存储层：`teamMemPaths.ts`（路径）、`findRelevantMemories`（检索）、`memoryAge`、`memoryTypes`、`teamMemPrompts.ts`（注入到 system prompt） |

关键门控（来自 `memdir`）：

- `CLAUDE_CODE_DISABLE_AUTO_MEMORY` 环境变量关闭自动记忆
- `isExtractModeActive` 决定当前会话是否进入“抽取 lesson”模式

## 9. 扩展面

| 面 | 位置 | 说明 |
|---|---|---|
| **MCP** | `src/entrypoints/mcp.ts` + `src/mcp/` | 既作 MCP server 对外暴露工具，也作 MCP client 连接外部 MCP 服务（`@modelcontextprotocol/sdk`、`@mcp-use/sdk`） |
| **ACP** | `src/acp/`（agent / backend / convert / tauBackend / index） | Agent Client Protocol 后端，供 ACP 编辑器（如 Zed）接入 |
| **Plugins** | `src/plugins/builtinPlugins.ts` + `src/plugins/bundled/` | 内置插件 + 打包插件；插件可注册命令、工具、provider |
| **Hooks** | `src/hooks/` | 生命周期钩子（PreToolUse / PostToolUse / Stop 等，兼容 Claude Code hook 机制） |
| **Skills** | `src/skills/` | 可调用的 skill 机制 |
| **Remote** | `src/remote/` | 远程会话能力 |

## 10. TUI 架构（Ink + React）

- `src/components/`：原子组件（输入框、消息、diff、tool result 渲染）
- `src/screens/`：顶层屏（主对话屏、设置屏等）
- `src/ink/`：ink 基础设施封装（hit-test、focus、渲染调度）
- `src/keybindings/`、`src/vim/`：键位与 vim 模式
- `src/outputStyles/`：输出风格（如 concise）—对齐 Claude Code 的 output style 概念
- `src/voice/`：语音输入（`node-record-lpcm16`）

布局用 yoga-layout（`src/native-ts/yoga-layout/`）。图像渲染用 `ink-picture` + 可能的 sharp。

## 11. 数据流：一次对话的生命周期

```
用户输入
  → cli.tsx 解析 (meow) + 共享层组装请求
  → dispatcher 按 model 选 lane
  → lane 组装 system prompt + tool registry + 历史
  → provider-bridge (openai-compat) / lane 自带 client (claude/gemini/codex)
       发请求 → 厂商流式响应
  → provider 翻译为 AnthropicStreamEvent 流
  → lane 消费流：
       文本 → bridge.lane_message → TUI 渲染 + 存储
       tool_use → 经权限决策 → 调对应 ToolDef.call(ctx)
                  → tool 结果 → bridge.lane_tool_result → 喂回下一轮
  → 满足停止条件 → bridge.lane_end(usage)
  → 触发 self-learning 提议（若任务实质且未禁用）
```

关键点：**provider 只负责“翻译响应”，lane 负责“跑 agent loop”，共享层负责“会话/权限/工具/UI”——三者通过 AnthropicStreamEvent + lane 事件流解耦。**

## 12. 构建/分发架构（详见 implementation.md）

- esbuild 打包（`build.mjs`）：源码 → `dist/tau.mjs`；shim 掉内部模块；注入 MACRO
- native Go 助手：`native/shell-parser`、`native/tau-tools`（独立编译，并入发布）
- postinstall：下载 ripgrep + 预拉 Ollama 云模型
- 发布：`npm publish`（`prepublishOnly` 触发 `build.mjs`）

## 13. 与外部生态的对齐

- **Claude Code**：工具名/行为、output style、hook 机制、CLAUDE.md、sub-agent/Task 工具面 → 高度对齐，便于用户迁移与共享配置
- **OpenCode**：多 provider、plugin、ACP 风格 → 架构借鉴
- **MCP**：原生 server + client 双向
- **Cursor / Cline / Codex**：作为 lane 被纳入，说明 Tau 把这些“竞品”当作可调度的 backend

## 14. 待补

- dispatcher 完整匹配规则与 fallback 顺序（`implementation.md`）
- 一条 lane 的 agent loop 逐行（以 claude lane `loop.ts` 为例）
- self-learning lesson 的 schema 与注入时机（`implementation.md`）
- ACP convert 双向映射细节
- cursor lane 的 protobuf 协议
