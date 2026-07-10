# SDD Session Preflight — tau (本会话)

> 唯一真相源:本文件。本会话 orchestrator 进 sdd-* 子代理前必须读取本文件。
> 上一会话 preflight 文件 `sdd-preflight-orchestrator-2026-07-10.md` 已被本会话覆盖,见 §Supersession。
> Engram 镜像必须与本文件 byte-for-byte 等价。

## Metadata

- **created_at**: 2026-07-10T19:18:00Z
- **project**: tau (multi-provider AI coding CLI)
- **repo_root**: /Users/vec/workspace/js/pi/tau
- **session_id**: orchestrator-preflight-tau-2026-07-10-session-2
- **orchestrator**: sdd-orchestrator (cc-router-via-yesmem/model-haiku)
- **preflight_inputs**: 用户本会话中显式选择 (4 个 gate 全部回答)

## Resolutions

### 1. execution_mode

- **value**: `heavy-SDD (default)`
- **rationale**: 用户显式选 heavy。tau 是一个跨多 lane 的复杂多模块项目 (entrypoints/lanes/services/tools/commands/components 五大子系统),涉及 Go native helpers、esbuild 构建、MCP/ACP 集成,任何改动都需要完整的 spec → design → apply → verify → archive 门控。
- **concrete_next_subagent**: 视 sdd-init 是否需要重跑(见 §Supersession)

### 2. artifact_store

- **value**: `taskReadme + Engram mirror (default)`
- **truth_source**: filesystem = `taskReadme/<task_id>-<slug>.md` (唯一真相源)
- **mirror_target**: Engram via `yesmem_remember` (project=tau) — 镜像同步,不替代文件系统
- **rationale**: 用户显式选 hybrid。ROOT 策略禁止把 Engram 描述为"默认"或"唯一",因此本文件以 taskReadme 为主、Engram 为副。
- **non_negotiable**:
  - 不允许跳过 taskReadme 直接写 Engram。
  - 不允许把 phase 内容写到 `proposals/<change>.md`、`specs/<change>.md`、`designs/<change>.md`、`tasks/<change>.md` 等并行目录(按 ROOT_POLICY)。
  - legacy 并行 SDD 制品 (若有) 视为 stale/contextual。

### 3. chained_pr_strategy

- **value**: `chained-PR (default)` — 每条变更单独立项,多阶段对应多次推送
- **base_branch_default**: `develop` (coordinador 默认);若 origin/develop 不存在则回退 `master`
- **commit_split**: 与 coordinador policy 一致:
  - commit 1 (`branching`): 仅 taskReadme 文件,state=branching
  - commit 2 (`pushing`): 仅 product/code
  - commit 3 (`pushing_docs`): 仅 docs/task 增量
- **pr_target**: `develop`(优先);fallback `master`(当 develop 不存在)
- **rationale**: 用户显式选 chained-PR;适合跨 lane 的协调性变更与并发多任务;每个 PR 自带闭环 lineage。

### 4. review_budget

- **value**: `full-GAN (opus+sonnet)` — 高强度对抗式审查
- **scope**: spec/design/apply-* 阶段全部走 sonnet 评审,opus 产出 + sonnet 审查形成 tier-heterogeneous GAN
- **gan_constraint** (按 sap.md GAN 政策):
  - 生产阶段 (spec/design/apply-*): `cc-router/model-opus`
  - 评审阶段 (verify-*): `cc-router/model-sonnet`
  - prep/survey (init/explore-*/propose/tasks/archive): `cc-router-via-yesmem/model-haiku`
- **rationale**: 用户显式选 full-GAN;tier-heterogeneity 满足 SAP 异构原则;不允许同模型自审 (FAIL 而非 WARNING)。

## Supersession (与上一会话 preflight 冲突的处置)

上一会话 preflight 文件 `taskReadme/sdd-preflight-orchestrator-2026-07-10.md` 中登记的参数:

| 字段                 | 旧值 (上一会话)         | 新值 (本会话)          | 处置                              |
|----------------------|--------------------------|-------------------------|-----------------------------------|
| execution_mode       | `init + onboard`         | `heavy-SDD`             | superseded                        |
| artifact_store       | `hybrid`                 | `hybrid`                | 一致 (措辞更新)                  |
| chained_pr_strategy  | `single PR per task`     | `chained-PR`            | superseded — 更激进,每条变更独立 PR |
| review_budget        | `1` (轻量)               | `full-GAN`              | superseded — 更高 GAN 强度       |

