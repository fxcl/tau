# sdd-design — add-test-script-and-ci-test-step

## Metadata

- **change_id**: add-test-script-and-ci-test-step
- **created_at**: 2026-07-10
- **project**: tau (multi-provider AI coding CLI, v0.92.12)
- **repo**: /Users/vec/workspace/js/PI/tau
- **phase_executor_model**: cc-router/model-opus (production tier)
- **phase_role**: production (GAN: reviewed later by sonnet)
- **predecessor**: taskReadme/sdd-spec-add-test-script-and-ci-test-step.md
- **artifact_store**: hybrid (taskReadme = filesystem truth, Engram mirror)
- **review_budget**: 1

## Approach

本变更最小化触碰面：仅修改两个文件，每个文件都只新增内容、不删除/重排现有内容。

- **`package.json`**：在 `scripts` 块里以单行新增 `"test": "bun test"`。位置选择紧跟 `"build"`（首项）之后，使 `test` 紧邻构建命令，符合 npm 脚本的常见分组（构建 → 测试 → 打包）。
- **`.github/workflows/ci.yml`**：在 `jobs:` 下、现有 `test:` job **之前** 插入一个名为 `unit-tests:` 的新 job。新 job 是**独立**的，不与现有 build+smoke job 共享任何 step（避免一个 job 的失败掩盖另一个的状态）。runner 矩阵 `{ubuntu-latest, macos-latest}` 通过 `strategy.matrix.os` 表达；排除 `windows-latest`（bun 在 Windows CI 上不可靠，与同文件 `build-bun` job 决策一致）。使用 `oven-sh/setup-bun@v1`（已在 `build-bun` job 中使用），`bun-version: latest`。

**关键设计决策**：CI 上的运行步骤使用 `bun test` **直接调用二进制**，**不**用 `npm test` 间接走 `package.json` 的 `scripts.test`。理由：CI 上 `npm ci` 之后 `node_modules` 是干净的；新增的 `scripts.test` 主要是给**本地开发**用的入口（不需要全局安装 bun 也能 `npm test`）。CI 走二进制则避免把"脚本入口"和"CI 步骤"耦合——这也是为什么 spec SCN-4 的 verify 措辞是"step whose `run:` value is `bun test`"而不是"calls `npm test`"。

## File-level changes

### File 1: `package.json`

精确 diff（unified format, context 3）：

```diff
--- a/package.json
+++ b/package.json
@@ -28,7 +28,8 @@
   "scripts": {
     "build": "node build.mjs",
     "build:bun": "bun run build.ts",
     "build:native-shell": "node scripts/build-native-shell-parser.mjs",
     "build:native-tools": "node scripts/build-native-tools.mjs",
+    "test": "bun test",
     "preinstall": "node scripts/preinstall.mjs",
     "postinstall": "node scripts/postinstall.mjs",
     "prepublishOnly": "node build.mjs"
```

要点：
- 位置：`build:native-tools`（最后一项 build 类脚本）之后、`preinstall` 之前。这样 `scripts` 的语义顺序是 *build → test → install hooks → publish*。
- 字符串值：`"bun test"`（不带任何 flag）。bun 默认会扫描当前目录所有 `*.test.ts`，与 sdd-init §4 描述的"88 个 `.test.ts` 文件 colocated"一致。
- 不引入新依赖、不修改 `engines` 节点、不修改 lockfile。

### File 2: `.github/workflows/ci.yml`

精确 diff（unified format, context 3）。在 `jobs:` 之后、现有 `test:` job 之前插入新 job：

```diff
--- a/.github/workflows/ci.yml
+++ b/.github/workflows/ci.yml
@@ -13,6 +13,31 @@
   workflow_dispatch:
 
 jobs:
+  # Unit tests — run the 88 hand-rolled bun test files on every push and PR.
+  # Kept as a separate job from the build+smoke `test:` job below so a unit
+  # test regression is observable in isolation and does not mask the build
+  # / smoke signal (and vice versa). Windows is intentionally excluded:
+  # bun on Windows CI is flaky, matching the `build-bun` job's policy.
+  unit-tests:
+    name: Unit tests (bun) - ${{ matrix.os }}
+    runs-on: ${{ matrix.os }}
+    strategy:
+      fail-fast: false
+      matrix:
+        os: [ubuntu-latest, macos-latest]
+
+    steps:
+      - name: Checkout
+        uses: actions/checkout@v4
+
+      - name: Setup Bun
+        uses: oven-sh/setup-bun@v1
+        with:
+          bun-version: latest
+
+      - name: Run bun test
+        run: bun test
+
   # Main matrix
   # Every OS x Node 20 (minimum) and Node 22 (current LTS). fail-fast is
   # off so a macOS failure doesn't hide a Linux or Windows issue.
```

要点：
- 命名：job key 是 `unit-tests`（与现有 `test:` job 不冲突，spec SCN-2 的 grep 模式 `^\s*unit-tests:` 命中此 key）。
- `fail-fast: false`：与同文件 `test:` job 一致，避免一个 runner 失败时其他 runner 被取消。
- 不调用 `npm ci` / `npm install`：bun 直接读源码运行 `*.test.ts`，依赖由 bun 按需解析（仓库 lockfile 中 `bun.lock` 存在；如需可后续加 `bun install` 步骤，但本变更保持最小）。
- 三个 step：`Checkout` → `Setup Bun` → `Run bun test`。Step 名以 `bun` 修饰，区分于现有 Node-based step。
- 不触碰现有 `test:` / `windows-no-bash` / `build-bun` 任何 step；不修改 `on:` / `name:` 头。

## Trade-offs

1. **CI 上 `bun test` 不走 `npm ci`**
   - **Pro**：更少依赖（不要求 `node_modules`），更直接，与设计意图一致。
   - **Con**：bun 会按需从 `bun.lock` 解析依赖；如果仓库历史上有过 `bun install` 漂移，第一次 CI 运行可能产生与本地不同的解析。
   - **判定**：接受此 trade-off，原因是 spec 的成功标准允许"baseline failure"作为 follow-up；本变更不解决 lockfile 一致性问题。

2. **不绑定 `bun-version: latest` 到具体版本**
   - **Pro**：与同文件 `build-bun` job 风格一致（那里也是 `bun-version: latest`），无需每次升级手动更新 PR。
   - **Con**：上游 breaking change 会在 CI 上突然出现。
   - **判定**：接受，理由与 `build-bun` 相同——这条路径是 contributor-convenience，不是发布产线。**与现有 `test:` (build+smoke) job 解耦**确保 breaking 不影响发布。

3. **不把 `node_modules` 安装与 `bun test` 串行**
   - **Pro**：最小步骤数；明确"测试只读源码"的语义。
   - **Con**：若某个 `.test.ts` 实际 import 了未通过 `bun install` 解析的依赖（极少见但理论可能），会得到模块解析失败而非测试断言失败。
   - **判定**：接受。基于 sdd-init §4 的 88 文件统计，全部为 TS 源码 + stdlib + 同仓库工具，无外部网络依赖。

## Open questions

无阻塞问题。`sdd-archive` 阶段会把以下两点归类为 follow-up：

- 是否需要在 `unit-tests` job 里加入 `bun install` 步骤（取决于首次 CI 运行时 88 个测试的解析结果）。
- 是否需要把 `bun-version` 钉死到具体版本（建议在 `unit-tests` 持续绿 ~2 周后做）。

— end of design —
