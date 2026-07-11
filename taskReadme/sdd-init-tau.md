# sdd-init — tau

## Metadata

- **created_at**: 2026-07-10T08:00:00Z
- **project**: tau (multi-provider AI coding CLI, v0.92.12)
- **repo_head**: 125b8bf21225c83b208270f9ec0ccce036a890ac (master)
- **repo_root**: /Users/vec/workspace/js/pi/tau
  - **filesystem_case_caveat**: preflight artifact uses lowercase `pi`; filesystem resolves `/Users/vec/workspace/js/PI/tau` to the same dir (case-insensitive HFS+ on macOS). All paths below use the lowercase `pi` form to match the preflight contract.
- **session_id**: sdd-init-2026-07-10
- **sub_agent_model**: cc-router-via-yesmem/model-haiku (prep/survey tier)
- **preflight_ref**: /Users/vec/workspace/js/pi/tau/taskReadme/sdd-preflight-orchestrator-2026-07-10.md

## 1. Stack detection

- **language**: TypeScript (`strict: true`, `allowImportingTsExtensions: true`, `jsx: react-jsx`, target/module `ESNext`)
- **runtime**: Node.js >= 20 (per `package.json` `engines.node` and CI matrix node 20.x + 22.x)
- **module_system**: ESM (`"type": "module"`)
- **package_manager**: npm (default; CI uses `npm ci`)
- **lockfiles_present**: `bun.lock` (89953 bytes) AND `package-lock.json` (351344 bytes)
  - Both lockfiles co-exist. bun.lock is for the **test runner** only; package-lock.json drives `npm ci` install. This is the "node build + bun test" split documented in CLAUDE.md.
- **bundler**: esbuild (`esbuild ^0.28.0` devDep) — `build.mjs` and `build.ts` scripts both produce `dist/tau.mjs` and `dist/cli.mjs`
- **test_runner**: bun (used standalone for `.test.ts` files; **no** `bunfig.toml`, **no** `bun test` script in package.json)
- **native_helpers** (Go binaries, built via `scripts/build-native-*.mjs`):
  - `native/shell-parser/main.go` — single-file Go binary for shell command parsing
  - `native/tau-tools/main.go` + 5 sibling `.go` files (`fuzzy.go`, `git.go`, `highlight.go`, `markdown.go`, `pick.go`, `sysinfo.go`) — fuzzy match + git/highlight utilities
  - Loaded at runtime through TS shims under `src/native-ts/` (`color-diff`, `file-index`, `yoga-layout`)
- **optional_native**: `@cortexkit/aft-*-<platform>` (optionalDependencies, six per-OS binaries) for computer-use / desktop automation; `@computer-use/nut-js` peer dep
- **observability**: OpenTelemetry SDK trace/logs/metrics + pino logger + ajv schema validation
- **rpc**: MCP (`@modelcontextprotocol/sdk ^1.12.1`), ACP (`@agentclientprotocol/sdk ^0.26.0`), vscode-languageserver stack, tree-sitter-wasm

## 2. Conventions

- **path_alias**: `src/*` → `./src/*` (set in tsconfig `paths`); used in lieu of deep relative paths
- **tsconfig settings**: strict, bundler resolution, allowImportingTsExtensions, allowJs (no checkJs), forceConsistentCasingInFileNames, jsx react-jsx
- **file_layout** (root):
  - `src/` — product code (lanes/, tools/, commands/, services/, entrypoints/, …)
  - `native/` — Go helpers (`shell-parser/`, `tau-tools/`)
  - `scripts/` — build + postinstall + smoke (`build-native-*.mjs`, `preinstall.mjs`, `postinstall.mjs`, `smoke_command_help.mjs`, `verify-deps.mjs`)
  - `tau-vscode/` — separate VSCode extension sub-package, own `package.json` (v0.6.0), own lint (`scripts/lint.js`), own `node --test` runner
  - `docs/` — hand-curated documentation
  - `plugins/` — bundled plugins
  - `editors/` — editor integrations
