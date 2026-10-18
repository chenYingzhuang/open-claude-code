# AGENTS.md

跨工具指针。本仓库（`src/` Git 根）的 AI 协同入口：

**[`docs/ai/README.md`](docs/ai/README.md)** — 项目 AI 协作指南（接活阅读契约与公共必读）。

工程约定按**章节**查阅同目录 [`CLAUDE.md`](CLAUDE.md)（路径隔离、构建、测试、Multi-API 等）。无具体任务时不要全文通读 `CLAUDE.md`；触及路径相关代码前必读其中「路径与隔离不变式」。

角色册：[`docs/ai/roles/`](docs/ai/roles/)；CAO 同步：[`docs/ai/rules/cao-sync.md`](docs/ai/rules/cao-sync.md)。

## 托底红线

1. **`bun run precheck` 必须零错误** 才可声称任务完成（含 `tsc`、`biome check --fix`、全量测试；会改写文件）。
2. **Bun 项目**（`engines.bun >= 1.3.11`）：用 `bunx`，不要默认 `npx`。
3. 提交信息：Conventional Commits（`feat` / `fix` / `docs` / `chore` / `refactor`）。
4. 密钥禁止写入仓库；配置路径经 `config/paths.ts` 派生。

工作流与 PR 约定见 [`CONTRIBUTING.md`](CONTRIBUTING.md)。