旧 `sdd-init-tau.md` (2026-07-10 上一轮 init 的产物) 仍作为**上下文/stale contextual**保留 — 它仍然准确描述了 stack/conventions/architecture/testing_capability,只是其 §10 next_recommended 中关于 "single PR + review_budget=1" 的描述已不再适用。

## Operating constraints (从 ROOT_POLICY 与 sap.md 继承)

- **Persistence contract**: `taskReadme + Engram mirror`;文件系统源是 `taskReadme/<task_id>-<slug>.md`。
- **Forbidden artifacts**: 不写 `proposals/<change>.md`、`specs/<change>.md`、`designs/<change>.md`、`tasks/<change>.md` 等并行目录。Phase 内容只入 taskReadme 对应 section。
- **Legacy handling**: 旧 preflight/init/spec/design/tasks/archive 文件保留为 stale/contextual;若与本会话 taskReadme 冲突,BLOCK 等用户协调。
- **Build steps**: 默认不添加构建步骤(由 sdd-init 探测后再决定)。
- **Delegate-only**: orchestrator 不实现代码、不写测试、不写文档、不做外部研究(除非无 sub-agent 可用)。
- **Sub-agent routing**: 只使用本地 `sdd-*` agent,不使用 `delegate`/`delegation_*` flow。
- **Parallel delegation**: 当多个 sub-agent 工作互不依赖且安全时,同 turn 并行启动。
- **SAP heterogeneity (GAN)**: 同模型重做 = self-review violation = FAIL。

## Gate ledger (本会话)

| Gate                                       | Status | Evidence                              |
|--------------------------------------------|--------|---------------------------------------|
| Gate 1: preflight content complete          | PASS   | 本文件                                |
| Gate 2: taskReadme/ present                 | PASS   | 既有 `taskReadme/` 已包含 7 个文件    |
| Gate 3: hybrid artifact_store 确认          | PASS   | 用户显式选 hybrid                     |
| Gate 4: chained_pr_strategy 确认            | PASS   | 用户显式选 chained-PR                 |
| Gate 5: review_budget 确认                 | PASS   | 用户显式选 full-GAN                   |
| Gate 6: repo HEAD pinned                    | PASS   | 既有 init 文件已 pin HEAD 125b8bf21225 |
| Gate 7: legacy preflight supersession 标注  | PASS   | 本文件 §Supersession                  |

## Next action

- **next_subagent**: 不自动启动 `sdd-init` — 既有的 `taskReadme/sdd-init-tau.md` + `.atl/skill-registry.md` 已经覆盖 stack/conventions/architecture/testing_capability/strict_tdd 五项 init 目标,重跑会产生与上一会话相同的制品,违反 SAP 异构 (haiku 重做 haiku)。
- **决策路径 (待用户确认)**:
  1. **复用既有 init 制品 + 直接进入新任务**: 创建一个新 taskReadme 文件 (例 `sdd-propose-<new-change>.md`),走 propose → spec → design → tasks → apply → verify → archive 的标准链。next subagent = `sdd-propose` (新任务名待用户给定)。
  2. **强制重跑 `sdd-init`**: 重新生成 `.atl/skill-registry.md` 与 `taskReadme/sdd-init-tau.md`,覆盖本会话新的 chained-PR/full-GAN 上下文。需要用户明确确认 (本路径违反 SAP 自审禁令 — 同模型重做不被允许,只能由 opus 或 sonnet 重做,haiku 重做 haiku 必须 BLOCK)。
  3. **进入 `sdd-onboard`**: 让 onboard 用本会话的 chained-PR + full-GAN 参数演示完整 SDD 周期,但会与上一会话 onboard 重复 (假设上一会话已完成 onboard)。

- **forbidden**:
  - 不写 proposals/specs/designs/tasks/ 并行目录
  - 不创建 README、CHANGELOG、贡献指南
  - 不跑构建、不跑测试(由后续 sdd-verify-units/sdd-verify-code 阶段负责)

## done_condition (any next sub-agent)

- 必须在 `taskReadme/` 下落地对应 task_id 的 markdown 文件
- 必须在结尾处标注 `result: done | blocked | failed`
- 必须在文中引用本 preflight 文件路径,以保证 lineage 可追溯
- 必须镜像到 Engram (yesmem_remember, project=tau) 并在 taskReadme 中给出 yesmem id

— end of preflight —