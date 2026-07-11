# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Tau is a multi-provider AI coding CLI. It is a fusion of Claude Code's tool surface and session UX with OpenCode's multi-provider/plugin architecture. The binary installs as both `tau` and `claudex` (both point to `dist/cli.mjs`). v0.92.12, ESM, Node >= 20.

## Commands

| Task | Command |
|------|---------|
| Build (esbuild bundle + native helpers) | `npm run build` (= `node build.mjs`) |
| Build only Go helpers | `npm run build:native-shell` / `npm run build:native-tools` |
| Publish (runs build first) | `npm run prepublishOnly` |
| Install (downloads ripgrep, pre-pulls Ollama cloud models) | `npm install` |
| Run a single test | `bun test src/path/to/file.test.ts` |
| Run all tests | `bun test` |
| Smoke check (command help) | `node scripts/smoke_command_help.mjs` |
| Verify deps | `node scripts/verify-deps.mjs` |

There is **no `npm test`** — tests are bun-runner-based (`.test.ts` files alongside source; no vitest/jest config exists). The project itself builds via Node + esbuild; bun is only used as the test runner. Linting is not configured at the repo level — `tau-vscode/` has its own `node scripts/lint.js`.

## Big-picture architecture

### The Lane architecture — read this first

The central concept is a **lane**: a complete native agent loop for one model family (anthropic/claude, gemini, codex, openai-compat, qwen, kiro, cursor, cline, kilo). Each lane owns its own agent loop, tool registry, system prompt, and API client. The shared layer (`src/` outside `lanes/`) owns session, permissions, tool implementations, MCP, UI, and slash commands.

```
src/lanes/
├── index.ts            # entry: dispatcher routes model → lane automatically
├── dispatcher.ts       # auto-routing by model name; users pick a model, never a lane
├── bridge.ts           # lane ↔ shared layer interop
├── provider-bridge.ts  # shared HTTP providers used by openai-compat lane
├── types.ts            # lane interfaces
├── shared/             # code reused across lanes
└── <lane>/             # one dir per backend (claude/, gemini/, codex/, …)
```

**The interop boundary is `AnthropicStreamEvent`** (defined in `src/services/api/providers/base_provider.ts`). All vendor APIs translate to this IR; the bridge layer surfaces them as the common tool/permission/MCP surface.

### Layers under `src/`

| Dir | Purpose |
|-----|---------|
| `entrypoints/` | `cli.tsx` (main TUI), `mcp.ts` (MCP server), `init.ts`, `sdk/`, plus type-only modules |
| `services/api/providers/` | ~20 native HTTP provider adapters inheriting from `base_provider.ts`. IR types: `AnthropicStreamEvent`, `ProviderMessage`, `ProviderTool` |
| `tools/` | ~70 tools, one directory per tool (Bash, Edit, Read, Write, Agent, Task, …). Each is self-contained |
| `commands/` | 123 slash commands. Notable: `learned/` (self-learning hub), `safetest/`, `statistics/` |
| `components/`, `screens/`, `ink/` | Ink + React TUI |
| `acp/` | Agent Client Protocol support (interop with ACP editors) |
| `mcp/`, `plugins/`, `hooks/`, `skills/`, `voice/`, `vim/`, `keybindings/` | Extension surfaces |
| `query/` | Token budgeting, stop hooks, config, deps |
| `assistant/`, `bridge/`, `buddy/`, `coordinator/`, `lanes/`, `moreright/`, `remote/`, `tasks/` | Subsystems |
| `native-ts/` | Hand-written TS bridges to the Go native helpers |
| `bootstrap/`, `migrations/`, `state/`, `schemas/`, `types/`, `utils/`, `constants/`, `context/` | Cross-cutting |

### Native Go helpers

`native/shell-parser/` and `native/tau-tools/` (fuzzy match) are Go binaries. They are built by `scripts/build-native-*.mjs` as part of `node build.mjs`, then loaded via the shims in `src/native-ts/`. Re-build them independently after editing the `.go` files.

### Build mechanics

`build.mjs` is an esbuild-driven Node script that shims out `bun:bundle` feature-flag imports (`src/entrypoints/cli.tsx:1` uses them) and inlines `MACRO` constants (VERSION, etc.). Output: `dist/tau.mjs` (the bundled CLI), `dist/cli.mjs` (launcher). The bins `tau` and `claudex` both point to `dist/cli.mjs`.

### The tau-vscode sub-package

`tau-vscode/` is a separate VSCode extension (its own `package.json`, v0.6.0). Tests: `npm run test` = `node --test ./src/*.test.js`. Lint: `npm run lint`. Package: `npm run package` (uses `@vscode/vsce`).

### Self-learning

The `/learned` slash command is a distinctive feature: tau proposes general reusable lessons after substantial tasks, and approved lessons persist across sessions/projects. Implementation lives in `src/commands/learned/`.

## Conventions worth knowing

- **Path alias**: `src/*` → `./src/*` (tsconfig). Use the alias rather than relative paths when crossing major module boundaries.
- **TypeScript**: `strict: true`, `allowImportingTsExtensions: true`, `jsx: react-jsx`. ESM only.
- **Tests**: bun-based `.test.ts` colocated with source. No coverage config; no CI test script wired into `package.json`.
- **Postinstall** silently downloads ripgrep and pre-pulls Ollama cloud models; on failure the CLI falls back to system `rg` and retries pulls on first launch.
- **Model → lane routing is automatic** — do not add explicit lane selection in user-facing code; the dispatcher handles it from the model name.