- **naming**: kebab-case filenames (`smoke_command_help.mjs`, `bashCommandPlanner.test.ts`); PascalCase for components/screens; lane directories under `src/lanes/` use bare family names (`claude/`, `gemini/`, `codex/`, …)
- **entry bins**: `tau` and `claudex` both point to `dist/cli.mjs` (dual alias)
- **formatting / linting**: **NONE at repo root** — no `.eslintrc*`, no `eslint.config.*`, no `.prettierrc*`, no `prettier.config.*`. Lint exists only inside `tau-vscode/` (`scripts/lint.js`, separate scope).
- **type_checking**: TypeScript via `tsconfig.json`; no `tsc --noEmit` script wired into `package.json` or CI
- **file_headers**: tests have a top docstring with run instruction (e.g. `Run: bun run src/utils/path.test.ts`) — confirms bun-as-runner convention

## 3. Architecture map

### Top-level src/ tree (54 entries)

```
src/
├── entrypoints/         # cli.tsx (main TUI), mcp.ts, init.ts, sdk/, sandboxTypes.ts, agentSdkTypes.ts
├── lanes/               # central lane architecture
│   ├── index.ts         # dispatcher entry
│   ├── dispatcher.ts    # auto-routes model → lane
│   ├── bridge.ts        # lane ↔ shared-layer interop
│   ├── provider-bridge.ts  # shared HTTP providers (openai-compat)
│   ├── types.ts         # lane interfaces
│   ├── tool_filter.ts
│   ├── shared/          # code reused across lanes (cache_stability, mcp_bridge, sandbox, shell_workdir, search_replace, apply_patch, system_slots, volatile_freeze, memory_merge, lazy_tools_core, health_score, invariants — many with .test.ts siblings)
│   ├── claude/  cline/  codex/  cursor/  gemini/  kilo/  kiro/  openai-compat/  qwen/
├── services/
│   ├── api/providers/   # ~20 native HTTP provider adapters + base_provider.ts (defines AnthropicStreamEvent IR)
│   ├── tools/, mcp/, plugins/, oauth/, voice/, snapshot/, settingsSync/, compact/, extractMemories/, lsp/, pty/, …
├── tools/               # ~70 self-contained tools; each in own dir (Bash, Edit, Read, Write, Agent, Task, …)
├── commands/            # 123 slash commands; `learned/` = self-learning hub; `safetest/`, `statistics/`
├── components/ screens/ ink/   # Ink + React TUI
├── acp/                 # Agent Client Protocol support
├── mcp/ plugins/ hooks/ skills/ voice/ vim/ keybindings/   # extension surfaces
├── query/               # token budgeting, stop hooks, config, deps
├── assistant/ bridge/ buddy/ coordinator/ lanes/ moreright/ remote/ tasks/  # subsystems
├── native-ts/           # TS shims to Go binaries (color-diff, file-index, yoga-layout)
├── bootstrap/ migrations/ state/ schemas/ types/ utils/ constants/ context/   # cross-cutting
└── *.tsx/*.ts at root   # main.tsx, cli.tsx, QueryEngine.ts, history.ts, Task.ts, Tool.ts, ink.ts, …
```

### Lane architecture (per CLAUDE.md)

> "The central concept is a **lane**: a complete native agent loop for one model family
> (anthropic/claude, gemini, codex, openai-compat, qwen, kiro, cursor, cline, kilo).
> Each lane owns its own agent loop, tool registry, system prompt, and API client."

- The **interop boundary is `AnthropicStreamEvent`** (in `src/services/api/providers/base_provider.ts`).
- All vendor APIs translate to this IR; the bridge layer surfaces them as the common tool/permission/MCP surface.
- **Routing is automatic** — users pick a model, never a lane; dispatcher resolves from the model name.

### Shared services layer

`src/` outside `lanes/` owns: session, permissions, tool implementations, MCP, UI, slash commands.

### Entrypoints

