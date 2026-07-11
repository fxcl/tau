# sdd-propose — add-test-script-and-ci-test-step

## Metadata

- **change_id**: add-test-script-and-ci-test-step
- **created_at**: 2026-07-10
- **project**: tau (multi-provider AI coding CLI, v0.92.12)
- **repo**: /Users/vec/workspace/js/PI/tau
- **phase_executor_model**: cc-router-via-yesmem/model-haiku (prep/survey tier)
- **phase_role**: prep (GAN: reviewed later by sonnet)
- **predecessor**: sdd-init-tau.md §5 + §9 (verdict: PARTIAL)
- **artifact_store**: hybrid (taskReadme = filesystem truth, Engram mirror)
- **review_budget**: 1

## Why

`taskReadme/sdd-init-tau.md` §5 (Testing capability) and §9 (Strict TDD verdict) 给出 PARTIAL 判定：88 个 `.test.ts` 文件使用了成熟且一致的手写测试桩，分布在 `src/lanes/shared/`、`src/tools/BashTool/`、`src/utils/` 等位置，但 **没有任何结构性保障机制**——没有 `package.json` 里的 `test` 脚本，也没有 `.github/workflows/ci.yml` 里的测试步骤。结果是：测试约定是一种"实践"而非"执行"，测试在 CI 上从未被运行。

本变更的目的正是 sdd-init §9 末尾（"Next recommended"）所列的最简补救项之一——**以最小可能的结构性修复把单一缺口关闭**：补一段 `bun test` 脚本和一个真正的 CI 测试步骤。这不是引入 coverage 工具、不是引入 pre-commit 钩子、不是调整测试架构——只是让 88 个已存在的测试在 CI 上被真正运行，让 PARTIAL 至少朝 FULL 迈出可验证的一步。

## What changes

恰好两处文件编辑（详细 patch 在后续 `sdd-design` 阶段产出）：

### Edit 1 — `package.json`

在 `scripts` 块里追加一项：

```json
"test": "bun test"
```

位置：紧贴现有 `"build"` 之下。**这是本地开发用的入口；不改变 `prepublishOnly`、`postinstall`、lockfile，也不向 `node_modules` 引入新依赖。**

### Edit 2 — `.github/workflows/ci.yml`

新增一个名为 **`unit-tests`** 的 job（注意：现有 `test:` job 是构建 + 烟雾测试，名字会和它冲突；spec 阶段已确定新 job 命名为 `unit-tests` 避免歧义）。该 job：

- 在现有 `test:` job **之前** 声明（语义顺序：先验证单元测试，再验证构建和烟雾）。
- 在 `ubuntu-latest` + `macos-latest` 两个 runner 上跑（**不含 Windows**：参考原仓库注释 "Bun on Windows CI is flaky"，参考自同文件 `build-bun` job 的 linux-only 选择）。
- 通过 `oven-sh/setup-bun@v1`（`bun-version: latest`）安装 bun，与 `build-bun` job 使用一致。
- 直接调用二进制 `bun test`，**而非** `npm test`——如此一来如果 `node_modules` 异常无法掩盖真正的测试失败（spec 决策点）。

## Out of scope

明确以下事项**不在本变更内**：

- **不引入 coverage 工具**（`c8` / `vitest --coverage` / 等）——这是 sdd-init §9 明确列为"需要用户决策的更大决策"，本 PR 不背负该决策。
- **不引入 pre-commit 钩子**（husky / lefthook / simple-git-hooks）——同上，属于独立决策。
- **不启用 Windows runner**——bun 在 Windows CI 上不可靠；同文件 `build-bun` job 已是 Linux-only，本新 job 沿用相同策略。
- **不增加 lint 配置**——仓库根不存在任何 lint 配置（`sdd-init` §2 已确认），保持现状。
- **不增加构建步骤**——本变更只引入测试步骤；不在 `npm test` 里嵌套构建。
- **不修改 lockfile**——不动 `bun.lock` 与 `package-lock.json`。
- **不调整 88 个 `.test.ts` 文件本身**——本变更零行为变更到产品代码与测试代码。

## Risks

1. **首次 CI 运行可能揭露预先存在的测试失败**
   - 来源：88 个 `.test.ts` 文件此前从未在 CI 上运行过；其中某些可能对运行环境敏感（文件系统时序、原生 helper 在 macOS / Ubuntu 上的差异、`@cortexkit/aft-*-<platform>` 的 optionalDependencies 行为）或因代码漂移已经失效。
   - 缓解：把首次运行结果作为 follow-up 报告（独立 issue），**不在本 PR 内**追逐修复。本 PR 的成功标准是"job 存在并运行 `bun test`"，不是"全部 88 个测试通过"。

2. **`oven-sh/setup-bun@v1` + `bun test` 引入新的外部 CI 依赖**
   - 来源：与同文件 `build-bun` job 共用同一个第三方 action 与运行时；如果该 action 受损，新的 `unit-tests` job 会失败。
   - 缓解：作为独立 job 插入，**不阻塞**现有 `test:` (build+smoke) job 的成功状态。也就是说，CI 的整体绿/红判定不被新 job 绑架；如果 `unit-tests` 失败而 `test` 通过，是可观察的、可独立修复的失败模式，不影响构建与发布产线。

3. **（次要）`bun test` 行为 vs `bun run <file>.test.ts`**
   - 来源：仓库以 88 个独立运行文件为主流（顶部 docstring `Run: bun run …`），现在改为 `bun test`（glob 模式）会一次性跑全部 88 个；潜在存在跨文件全局副作用（例如 `process.cwd`、共享状态）。规格上仍然使用 `bun test` 因为这是 bun 官方约定；但需要 `sdd-verify-units` 阶段显式对首次全量执行结果做一次观察。

## Success criteria

具体、可证伪（falsifiable）：

1. **本地命令**：`npm test`（在仓库根执行，等价于 `bun test`）退出码为 0，**或** 退出码非零但失败原因已在 follow-up issue 中记录、且**不是本变更引入的回归**。
2. **文件证据**：`/Users/vec/workspace/js/PI/tau/.github/workflows/ci.yml` 内含一个名为 `unit-tests` 的新 job（与现有名为 `test:` 的构建+烟雾 job 区分开）；该 job 含 `oven-sh/setup-bun@v1` 步骤，并以 `bun test` 为最终运行步骤。
3. **CI 观察**：下一次对 `master` 的 PR 在 GitHub Actions 摘要中可看到 `unit-tests` job（与现有 `test` job 并列），并确实在 `ubuntu-latest` 和 `macos-latest` 两个 runner 上执行。
4. **作用域证据**：`git diff` 仅触及 `package.json` 和 `.github/workflows/ci.yml` 两个文件；不出现对 `src/**/*.test.ts`、`bun.lock`、`package-lock.json`、workflow 中其它 job 的修改。

— end of propose —
