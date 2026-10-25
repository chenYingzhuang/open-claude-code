# AGENTS.md

跨工具指针。本仓库（`src/` Git 根）的 AI 协同入口：

**[`docs/ai/README.md`](docs/ai/README.md)** — 项目 AI 协作指南。新会话先按其顶部「接活阅读入口」读公共必读。无具体任务不要全文通读 [`CLAUDE.md`](CLAUDE.md)。

外层工作区（父目录，非 Git）另有薄索引 `../AGENTS.md`，指向同一份指南。

角色册：[`docs/ai/roles/`](docs/ai/roles/)。

## 托底红线

1. **`bun run precheck` 必须零错误** 才可声称任务完成（含 `tsc`、`biome check --fix`、全量测试；会改写文件）。
2. **Bun 项目**（`engines.bun >= 1.3.11`）：用 `bunx`，不要默认 `npx`。
3. 提交信息：Conventional Commits（`feat` / `fix` / `docs` / `chore` / `refactor`）。
4. 密钥禁止写入仓库；配置路径经 `config/paths.ts` 派生，禁止硬编码 `~/.claude` / `~/.occ`。
5. 默认 `OCC_PROXY_MODE=none`；不要让 occ 登录 Claude 订阅 OAuth。
6. 改档案、默认模型、端点或启动器时，先读 `docs/ai/README.md` §5 与 `CLAUDE.md` 的 Multi-API。密钥仍只放 `~/.occ/`。

工作流与 PR 约定见 [`CONTRIBUTING.md`](CONTRIBUTING.md)。
