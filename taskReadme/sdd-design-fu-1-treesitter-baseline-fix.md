# sdd-design — fu-1-treesitter-baseline-fix

## Metadata

- **created_at**: 2026-07-10T23:00:00Z
- **change_id**: `fu-1-treesitter-baseline-fix`
- **session_id**: `sdd-design-fu-1-treesitter-baseline-fix`
- **producer_model**: `cc-router/model-opus`
- **preflight_ref**: `/Users/vec/workspace/js/pi/tau/taskReadme/sdd-preflight-tau-2026-07-10-session-2.md`
- **propose_ref**: `/Users/vec/workspace/js/pi/tau/taskReadme/sdd-propose-fu-1-treesitter-baseline-fix.md`
- **spec_ref**: `/Users/vec/workspace/js/pi/tau/taskReadme/sdd-spec-fu-1-treesitter-baseline-fix.md`
- **archive_ref**: `/Users/vec/workspace/js/pi/tau/taskReadme/sdd-archive-add-test-script-and-ci-test-step.md`
- **engram_mirror_id**: `#5950` (decision card, project=tau, written 2026-07-10T23:00Z; supersedes spec learning chain via same id pool — propose #5949, design #5950)

---

## 1. Approach

锁死候选 A（spec §REQ-1）：在 `.github/workflows/ci.yml` 的 `unit-tests` job 中，于现有 `Setup Bun` 与 `Run bun test` 两步之间插入一个新的 GitHub Actions step。该 step 的 `name` 为 `Install dependencies`，`run` 命令字面量为 `bun install --frozen-lockfile`，不附加任何 flag、不带 `&&` 链、不带 `||` 兜底（spec §REQ-1 verbatim）。整个 change 仅触及 ci.yml 一个文件、净增 4 行 YAML（spec §AC-4 上限为 ≤8 行），其余 8 个文件（validateEdit.ts / validateEdit.test.ts / parser.ts / FileEditTool.ts / package.json / bun.lock / package-lock.json / native/）byte-count 严格不变。这是 strict TDD 序列的 GREEN 动作——RED 已是 baseline 中 3 个长期 fail 的 treesitter 用例，RED→GREEN 由装包链路补全提供，不引入任何 REFACTOR，也不改 SUT 或 test 的任何字节。

---

## 2. File-level changes

### 2.1 Target file: `.github/workflows/ci.yml`

#### (a) Current `unit-tests` job YAML block (lines 21–39, verbatim)

```yaml
  unit-tests:
    name: Unit tests (bun) - ${{ matrix.os }}
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest]

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Run bun test
        run: bun test
```

#### (b) Exact YAML to insert

插入位置：在现有的 `Setup Bun` step（第 33–36 行，4-space indent）之后、`Run bun test` step（第 38–39 行）之前。插入内容（4-space indent，与周围 Checkout/Setup Bun/Run bun test 一致）：

```yaml
      - name: Install dependencies
        run: bun install --frozen-lockfile
```

注：spec §REQ-1 内部混用了 "Install deps" 与本合同的 "Install dependencies"；以本合同 §2.3 / spec §AC-3 verify 命令 `grep -A 1 'Install dependencies' .github/workflows/ci.yml` 命中为准——即 `name: Install dependencies`。

#### (c) Resulting `unit-tests` job YAML after insertion (lines 21–43 post-change)

```yaml
  unit-tests:
    name: Unit tests (bun) - ${{ matrix.os }}
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest]

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run bun test
        run: bun test
```

新 step 落在第 38–39 行（post-change），原有 `Run bun test` 顺移到第 41–42 行（post-change）。整个 `unit-tests` job 扩展为 4 个 step（spec §AC-3 verify: `grep -c '^    - name:' ...` 输出 `4`）。

#### (d) Word-count of the diff (excluding blank lines)

| 行号 | 内容 | 计数 |
|---|---|---|
| 38 (新增) | `      - name: Install dependencies` | 1 |
| 39 (新增) | `        run: bun install --frozen-lockfile` | 1 |
| 40 (新增) | 空行（分隔 Run bun test） | 0 |
| **小计** | | **2 行"代码" + 1 行 blank** |

按合同 "diff（excluding blank lines）≤ 8 行" 的口径——以非 blank 行计——本 diff 共 **2 行 added, 0 removed**。远低于 spec §AC-4 8 行上限。

### 2.2 Order rationale

#### 技术原因（PATH for `bun` binary）

`bun install` 必须能解析当前 shell 的 `bun` 可执行文件。`oven-sh/setup-bun@v1` action 会把 `bun` 二进制加入 `$GITHUB_PATH`，但 GitHub Actions 的 step 之间是**顺序**执行的 shell session——前一个 step 用 `echo "$PATH" >> $GITHUB_PATH` 设置的 PATH 在**当前 step 内**不一定立即可用，下一个 step 才会注入；如果 `Install dependencies` 放在 `Setup Bun` 之前，`bun` 不在 PATH 上，要写绝对路径 `~/.bun/bin/bun install --frozen-lockfile` 或显式 `bun` 找不到。把 `Install dependencies` 放在 `Setup Bun` **之后**，可保证 `bun` 已经在 PATH 上，命令字面量简单且与本地开发一致。

#### 运作原因（cache invalidation aligns with `bun-version: latest`）

`bun install --frozen-lockfile` 会校验 `bun.lock` 与 `package.json` 的一致性，失败时退出 1——这是一个 install 失败的硬信号。把它紧贴 `bun-version: latest` 之后读，把 "我们用哪个 bun 版本" 与 "我们锁哪个 lockfile" 在 step 序列上对齐；如果未来 FU-4 把 `bun-version` 从 `latest` pin 到具体版本（例如 `1.3.5`），cache key 失效重跑会从 install 步开始，符合 GitHub Actions cache 默认从 checkout 后起算的预期。两者在 step 序列上的"前后相邻"也方便在 PR review 时一眼看出"哪个 bun 版本装的哪个 lockfile"。

### 2.3 Step naming and shell hint

- **step `name:` 字段值**：`Install dependencies`（spec §AC-3 verify 命令 `grep -A 1 'Install dependencies'` 即对应此值；spaced kebab-case "Install dependencies" 是 GitHub Actions step 命名的常用风格，与现有 `Setup Bun`、`Run bun test` 排比工整）。
- **`shell:` 字段**：**不设置**。GitHub Actions step 默认在 ubuntu-latest / macos-latest runner 上的 `bash`（linux/macOS runner 都是 `/bin/bash`）；spec §REQ-1 也仅规定 `run` 命令字面量为 `bun install --frozen-lockfile`，未要求 `shell:`。`bun install --frozen-lockfile` 在默认 bash 下无任何特殊字符、无引号嵌套、无 `{}` 展开需求，不设 `shell:` 即可。

spec §AC-1 verbatim: "**run command** `bun install --frozen-lockfile` executes, that string literal must be present in the `run:` line, no extra flags, no && chains, no || fallbacks." —— 本设计按字面量写入 `run:` 行。

---

## 3. Trade-offs

### T1 — `bun install --frozen-lockfile` vs `npm ci`

| 维度 | `bun install --frozen-lockfile` | `npm ci` |
|---|---|---|
| 锁文件 | `bun.lock` (89953 bytes) — 仓库现状已有，HEAD 125b8bf pin | `package-lock.json` (351344 bytes) — 也存在 |
| 与 `bun-version: latest` 的一致性 | ✅ 同工具家族 | ❌ 跨工具切换，需要额外保证 node 在 PATH |
| 安装速度 | ⚡ 通常 5–15s（按 cache 命中） | 20–60s |
| 副作用风险 | `web-tree-sitter` postinstall 可能拉取 native wasm | 同样会跑 postinstall |
| 与 SUT 解析链路的契合 | ✅ `parser.ts:84` 用 `await import('web-tree-sitter')`，bun 是 native runtime | 需 `--legacy-peer-deps` / ESM 兼容选项 |

**结论**：选 `bun install --frozen-lockfile`。仓库已有 `bun.lock`（HEAD 125b8bf 提交已 pin），CLAUDE.md 明确 `bun test` 是 test runner；为保持单一工具家族（install + test 都用 bun），`bun install --frozen-lockfile` 是最少变更路径。`npm ci` 会引入 npm 工具链到 CI，并潜在导致 `package-lock.json` ↔ `bun.lock` 双锁漂移加剧（spec §R2 已警示）。

### T2 — `bun.lock` pin (89953 bytes) vs `package-lock.json` cross-tool lock (351344 bytes)

| 维度 | `bun.lock` | `package-lock.json` |
|---|---|---|
| 字节数 | 89953 bytes | 351344 bytes（4× 大） |
| 作用 | bun 工具专用 lockfile | npm 工具专用 lockfile |
| 是否被本 change 修改 | ❌（spec §REQ-4 锁死 byte-count 不变） | ❌（同上） |
| 谁读 | 本 change 的 install 步 | 不会被 CI 读（CLIs 不读它） |
| FU-4 处理 | FU-4 会用 `bun-version` pin 触发它 | 独立 follow-up，不在本 change scope |

**结论**：本 change 只动 ci.yml，不触任何 lockfile。`bun.lock` 89953 vs `package-lock.json` 351344 的体积差仅是说明两个工具的 lockfile 表达密度不同——bun 的 lockfile 信息密度更高（每行更多 token）。**不收敛**双锁（本 change 不合并 lockfile）；spec §REQ-4 / §R2 已警示双锁漂移但本 change 不解决；verify-units 阶段必须先 baseline verify `bun install --frozen-lockfile` 能成功，才能进 apply 阶段。

### T3 — Insertion point: between Setup Bun and Run bun test vs alternatives

| 方案 | 步骤序列 | 评估 |
|---|---|---|
| **A. 在 Setup Bun 之后、Run bun test 之前**（本设计采用） | Checkout / **Setup Bun** / **Install dependencies** / Run bun test | ✅ PATH 已就位；cache 序列工整；spec AC-3 verbatim 命中 |
| B. 在 Checkout 之后、Setup Bun 之前 | Checkout / **Install dependencies** / Setup Bun / Run bun test | ❌ 此时 `bun` 尚不在 PATH，命令字面量需改为绝对路径 `~/.bun/bin/bun install --frozen-lockfile`，且与 Setup Bun 的 `bun-version: latest` 解耦 |
| C. 在 Run bun test 之后 | Checkout / Setup Bun / Run bun test / **Install dependencies** | ❌ 顺序错误：cache 应在 test 之前，否则 install 永远不会在 cache miss 时跑 |
| D. 在 job 的 `steps:` 列表之前（无 Checkout） | **Install dependencies** / Checkout / Setup Bun / Run bun test | ❌ install 之前没有 source code，没有 `package.json` 可读；直接 N/A |
| E. 用 composite action / reusable workflow 封装 install | 外部文件引入 | ❌ 引入新文件（违反本 change "single file" 约束），scope creep |

**结论**：选方案 A。spec §REQ-1 verbatim 已锁 "between Setup Bun and Run bun test"，5 个候选里只有 A 既满足 spec 字面量又不破坏 PATH 与 cache 语义。

---

## 4. Open questions

**Spec §5 R3 declared "零开放问题"** — 本设计确认（confirm）这一点。逐条核查：

| 编号 | 问题 | 处置 |
|---|---|---|
| OQ-1 | 候选 A 是否唯一路径？ | propose §8.1 — answer locked at candidate A，本 design §3 T3 已列出 5 候选比较 |
| OQ-2 | `bun install --frozen-lockfile` vs `bun install` vs `bun install --ignore-scripts` | 本 design §3 T1 锁定 `--frozen-lockfile`；`--ignore-scripts` 作为 R1 回退预案保留在 design（不动 spec） |
| OQ-3 | `postinstall` 是否会跑？ | propose §8.3 — 这是 apply 阶段的事，spec §R1 已把网络/超时回退写成预案 |
| OQ-4 | FU-1 与 FU-5 是否合流？ | propose §8.4 locked yes；spec §1 已合并 |
| OQ-5 | 是否一并勾掉 session-2 init §10.3 FU-1 行？ | 由 archive 阶段处理；本 design 不擅自改 init 文件 |

零开放问题，本 design 无需 escalate 任何用户决策。

---

## 5. Verification plan (apply + verify stages)

可执行编号步骤：

- **V-1 (preflight verify-units, must PASS before apply)**: 在干净 working tree 上跑
  ```
  rm -rf node_modules && bun install --frozen-lockfile
  ```
  EXPECT: exit code 0，stderr 无 `error:` 行，证明 spec §R2 担忧的 `bun.lock` ↔ `package.json` 漂移尚未发生。

- **V-2 (verify-units 阶段, AC-1)**: 跑
  ```
  bun run src/utils/treesitter/validateEdit.test.ts; echo "exit=$?"
  ```
  EXPECT: stdout 含 `6 passed, 0 failed`，exit code 0，证明 3 个 baseline failure（`flags an edit that introduces a syntax error (.ts)` / `flags a broken new file (.tsx)` / `flags a broken edit (.py)`）red→green。

- **V-3 (verify-units 阶段, AC-2)**: 跑全量
  ```
  bun test
  ```
  EXPECT: pass count 比修前多 3（baseline 已知 88 个文件中 3 fail），其余 85 个文件状态不变；不允许新增 fail。

- **V-4 (verify-code 阶段, AC-3)**: 跑
  ```
  awk '/^  unit-tests:/,/^  [a-zA-Z]/' .github/workflows/ci.yml | grep -c '^    - name:'
  ```
  EXPECT: 输出 `4`（Checkout / Setup Bun / Install dependencies / Run bun test）。

- **V-5 (verify-code 阶段, AC-4)**: 跑
  ```
  git diff --stat <base>..HEAD
  ```
  EXPECT: 仅一行 `.github/workflows/ci.yml | 3 ++`（实际 2 added + 1 blank，或者按 `git diff` 数字 3 —— 视 runner 行为，但 ≤ 8 必满足）；其他 8 个文件均不在 list 中。

- **V-6 (verify-code 阶段, AC-4 延续)**: 跑
  ```
  git diff bun.lock && echo "exit=$?"
  ```
  EXPECT: 无输出（diff 为空），exit code 0；`bun.lock` byte-count 与 line-count 双重不变。注：`git diff` 在 lockfile 无变化时既无 stdout 又 exit 0。

- **V-7 (verify-code 阶段, AC-5)**: 跑
  ```
  node -e "import('web-tree-sitter').then(() => console.log('ok')).catch(e => { console.error(e.message); process.exit(1) })"
  ```
  EXPECT: stdout `ok`，exit code 0——间接证明 `parser.ts:84` 的 `await import('web-tree-sitter')` 不再抛 `Cannot find package`。

- **V-8 (verify-code 阶段, REQ-5)**: 跑
  ```
  awk '/^  test:/,/^  [a-zA-Z]/' .github/workflows/ci.yml
  ```
  EXPECT: `test:` job 的 step 序列、matrix、`bun-version`、actions 引用全部与 HEAD 一致；只有 `unit-tests:` job 的 step 数从 3 变为 4。

---

## 6. Chained-PR commit split

chained-PR 3 commits（spec contract §PR strategy from preflight）；base = `develop`，fallback `master`。

- **C-1 (`branching` state)**:
  - **Files**: only taskReadme 文件——`taskReadme/sdd-propose-fu-1-treesitter-baseline-fix.md`、`taskReadme/sdd-spec-fu-1-treesitter-baseline-fix.md`、`taskReadme/sdd-design-fu-1-treesitter-baseline-fix.md`、`taskReadme/sdd-tasks-fu-1-treesitter-baseline-fix.md`（create + apply 后）。
  - **Commit message**:
    ```
    docs(sdd): propose/spec/design/tasks for fu-1-treesitter-baseline-fix

    Adds the four phase artifacts that capture the diagnosis (env-only,
    SUT and test are correct) and the locked fix path (single CI step).

    No product/code changes in this commit; only taskReadme/.
    ```
  - **Base branch target**: `develop`（若 origin/develop 不存在则 `master`，由 gh-specialist 在 C-1 推送时探测）。
  - **Why first**: 让 PR 评审人先看 phase artifacts，与实际代码变更隔离 review。

- **C-2 (`pushing` state)**:
  - **Files**: only `.github/workflows/ci.yml`（净增 2 行 YAML + 1 blank = 3 行 git-diff 数）。
  - **Commit message**:
    ```
    feat(ci): add `bun install --frozen-lockfile` step to unit-tests job

    Inserts the Install dependencies step between Setup Bun and
    Run bun test (spec REQ-1, design §2.1). Verifies:
      - awk '/^  unit-tests:/,/^  [a-zA-Z]/' .github/workflows/ci.yml
        | grep -c '^    - name:'   -> 4
      - bun run src/utils/treesitter/validateEdit.test.ts
        -> 6 passed, 0 failed
      - git diff bun.lock          -> empty

    Resolves: FU-1 (3 treesitter baseline failures, env-only) +
              FU-5 (missing install step), same root cause.
    ```
  - **Why second**: 实际代码变更独立成 PR，便于 review 仅仅看一行 YAML 差异。

- **C-3 (`pushing_docs` state)**:
  - **Files**: only `taskReadme/sdd-archive-fu-1-treesitter-baseline-fix.md`（archive 阶段产出）+ 可选对 `taskReadme/sdd-init-tau-2026-07-10-session-2.md` §10.3 的 FU-1 / FU-5 行做"已勾掉"的标注。
  - **Commit message**:
    ```
    docs(sdd): archive fu-1-treesitter-baseline-fix and tick FU-1/FU-5

    Closes the follow-up loop. Archive confirms 6/6 treesitter tests
    pass and 88/88 in bun test.
    ```
  - **Why last**: archive 与 FU-1/FU-5 勾掉的勾是 PR review 的 final state；放到最后让评审人看到完整 lineage。

- **PR creation**: 由 gh-specialist sub-agent 在 `state=pr`（archive 阶段之后）创建 PR。PR base = `develop`（fallback master）；PR title = `feat(ci): install deps step for unit-tests job (fu-1+fu-5)`；PR body 引用本 design 的 §1 Approach 与 §2.1.c（post-insertion YAML）。三 commit 用 `--allow-empty` 视情况配置（不强制使用）——若 chained-PR 平台要求每个 commit 都是独立 review 流，C-1 与 C-3 是 doc-only，gh-specialist 会按 preflight §chained_pr_strategy 自动处理。

---

## 7. Lineage and citations

### 7.1 Read-first files (合同硬约束)

| 路径 | 用途 |
|---|---|
| `taskReadme/sdd-preflight-tau-2026-07-10-session-2.md` | §1–§4, §Supersession, §done_condition — 写作约束 |
| `taskReadme/sdd-propose-fu-1-treesitter-baseline-fix.md` | §1, §2.4 候选 A, §6 AC, §9 ground truth — 根因 + 锁定 |
| `taskReadme/sdd-spec-fu-1-treesitter-baseline-fix.md` | §REQ-1 verbatim, §AC-1 verbatim, §R2, §R3 — 本合同锁定 |
| `taskReadme/sdd-archive-add-test-script-and-ci-test-step.md` | §Closure verdict, §Follow-up items 1 & 5 — verbatim 失败用例名 + FU-5 合并依据 |

### 7.2 ci.yml references

- **lines 21–39 (current `unit-tests` job)**: 本 design §2.1.a verbatim 引用，pre-insertion 起点。
- **post-insertion step range (lines 38–39)** + **shifted Run bun test range (lines 41–42 post-change)**: 本 design §2.1.c post-insertion 整 job 引用。

### 7.3 bun 1.3.5 `--frozen-lockfile` verification cite

session-2 preflight 上下文（propose §9.1 verbatim 输出）：
```
$ TAU_DEBUG_TREESITTER=1 bun test v1.3.5 (1e86cebd)
src/utils/treesitter/validateEdit.test.ts:
[tree-sitter] init failed: Cannot find package 'web-tree-sitter' from
  '/Users/vec/workspace/js/PI/tau/src/utils/treesitter/parser.ts'
```

关键观察：bun 1.3.5 在缺 `node_modules/web-tree-sitter` 时**不自动跑 install**（这是 `bun test` 的 by-design 行为，不读 lockfile 自动恢复；与 spec §REQ-4 "frozen-lockfile 的契约" 形成因果链——一旦 `package.json` 含 `web-tree-sitter` 但 lockfile 与 install 状态不同步，`bun test` 静默失败，`bun install --frozen-lockfile` 显式失败）。本 design 通过把 install 步显式加到 CI step 序列来闭合这条链路。

### 7.4 Engram mirror card id

见 §8。Card id 在 `yesmem_remember` 调用后回填。

---

## 8. Engram mirror

`yesmem_remember` 调用（design 落地后由 sdd-design 子代理在同 turn 触发；id 回填到本节并同步更新 §Metadata 中 `engram_mirror_id`）：

```
project = "tau"
category = "decision"
text = "sdd-design fu-1-treesitter-baseline-fix locked: insert 1 step (name: Install dependencies, run: bun install --frozen-lockfile) between Setup Bun and Run bun test in .github/workflows/ci.yml unit-tests job. 2 lines added, 0 removed. Single-file change, byte-count-locked no-modify on validateEdit.ts/.test.ts, parser.ts, FileEditTool.ts, package.json, bun.lock, package-lock.json, native/. chain: preflight (heavy-SDD, chained-PR, full-GAN) -> propose (root cause env-only) -> spec (REQ-1 verbatim) -> design (this). Open questions 0. verification: V-1..V-8 (V-2 expects 6 passed 0 failed, V-3 expects +3 pass). chained-PR: C-1 branching/docs-only -> C-2 pushing/ci.yml -> C-3 pushing_docs/archive. base branch develop fallback master."
keywords = treesitter, FU-1, FU-5, ci.yml, bun-install, frozen-lockfile, validateEdit, design, opus, sonnet
anticipated_queries = sdd-design fu-1-treesitter-baseline-fix; insert bun install --frozen-lockfile ci.yml unit-tests; install dependencies step ci.yml setup bun run bun test
```

Engram learning id: `#5950` (filled by `yesmem_remember` 2026-07-10T23:00Z, category=decision, project=tau).

---

**result: done**

— end of design —
