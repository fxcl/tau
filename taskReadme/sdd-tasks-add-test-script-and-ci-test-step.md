# sdd-tasks — add-test-script-and-ci-test-step

## Metadata

- **change_id**: add-test-script-and-ci-test-step
- **created_at**: 2026-07-10
- **project**: tau (multi-provider AI coding CLI, v0.92.12)
- **repo**: /Users/vec/workspace/js/PI/tau
- **phase_executor_model**: cc-router-via-yesmem/model-haiku (prep/survey tier)
- **phase_role**: prep (GAN: review pair sdd-verify-code is on sonnet)
- **predecessor**: taskReadme/sdd-design-add-test-script-and-ci-test-step.md
- **artifact_store**: hybrid (taskReadme = filesystem truth, Engram mirror)
- **review_budget**: 1

## Task list

每条任务 1:1 映射到 design §File-level changes 的两个 hunk，以及对应的 spec SCN 验证。

| # | Kind | Target file | Hunk (design ref) | Verify step (spec SCN) |
|---|------|-------------|-------------------|------------------------|
| 1 | apply | `package.json` | `scripts` 块新增 `"test": "bun test"` 一行，位于 `build:native-tools` 与 `preinstall` 之间 | `grep -n '"test"' package.json` 返回包含 `"test": "bun test"` 的行 |
| 2 | apply | `.github/workflows/ci.yml` | 在 `jobs:` 之后、现有 `test:` job 之前插入新 `unit-tests:` job，含 3 个 step（Checkout / Setup Bun / Run bun test） | `grep -nE '^\s*unit-tests:' .github/workflows/ci.yml` 返回非空；`grep -nE 'bun test' .github/workflows/ci.yml` 返回新 job 内的命中 |
| 3 | verify | (read-back) 整个 diff | 读回 `git diff`，与 design 的两个 hunk 逐字节比对 | `git diff --name-only` 输出恰好两行：`package.json`、`.github/workflows/ci.yml` |
| 4 | check | `package.json` | 验证 JSON 仍合法、`scripts` 块未损坏 | `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('ok')"` 输出 `ok` |
| 5 | check | `.github/workflows/ci.yml` | 验证 YAML 仍合法、新 job 是顶层 job key 之一 | `node -e "const y=require('fs').readFileSync('.github/workflows/ci.yml','utf8'); if(!/^unit-tests:/m.test(y)) throw new Error('missing unit-tests key'); console.log('ok')"` 输出 `ok` |
| 6 | check | (baseline) 88 个测试 | 本地 `bun test` 至少一次（baseline 观察；不修复任何 pre-existing 失败） | `bun test` 退出码记入 archive；非 0 退出若是 pre-existing 失败则记为 follow-up |

## 任务-验证交叉表

| 任务 | SCN-1 (REQ-1,2) | SCN-2 (REQ-3) | SCN-3 (REQ-4) | SCN-4 (REQ-3) | SCN-5 (REQ-5) |
|------|----|----|----|----|----|
| 1 | ✓ |   |   |   | ✓ |
| 2 |   | ✓ | ✓ | ✓ | ✓ |
| 3 |   |   |   |   | ✓ |
| 4 | ✓ |   |   |   |   |
| 5 |   | ✓ | ✓ | ✓ |   |
| 6 | ✓ |   |   |   |   |

## 执行顺序

1 → 2 → 3 → 4 → 5 → 6。任务 3 必须在 1、2 完成后执行；4、5 互不依赖可并行；6 在所有 apply 任务完成后执行。

## 阻塞条件

- 任务 1 后 `package.json` JSON 解析失败 → 阻塞；回滚 hunk 后重新 apply。
- 任务 2 后 `ci.yml` YAML 解析失败 → 阻塞；同上。
- 任务 6 发现 `bun test` 因**本变更**（即新引入的 `scripts.test` 或新 job）失败 → 阻塞；非本变更导致的 pre-existing 失败 → 不阻塞，标记为 follow-up。

— end of tasks —
