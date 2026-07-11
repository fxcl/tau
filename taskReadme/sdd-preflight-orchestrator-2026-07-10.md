# SDD Session Preflight — tau repo-local

> 唯一真相源:本文件。Engram 镜像必须与本文件 byte-for-byte 等价。
> Orchestrator 在每次进 sdd-* 子代理前必须读取本文件。

## Metadata

- **created_at**: 2026-07-09T23:44:17Z
- **project**: tau (multi-provider AI coding CLI)
- **repo_root**: /Users/vec/workspace/js/pi/tau
- **repo_head**: 125b8bf21225c83b208270f9ec0ccce036a890ac (v0.92.12, master)
- **session_id**: orchestrator-preflight-2026-07-10
- **orchestrator**: sdd-orchestrator (cc-router-via-yesmem/model-haiku)

## Resolutions

### 1. execution_mode

- **value**: `init + onboard`
- **rationale**: 本仓库从未做过 SDD,没有 taskReadme/.sdd/.atl/ 脚手架。先跑 sdd-init 探测栈/约定/架构/测试能力并落地 skill-registry,再走 onboard 演示完整 SDD 循环。
- **concrete_next_subagent**: `sdd-init` (本 turn 之后的下一 turn)

### 2. artifact_store

- **value**: `hybrid (taskReadme + Engram mirror)`
- **truth_source**: filesystem = taskReadme/<task_id>-<slug>.md (唯一真相源)
- **mirror_target**: Engram (镜像同步)
- **rationale**: 用户显式选择 hybrid。ROOT 策略禁止把 Engram 描述为"默认"或"唯一",因此本文件以 taskReadme 为主、Engram 为副。
- **non_negotiable**:
  - 不允许跳过 taskReadme 直接写 Engram。
  - 不允许把 phase 内容写到 proposals/specs/designs/tasks/ 等并行目录(按 ROOT_POLICY)。
  - legacy 并行 SDD 制品(若 sdd-init 发现)视为 stale/contextual。

### 3. chained_pr_strategy

- **value**: `single PR per task`
- **base_branch_default**: `develop` (coordinador 默认);若 origin/develop 不存在则回退 `master`(本仓当前 HEAD 即在 master)。
- **commit_split**: 3 commits per task per coordinador policy:
  - commit 1 (`branching`): 仅 taskReadme 文件,state=branching
  - commit 2 (`pushing`): 仅 product/code
  - commit 3 (`pushing_docs`): 仅 docs/task 增量
- **pr_target**: `develop`(优先);fallback `master`(当 develop 不存在)
- **rationale**: 用户显式选 single PR per task,与 tau 现状(只有 master)对齐。

### 4. review_budget

- **value**: `1` (轻量)
- **scope**: 每个 spec/design/apply 阶段最多 1 次 `sdd-verify-*` 调用。
- **gan_constraint**: 评审者模型 ≠ 产出者模型(按 sap.md 与 SAP Layer Boundaries)。
  - 生产阶段 (spec/design/apply-*): `cc-router/model-opus`
  - 评审阶段 (verify-*): `cc-router/model-sonnet`
  - prep/survey (init/explore-*/propose/tasks/archive): 默认 `cc-router-via-yesmem/model-haiku`
- **rationale**: 用户显式选 1,降低 prompt 成本。

## Operating constraints (从 ROOT_POLICY 与 sap.md 继承)

- **Persistence contract**: `taskReadme + Engram mirror`;文件系统源是 `taskReadme/<task_id>-<slug>.md`。
- **Forbidden artifacts**: 不写 `proposals/<change>.md`、`specs/<change>.md`、`designs/<change>.md`、`tasks/<change>.md` 等并行目录。Phase 内容只入 taskReadme 对应 section。
- **Legacy handling**: 若发现已有并行 SDD 制品,视为 stale/contextual;若与 taskReadme 冲突,BLOCK 等用户协调。
- **Build steps**: 默认不添加构建步骤(由 sdd-init 探测后再决定)。
- **Delegate-only**: orchestrator 不实现代码、不写测试、不写文档、不做外部研究(除非无 sub-agent 可用)。
- **Sub-agent routing**: 只使用本地 `sdd-*` agent,不使用 `delegate`/`delegation_*` flow。
- **Parallel delegation**: 当多个 sub-agent 工作互不依赖且安全时,同 turn 并行启动。

## Gate ledger

| Gate                                | Status | Evidence                          |
|-------------------------------------|--------|-----------------------------------|
| Gate 1: preflight content complete  | PASS   | 本文件                          |
| Gate 2: taskReadme/ created         | PASS   | `mkdir -p taskReadme` 输出      |
| Gate 3: hybrid artifact_store 确认   | PASS   | 用户显式选 hybrid               |
| Gate 4: chained_pr_strategy 确认     | PASS   | 用户显式选 single PR per task    |
| Gate 5: review_budget 确认           | PASS   | 用户显式选 1                    |
| Gate 6: repo HEAD pinned             | PASS   | 125b8bf21225 (master, v0.92.12)  |

## Next action

- **next_subagent**: `sdd-init`
- **next_subagent_task**: 探测 tau 仓库的栈 / 约定 / 架构 / 测试能力 / 严格 TDD 支持,并将结果落地到:
  - `taskReadme/sdd-init-tau.md`(filesystem 真相源)
  - Engram 镜像(在 init 完成后镜像)
- **allowed_scope**:
  - 只读访问 src/、package.json、bun.lock、build.mjs、build.ts、native/、tests/、.github/、CLAUDE.md、COMMANDS.md、PROVIDERS.md、tau-vscode/、scripts/、docs/、PROMPTS.md
  - 不修改任何产品代码
- **forbidden**:
  - 不写 proposals/specs/designs/tasks/ 并行目录
  - 不创建 README、CHANGELOG、贡献指南
  - 不跑构建、不跑测试(只做静态探测 + 必要的小型 fs/grep 读取)
- **done_condition**:
  - skill-registry.md 落地到 .atl/(由 sdd-init 创建)
  - taskReadme/sdd-init-tau.md 包含:stack, conventions, architecture, testing_capability, strict_tdd_support, registry_summary, next_recommended
  - Engram 镜像已完成
  - 返回 `result: done`
- **return_format**:
  ```
  {
    "result": "done" | "blocked" | "failed",
    "summary": "<one short paragraph>",
    "artifacts": ["<files>"],
    "next_state": "<recommendation>"
  }
  ```