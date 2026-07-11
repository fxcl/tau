# Research — Tau 工程依赖与构建物料

> 范围：`package.json` 全部依赖、native Go 助手、构建/打包、运行时前置（ripgrep、Ollama 模型预拉）。
> 日期：2026-07-09。所有事实均来自仓库当前源码与配置文件；未经计算/运行验证的标记为 [UNVERIFIED]。

## 1. 元信息速览

| 字段 | 值 |
|---|---|
| `name` | `@abdoknbgit/tau` |
| `version` | `0.92.12` |
| `type` | `module` (ESM) |
| `engines.node` | `>=20.0.0` |
| `bin` | `tau` → `dist/cli.mjs`，`claudex` → `dist/cli.mjs`（两个名字指向同一产物） |
| `dependencies` | 78 个 |
| `devDependencies` | 9 个 |
| `optionalDependencies` | 7 个 |

## 2. 依赖分类与用途

> 分类为研究分析时按用途归纳，并非 `package.json` 原有结构。

### 2.1 AI/LLM SDK 与协议（核心）

| 包 | 用途 |
|---|---|
| `@anthropic-ai/sdk` | Claude/Anthropic 官方 SDK；messages、tool use、stream events 等 |
| `@anthropic-ai/vertex-sdk` | 通过 Vertex AI 接入 Claude 用的 SDK 封装 |
| `@openai/codex-sdk` | OpenAI Codex 子包 SDK（codex lane 的底层） |
| `@google/genai` | Google GenAI 官方 SDK（gemini lane） |
| `@google-cloud/vertexai` | Vertex AI 通用 SDK |
| `openai` | OpenAI 官方 SDK；`openai-compat` lane 与所有 OpenAI 兼容厂商共用基类 |
| `@aws-sdk/client-bedrock-runtime` | AWS Bedrock（Claude/Titan 等模型的 AWS 入口） |
| `@qwen-code/qwen-code-core` | 通义千问 Qwen 的核心 SDK（qwen lane） |
| `@ai-sdk/*` (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/gateway`) | Vercel AI SDK 各厂商适配器；多用于流式桥接与统一接口 |
| `ai` | Vercel AI SDK 主包 |
| `@mcp-use/sdk` | MCP 客户端 SDK（MCP 服务发现/调用） |
| `@modelcontextprotocol/sdk` | MCP 官方 SDK（`@modelcontextprotocol/sdk` 是基础） |

### 2.2 终端与交互 UI

| 包 | 用途 |
|---|---|
| `ink` (v6) | React 渲染的 TUI 框架；CLI 主体界面基于此 |
| `ink-text-input`, `ink-select-input`, `ink-spinner`, `ink-gradient`, `ink-link`, `ink-box`, `ink-table`, `ink-multi-select`, `ink-form`, `ink-picture`, `ink-mouse`, `ink-ui`, `@inkjs/ui` | ink 生态组件库 |
| `meow` | CLI 参数解析（轻量、声明式） |
| `minimist` | 备用参数解析 |
| `chalk` | 终端颜色 |
| `ansi-escapes`, `ansi-regex`, `ansi-styles`, `strip-ansi`, `ansi-align` | ANSI 终端控制序列 |
| `cli-cursor`, `cli-spinners`, `cli-width`, `cli-boxes` | 终端微交互 |
| `string-width`, `string-width-cjs`, `eastasianwidth`, `is-fullwidth-code-point`, `get-east-asian-width` | CJK/全角字符宽度计算 |
| `figures`, `log-symbols` | Unicode 符号（替代 emoji） |
| `marked` | Markdown 渲染 |
| `marked-terminal` | Markdown → 终端 ANSI |
| `dompurify` + `jsdom` | HTML/Markdown 渲染前的清理（防止 XSS） |
| `linkify-it`, `markdown-it`, `micromark*` (`micromark`, `micromark-util-combine-extensions`, `micromark-util-sanitize-uri`) | Markdown 解析与链接提取 |
| `fuse.js` | 模糊搜索（命令面板、命令补全） |
| `fuzzysort` | 备选模糊排序 |
| `react`, `react-dom` | TUI 实际是 React 组件树 |

### 2.3 文件与文件系统

| 包 | 用途 |
|---|---|
| `glob`, `tinyglobby`, `fast-glob`, `globby` | glob 模式匹配 |
| `ignore` | `.gitignore` 解析（路径过滤） |
| `fs-extra` | Promise 化的 fs 操作 |
| `proper-lockfile`, `unique-filename` | 锁文件、唯一文件名 |
| `mime-types`, `file-type` | MIME 推断 |
| `diff`, `fast-diff`, `microdiff`, `diff-match-patch` | diff 算法（Edit/TUI 多处使用） |
| `patch-package` | 给 node_modules 打补丁（用于上游 bug 绕过） |
| `jszip` | ZIP 打包 |

### 2.4 Shell / 命令执行

| 包 | 用途 |
|---|---|
| `execa`, `node-pty` | 子进程与伪终端 |
| `shell-escape`, `string-argv`, `shell-quote` | Shell 参数转义 |
| `which` | 解析可执行文件路径 |
| `tree-sitter`, `tree-sitter-bash`, `web-tree-sitter`, `tree-sitter-cli`, `tree-sitter-typescript` | Shell/Bash/TS 解析（`src/utils/bash/ast.ts` 引用 `parseForSecurity`） |
| `@lydell/node-pty` | node-pty 维护分支 |

### 2.5 数据/校验/序列化

| 包 | 用途 |
|---|---|
| `zod` (v4, 使用 `zod/v4` 子路径) | 运行时 schema 校验，工具输入/输出大量使用 |
| `lodash-es` | 工具函数（`memoize`、`debounce` 等） |
| `date-fns`, `dayjs` | 日期时间处理 |
| `yaml` | YAML 解析 |
| `ini` | INI 解析 |
| `dotenv` | `.env` 加载 |
| `uuid` | UUID 生成 |
| `semver`, `compare-versions` | 语义版本 |
| `jsonc-parser` | 带注释 JSON |
| `c12` | 配置加载（Nuxt 生态的多源配置合并） |

### 2.6 网络/HTTP

| 包 | 用途 |
|---|---|
| `undici` | 高性能 HTTP 客户端 |
| `node-fetch` | fetch polyfill |
| `proxy-agent`, `https-proxy-agent`, `get-proxy-from-env` | 代理支持 |
| `tunnel` | HTTPS tunnel |
| `cookie`, `tough-cookie` | cookie 解析 |
| `eventsource-parser` | SSE 流式解析 |
| `headers-polyfill` | Headers polyfill |
| `cors` | CORS 中间件 |

### 2.7 持久化/缓存

| 包 | 用途 |
|---|---|
| `better-sqlite3` | 同步 SQLite；本地会话/记忆存储的核心 |
| `keytar` | 系统 keychain（凭据安全保存） |
| `electron-store` | Electron 模式下持久化（VSCode 扩展等场景） |
| `conf` | 跨平台配置持久化 |

### 2.8 音频/语音

| 包 | 用途 |
|---|---|
| `node-record-lpcm16` | 麦克风 PCM 录音（语音输入） |

### 2.9 日志/诊断

| 包 | 用途 |
|---|---|
| `winston` | 日志框架 |
| `@logtape/logtape` | 备选结构化日志 |
| `debug` | 调试日志 |
| `lru-cache` | LRU 缓存（响应/工具结果） |

### 2.10 工具杂项

| 包 | 用途 |
|---|---|
| `cheerio` | 服务端 HTML 解析 |
| `jsdom` | DOM polyfill |
| `ajv` | JSON Schema 校验（与 zod 并行） |
| `cosmiconfig` | 配置文件发现 |
| `detect-indent`, `detect-newline`, `detect-libc`, `detect-port` | 环境探测 |
| `word-wrap`, `wrap-ansi`, `slice-ansi` | 文本换行 |
| `is-network-error`, `error-cause` | 错误处理 |
| `stack-utils`, `error-stack-parser`, `clean-stack` | 堆栈解析 |
| `typed-emitter` | 类型化 EventEmitter |
| `eventsource-client` | SSE 客户端（与 eventsource-parser 配套） |
| `structured-headers` | HTTP 结构化头部解析 |
| `win32-registry` | Windows 注册表 |
| `@vitest/*` (迁移残留, 见 devDeps) | [UNVERIFIED] 推测为遗留依赖 |

## 3. devDependencies (9)

直接从 `package.json` 抓取：

| 包 | 版本 | 用途 |
|---|---|---|
| `@computer-use/nut-js` | `^4.2.0` | 跨平台原生输入控制（鼠标/键盘），用于 computer-use 工具；亦作为 `peerDependencies` |
| `@types/bun` | `^1.2.10` | Bun 类型定义（项目虽以 Node 为主，但保留 Bun 类型支持 `bun:bundle` 与备选 `build:bun`） |
| `@types/node` | `^22.14.0` | Node 类型 |
| `@types/pdfkit` | `^0.17.6` | PDFKit 类型（用于生成 PDF 报告，工具输出/导出场景） |
| `@types/react` | `^19.1.0` | React 19 类型（TUI 实际是 React 组件树） |
| `e2b` | `^2.10.0` | e2b 云沙箱运行时（远程代码执行的安全隔离环境） |
| `esbuild` | `^0.28.0` | 打包器（`build.mjs` 的核心） |
| `google-auth-library` | `^9.15.1` | Google OAuth 认证（Vertex AI / Gemini ADC） |
| `typescript` | `^5.7.3` | TypeScript 编译器 |

## 4. optionalDependencies (7)

| 包 | 版本 | 用途 |
|---|---|---|
| `@cortexkit/aft-darwin-arm64` | `0.31.1` | AFT (Agentic Function/Toolkit?) 平台二进制 — macOS ARM |
| `@cortexkit/aft-darwin-x64` | `0.31.1` | AFT — macOS x86_64 |
| `@cortexkit/aft-linux-arm64` | `0.31.1` | AFT — Linux ARM |
| `@cortexkit/aft-linux-x64` | `0.31.1` | AFT — Linux x86_64 |
| `@cortexkit/aft-win32-arm64` | `0.31.1` | AFT — Windows ARM |
| `@cortexkit/aft-win32-x64` | `0.31.1` | AFT — Windows x86_64 |
| `node-pty` | `^1.1.0` | 原生伪终端（多平台 prebuilt） |

观察：6 个 `@cortexkit/aft-*` 是同一产品的 6 个平台预编译二进制，对应 `src/tools/AFTTool/` 的原生后端。`node-pty` 与 `@lydell/node-pty`（dependencies 中）的关系需进一步确认——两者并存可能是为了双源 fallback。

## 5. peerDependencies

仅一项：`@computer-use/nut-js ^4.2.0`。与 devDeps 同名同版本，说明该工具在启用时是宿主可注入/可选的对等依赖。

## 5. 构建物料：esbuild + native Go

### 5.1 Node 端构建

- 入口：`build.mjs` (465 行)
- 入口（备选 Bun）：`build.ts`（脚本 `build:bun`，需 Bun）
- 关键步骤：
  1. **依赖校验**：`scripts/verify-deps.mjs` 在 install 期先跑一次
  2. **esbuild 打包**：`src/entrypoints/cli.tsx` → `dist/tau.mjs`（含 sourcemap）
  3. **shim 替换**：用 esbuild plugin 替换 `@ant/*`、`@anthropic-ai-*/{tungsten,sandbox,computer-use,browser}`、`@internal/{sandbox,browser-tools,skills-runtime,sessions,oauth,...}`、`bun:bundle` 等内部/实验模块为本地 stub（详见 `implementation.md`）
  4. **MACRO 注入**：把 `process.env.CLAUDE_CODE_ENTRYPOINT`、版本号等常量在打包期写入
  5. **cli 启动器**：`dist/cli.mjs` 是 ~20 行的小启动器，仅 require bundle 并启动 CLI
- 输出：
  - `dist/tau.mjs` — 主 bundle，含几乎全部源码（仅排除 shim 替换掉的内部模块）
  - `dist/cli.mjs` — 启动器

### 5.2 native 助手：Go 二进制

#### `native/shell-parser/main.go`

单一 Go 文件，提供 `parse <shell>` 命令：从 stdin 读 shell 命令字符串，输出结构化 AST（用于 `src/utils/bash/ast.ts` 的安全检查）。`scripts/build-native-shell-parser.mjs` 在 `npm run build:native-shell` 时编译为 `native/bin/shell-parser{,.exe}`。

#### `native/tau-tools/` — 多子命令工具集

Go 1.x module（`go.mod`/`go.sum`），`main.go` 注册的子命令：

| 子命令 | 实现文件 | 用途 |
|---|---|---|
| `render-markdown` | `markdown.go` | stdin/file → ANSI 渲染（替代 `marked-terminal`，更稳） |
| `highlight-code` | `highlight.go` | stdin/file → 语法高亮 ANSI |
| `git-summary` | `git.go` | 只读 JSON 形式仓库摘要 |
| `sysinfo` | `sysinfo.go` | CPU/内存/磁盘/进程 JSON 摘要 |
| `fuzzy-rank` | `fuzzy.go` | 行分隔条目模糊排序 |
| `pick` | `pick.go` | Bubble Tea 选择器（可选） |
| `help` / `version` | `main.go` | 自描述 |

打包后通过 `src/native-ts/` 中的 TS shim 调用。`scripts/build-native-tools.mjs` 在 `npm run build:native-tools` 时编译为 `native/bin/tau-tools{,.exe}`。

### 5.3 native-ts/ — TS 侧桥

- `src/native-ts/yoga-layout/` — flexbox 布局（Ink 内部用）
- `src/native-ts/file-index/` — 文件索引
- `src/native-ts/color-diff/` — diff 着色
- 其余按子目录划分

## 6. Postinstall 行为

`scripts/postinstall.mjs`：

1. 下载平台对应的 ripgrep 二进制到 `native/bin/`
2. 预拉 `OLLAMA_CLOUD_MODELS` 列表（保持与 `src/utils/model/ollamaCatalog.ts` 的 `CLOUD_MODELS_LIST` 同步）：
   - `glm-5.1:cloud`、`glm-5:cloud`、`glm-4.7:cloud`、`glm-4.6:cloud`
   - `kimi-k2.5:cloud`、`kimi-k2-thinking:cloud`
   - `qwen3.5:cloud`、`qwen3-coder-next:cloud`
   - `minimax-m2.7:cloud`（以及列表其它项）
3. 任一步失败**静默跳过**，不破坏安装。CLI 在系统已有 `rg` 时直接用，首次启动会重试 Ollama 拉取。

`scripts/preinstall.mjs`：在 install 早期运行（推测用于校验 Node 版本/平台/必要工具）。

## 7. 跨包绑定与一致性约束

- `src/services/api/providers/providerShim.ts`：将上游 SDK 的内部类型桥接到本仓 `AnthropicStreamEvent`
- `src/utils/model/ollamaCatalog.ts` 中的 `CLOUD_MODELS_LIST` 必须与 `scripts/postinstall.mjs` 的 `OLLAMA_CLOUD_MODELS` 数组**字面一致**（注释显式声明 "KEEP IN SYNC"）
- `src/commands/learned/`、`src/memdir/` 维护同一份 memory schema（详见 `implementation.md`）

## 8. 风险与取舍

- **依赖量级（78 deps + 9 devDeps）**：偏多。多数为 ink 生态与运维/UI 工具，单点升级需谨慎
- **硬绑 `bun:bundle`**：源码仍 import `feature from 'bun:bundle'`（`src/entrypoints/cli.tsx:1`、`src/tools/BashTool/BashTool.tsx:1`），esbuild plugin 必须 shim 掉，否则打包会失败——这是迁移 Bun→Node 的隐性技术债
- **可选原生模块**：7 个 optionalDeps 多为平台 prebuilt，跨平台分发需保证对应二进制可下载
- **patch-package 出现**：意味着对 node_modules 有定制修复，发布时必须确认 patches 目录同步打包

## 9. 未验证/待确认项

- `@cortexkit/aft-*` (AFT) 的确切语义与 `src/tools/AFTTool/` 的运行时契约（见 `implementation.md` 待补）
- `node-pty` 与 `@lydell/node-pty` 并存的取舍原因
- `bun:bundle` 的 feature flag 名空间是否完全被 shim 覆盖（构建脚本做了白名单，可能有遗漏）
- patch-package 是否仍在使用、`patches/` 目录是否存在
- `@types/pdfkit` 对应的实际 PDF 生成路径（grep `pdfkit` 确认调用点）
