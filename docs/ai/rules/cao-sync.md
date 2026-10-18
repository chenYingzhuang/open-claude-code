# occ ↔ CAO 姊妹仓同步规则

> AI 协作规则分册。改档案、端点、启动器或本指南中与 CAO 相关的约定时必读。  
> CAO 仓绝对路径：`/Users/chenyingzhuang/work/projects/tools/cao`（`~/work/projects/tools/cao`）。

## 何时同步

同一轮改动触及下列任一项时，**必须**更新 cao 对应文档（禁止只改 occ 侧）：

| occ / 本工作区改动 | cao 落点 |
|---|---|
| 档案 / 模型 / 端点 / 插件 / Skill / MCP 说明 | `docs/occ-for-cao.md`、`docs/providers-and-models.md` |
| `~/.local/bin/occ` / `occ-agent` 行为 | `docs/runtime.md`、`docs/occ-for-cao.md` |
| 默认模型或 `-p` 列表 | `README.md`、`docs/occ-for-cao.md` |
| `cao/agents/*.md`（在 cao 仓） | 跑 `./scripts/sync-profiles.sh` |

## 入口

- CAO 编排：`cao/docs/occ-for-cao.md`；本机入口 `cao-team`。
- 国内模型 worker：`assign occ`（可带 `model=`）；一次性脚本才用 `occ-agent`。
- CAO 源码 fork：`cao/src` 分支 `local/occ-provider`。
- 修复前不要派 CAO `explorer`（目录信任门禁）；探索用 `occ` 或 `developer`。

## 红线

- 密钥只在 `~/.occ/`，禁止写入 occ 或 cao 任一仓库。
- occ 默认 `OCC_PROXY_MODE=none`；不要让 occ 登录 Claude 订阅 OAuth。
- 本分册不替代 [`../README.md`](../README.md)；工程路径隔离仍以 `CLAUDE.md` 为准。

## 与 Cursor 规则

工作区 `.cursor/rules/cao-sibling.mdc` 为短提醒，细节以本分册为准；改同步表时两边一起改指针，避免双源正文。