- `src/entrypoints/cli.tsx` — main TUI (Ink + React)
- `src/entrypoints/mcp.ts` — MCP server
- `src/entrypoints/init.ts` — project onboarding
- `src/entrypoints/sdk/` — headless SDK surface (`controlSchemas.ts`, `coreSchemas.ts`, `coreTypes.ts`)

### Native helpers

- `native/shell-parser/` (1 file) → loaded by `src/tools/BashTool/`
- `native/tau-tools/` (6 files: `main.go` + `fuzzy/git/highlight/markdown/pick/sysinfo`) → loaded by `src/services/tools/fuzzy/` and file-index subsystems
- TS shims: `src/native-ts/{color-diff,file-index,yoga-layout}/`

### Build mechanics

`build.mjs` is an esbuild-driven Node script. It:
1. Shims `bun:bundle` feature-flag imports used by `src/entrypoints/cli.tsx:1`
2. Inlines `MACRO` constants (VERSION etc.)
3. Outputs `dist/tau.mjs` (bundled CLI) + `dist/cli.mjs` (launcher)
4. `prepublishOnly` runs `node build.mjs` before publishing

## 4. Testing capability

- **runner**: bun (implicit, by file extension + `bun.lock` + test file docstring `Run: bun run …`)
- **file_pattern**: `*.test.ts` colocated with source
- **existing `.test.ts` count**: **88** files (confirmed via `find /Users/vec/workspace/js/pi/tau/src -name "*.test.ts"`)
- **distribution**:
  - `src/lanes/shared/`: 11 `.test.ts` files (apply_patch, cache_stability, cross_lane_parity, health_score, invariants, mcp_bridge, search_replace, shell_workdir, shim_deletion_readiness, tool_use_ir)
  - `src/tools/BashTool/`: 13 test files (largest concentration)
  - `src/utils/`: ~25 test files
  - other tools + services: balance
- **test_harness_style**: hand-rolled (NOT bun's `describe`/`it` from `bun:test`). Example (`src/utils/path.test.ts`):
  ```ts
  function test(name: string, fn: () => void): void { … try { fn(); passed++ } catch … }
  function assertEqual(actual, expected, hint) { … }
  ```
  Process exits non-zero only if `failed > 0`. Each file is independently runnable via `bun run <file>.test.ts`.
- **coverage_support**: **NONE** — no `.c8rc*`, no `c8.config.*`, no `vitest.config.*`, no `jest.config.*`, no `bunfig.toml`; no `--coverage` flag anywhere in scripts/CI
- **test_command_in_package_json**: **ABSENT** — no `test`, no `test:unit`, no `bun test` script
- **CI_test_step**: **ABSENT** — `.github/workflows/ci.yml` runs build + smoke tests (`node dist/cli.mjs --version`, `tau --version`, friendly-no-auth-error), but **does NOT run bun test** anywhere
- **tau-vscode sub-package**: separate test runner — `npm run test = node --test ./src/*.test.js` (only affects `tau-vscode/`)
- **slow_tests_handling**: **none observed** — no `slow/` dir, no `test:integration` split, no `vitest --bail`, no sharding config

## 5. Strict TDD support

| Mechanism | Present? | Evidence |
|-----------|----------|----------|
| RED → GREEN → REFACTOR scaffolding (templates / lane agents) | ❌ NO | No `tdd/`, no `red-green-refactor` skill/agent in repo or opencode global skills (full registry scan in section 8). |
| Pre-commit test hook (husky / pre-commit / lefthook) | ❌ NO | No `.husky/`, no `.pre-commit-config.yaml`, no `lefthook.yml`. |
| Coverage gate (CI fails under threshold) | ❌ NO | No coverage tool configured; nothing to gate on. |
| Test-on-save / watch script | ❌ NO | No `test:watch`, no `bun --watch` script. |
| `test` script in package.json | ❌ NO | Absent. |
| CI step that runs unit tests | ❌ NO | `.github/workflows/ci.yml` skips all tests. |
| Custom `test()` harness used project-wide | ✅ YES | 88 files use the same hand-rolled harness — but that is **convention**, not enforcement. |
| Sample of test files | ✅ YES | `src/utils/path.test.ts`, `src/lanes/shared/invariants.test.ts`, etc. — so TDD **practice** exists informally. |

**Honest verdict**: there is a **mature, used-in-88-places testing convention**, but **zero** of the hard guardrails a strict TDD lane depends on (no failing-test-first scaffolding, no coverage gate, no pre-commit, no CI test step, no `test` script).

## 6. Existing SDD artifacts

Checked for parallel SDD directories per ROOT_POLICY forbidden list:

| Path | Status |
|------|--------|
| `proposals/` | **absent** |
| `specs/` | **absent** |
| `designs/` | **absent** |
| `tasks/` | **absent** |
| `sdd/` | **absent** |
| `.sdd/` | **absent** |
| `openspec/` | **absent** |
| `.openspec/` | **absent** |
| `taskReadme/` | **present** (created by orchestrator preflight; contains `sdd-preflight-orchestrator-2026-07-10.md` and now this file) |
| `.atl/` | **absent before this run; created now** |

No stale / conflicting legacy SDD content. Per ROOT_POLICY `proposals/specs/designs/tasks` are forbidden; this init creates neither them nor any hybrid openspec-equivalent files.

## 7. Codegraph index status

- **`.codegraph/` directory**: **absent** at `/Users/vec/workspace/js/PI/tau/.codegraph/`
- **Per skill rules**: sdd-init MUST NOT initialize codegraph (that's a separate lane).
- **Recommendation** (not action): orchestrator may want to suggest `codegraph init -i` as a follow-up if symbol-aware exploration becomes valuable — but that is out of scope for this init.

## 8. Registry summary

Discovered skills/agents/rules in scope of this init (no full scan of user-level `~/.config/opencode/skills/` performed — this registry enumerates what's relevant to the tau repo + the SDD lane set the orchestrator will route through).

### Project-local skills

**None.** `src/skills/` exists at the source level but is not a skill registry — it's a feature surface for in-product `/skill` commands (slashes inside tau). No `skills/` dir, no `.opencode/skills/`, no `.claude/skills/`, no `.atl/skills/` at the project root before this run.

### Project-local agents

**None** at `/Users/vec/workspace/js/pi/tau/agents/`. (The `.claude/hook-events.jsonl` log is session telemetry, not an agent.)

### Project-local rules

| Path | Layer | Content summary |
|------|-------|-----------------|
| `/Users/vec/workspace/js/pi/tau/CLAUDE.md` | repo rules (treated as `AGENTS.md` analog) | Big-picture architecture, lane concept, conventions, build mechanics. Loaded into Claude Code sessions as project context. |
| `/Users/vec/workspace/js/pi/tau/PROMPTS.md` | human note (not a rule) | Free-form past user prompts. **NOT** a rule — orchestrators should not load it as policy. |
| `/Users/vec/workspace/js/pi/tau/COMMANDS.md` | human note (slash-command reference) | Hand-written documentation of slash commands; not an executable rule. |
| `/Users/vec/workspace/js/pi/tau/PROVIDERS.md` | human note | Provider list; not a rule. |
| `/Users/vec/workspace/js/pi/tau/README.md` | project intro | User-facing, not a rule. |

There is **no** top-level `AGENTS.md` and **no** `.opencode/` rule dir. The authoritative project rule file is `CLAUDE.md`.

### Global skills referenced (from CLAUDE.md + opencode.jsonc)

These are the SDD lane skills the orchestrator will route through (verified present in `/Users/vec/.config/opencode/skills/`):

| Skill | Purpose |
|-------|---------|
| `sdd-onboard` | Teach the full SDD cycle with real repo artifacts. |
| `sdd-explore-code` | Code exploration lane for SDD planning. |
| `sdd-explore-research` | External docs / Context7 lookup before proposal work. |
| `sdd-explore-pwcli` | Browser exploration after preflight. |
| `sdd-propose` | Write the proposal artifact for a change. |
| `sdd-spec` | Write requirements + scenarios. |
| `sdd-design` | Write the technical design artifact. |
| `sdd-tasks` | Create the actionable implementation checklist. |
| `sdd-apply-code` | Implement product / runtime / config / schema code. |
| `sdd-apply-doc` | Documentation-only implementation. |
| `sdd-apply-unit-tests` | RED-phase unit test creation (TDD red). |
| `sdd-apply-pwauto-tests` | Persistent Playwright E2E spec creation. |
| `sdd-verify-code` | Review implementation vs spec/design. |
| `sdd-verify-units` | Unit-test evidence verification. |
| `sdd-verify-pwauto` | Playwright E2E evidence verification. |
| `sdd-verify-pwcli` | Browser validation via playwright-cli. |
| `sdd-browser-runtime-context` | Browser runtime preflight resolver. |
| `sdd-archive` | Close completed SDD work. |
| `gh-specialist` | GitHub gh-CLI workflow (branching, PR). |

(Also visible in `/Users/vec/.config/opencode/skills/` but not part of the SDD lane: `simplicio-tasks`, and ~55 others outside SDD scope — not enumerated here.)

### Detected stack skills (from package.json deps)

Key dependencies that have well-known best-practice skills available in the global skills registry:

| Library | Why relevant |
|---------|--------------|
| `@anthropic-ai/sdk` | `claude-api` skill available |
| `@modelcontextprotocol/sdk` | MCP context, no specific skill here |
| `react` 19 + `ink` (TUI) | UI rendering, no specific skill |
| `@opentelemetry/*` | Observability SDK |
| `zod` | Schema validation patterns |
| `esbuild` | Build pipeline |
| `pino` | Logging |
| `pyright` (devDep) | Python type-checker (likely a side dep, not used in main pipeline) |

No library in `package.json` declares a project-local skill override.

## 9. Strict TDD verdict

**PARTIAL.**

There is a clear, mature testing convention in use (88 `.test.ts` files, consistent hand-rolled harness, colocated with source, runnable independently via `bun run`). This is more than `NONE`. However, every structural mechanism that distinguishes "strict TDD" from "tests-as-afterthought" is missing: **no test script, no CI test step, no coverage tool, no coverage gate, no pre-commit hook, no husky/lefthook, no failing-test-first scaffolding skill, no RED-GREEN-REFACTOR lane, no test-on-save workflow**. The 88 tests exist because the authors practice TDD informally — there is no enforced scaffolding.

If the orchestrator wants strict TDD enabled, the apply lanes will need to compensate by:
- adding `bun test` to the verify-units lane's expected commands,
- skipping coverage gates (none to read),
- relying on the existing `.test.ts` pattern as the test location convention,
- NOT introducing a coverage tool mid-stream (that's a separate, larger decision the user should approve).

## 10. Next recommended

**Proceed to `sdd-onboard`.** No blocking gaps.

Per preflight `chained_pr_strategy = single PR per task` and `review_budget = 1`, the SDD cycle is sized for a single PR with one verify pass. Onboard will demonstrate the cycle using a small scoped task, and should explicitly call out:
1. **No coverage gate** — verify-units will surface "coverage: not configured" rather than fail.
2. **No CI test step** — verify-units must NOT wait for CI green; it runs `bun test` locally.
3. **No lint config** — verify-code must NOT lint-check product code; only structural / design-rule review applies.
4. **Test file pattern is `*.test.ts` colocated** — apply-unit-tests will follow that convention.
5. **Build is esbuild + node**, but verify-code should NOT trigger `npm run build` — it's slow and not required for spec/design review.

Optional follow-ups (NOT in this init's scope):
- Consider a coverage tool — needs user decision.
- Consider adding a `bun test` script — trivial, useful.
- Consider initializing `.codegraph/` — out of lane, requires user opt-in.

— end of init —