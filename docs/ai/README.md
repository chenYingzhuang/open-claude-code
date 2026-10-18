# occ / open-claude-code — 项目 AI 协作指南

> 本文件是本项目 AI 协同的**单一真相源（SSOT）**。  
> 工程细节以仓库根（本文件所在仓为 `src/`）的 `CLAUDE.md` 各章节为准；CAO 编排以 `~/work/projects/tools/cao/docs/` 为准。  
> 档位：**L2 轻量**（多 CLI / CAO；启用薄角色册，无完整 L3 任务文体系）。

工作区根（`tools/occ/`）通过 `docs/ai` → `src/docs/ai` 访问本指南；在 Git 根 `src/` 内路径为 `docs/ai/README.md`。

---

## 接活阅读入口

### 公共必读（无具体任务的「了解项目」到此为止）

1. 本段「接活阅读入口」
2. **§1–§5**（定位、双根、红线、环境、验收）
3. 材料索引位置：`CLAUDE.md`（工程）、工作区 `docs/*.md`（分析）、`cao/docs/`（编排）、本目录 `roles/` / `rules/`

**不要**为了解项目而：全文通读 `CLAUDE.md`、分析长文、`logs/`、任务历史或全部档案细则。

### 有具体任务时

| 条件 | 再读 |
|---|---|
| 已确定任务 | 任务说明 / 开放项 / 本阶段验收；直接依赖的代码或文档章节 |
| 主控 / 实现 / 评审 | 对应 [`roles/pm.md`](roles/pm.md) / [`roles/executor.md`](roles/executor.md) / [`roles/reviewer.md`](roles/reviewer.md) |
| 改路径、配置目录、隔离 | `CLAUDE.md` →「路径与隔离不变式」 |
| 构建 / Bun / 发布 | `CLAUDE.md` → Commands、发布；`CONTRIBUTING.md` |
| Provider / 模型 / 代理 | `CLAUDE.md` → Multi-API；§6；`cao/docs/providers-and-models.md` |
| Remote Control / RCS | `CLAUDE.md` → 子系统边界·Remote Control；工作区 `docs/claude-official-2.1.296-analysis.md` §10.11（按需） |
| 测试 / mock | `CLAUDE.md` → Testing；`dev-standards` skill（改 prompt/工具时） |
| 与 CAO 联调 / 改档案或启动器 | [`rules/cao-sync.md`](rules/cao-sync.md)；`cao/docs/occ-for-cao.md`、`runtime.md` |
| 临时角色 | 派单写明职责/禁区/交付/中断；不继承其他角色整册 |

阅读清单是起始指引，**不是**白名单：可自行查证清单外文件；**无阅读审批或拦截**。读到≠获准修改。

---

## §1 项目定位

**open-claude-code（CLI：`occ`）**：Anthropic Claude Code 的开源/还原实现，支持多模型 provider、与官方 Claude Code 用户态隔离。本工作区含本机 runtime 替换，并可与 **CAO**（多终端编排）联用。

一句话：改的是「多模型编码 CLI + 本机运行时」，不是 ai-work 规范中心，也不是业务产品仓。

---

## §2 双根目录

| 路径 | 角色 |
|---|---|
| `tools/occ/`（工作区根） | `AGENTS.md` 统一索引、`docs/`（含指向本指南的 `docs/ai`）、`runtime/` |
| `tools/occ/src/` | **Git 真源**：代码、`CLAUDE.md`、本指南 `docs/ai/`、测试 |
| `tools/cao/` | 姊妹仓：编排文档与 profile |

---

## §3 授权与红线

- **密钥**：只在 `~/.occ/`（如 `provider-profiles.json`）；**禁止**写入任一仓库。
- **代理**：默认 `OCC_PROXY_MODE=none`；不要让 occ 登录 Claude 订阅 OAuth。
- **路径隔离**：配置路径必须经 `src/config/paths.ts`（在本仓即 `config/paths.ts`）派生；禁止硬编码 `~/.claude` / `~/.occ` 字面量。
- **验收**：编码任务完成前 `bun run precheck` 须零错误（含会改写文件的 `biome check --fix`）。
- **ai-work**：不修改 `ai-work-spec` 共享件；跨 CLI 协同走 peer/dispatch，不另造第二套。
- **CAO explorer**：目录信任门禁阻断时改用 `occ` / `developer` profile。
- **姊妹仓**：见 [`rules/cao-sync.md`](rules/cao-sync.md)。

---

## §4 环境入口

| 项 | 位置 / 命令 |
|---|---|
| 全局 CLI | `occ`、`occ-agent`、`occ-mcp`；CAO：`cao-team` |
| Provider 档案 | `deepseek` / `qwen` / `zhipu` / `kimi` → `cao/docs/providers-and-models.md` |
| Runtime | 工作区 `runtime/VERSION.txt`；farm：`~/.occ/runtime/` |
| 调试 | `OCC_RUNTIME=node\|bun\|auto`；Remote Control 建议 Node |
| 工作目录 | CAO / `occ-agent -C` 须业务仓**绝对路径** |

---

## §5 验收入口

- 代码：`bun run precheck`（在 `src/` 下）。
- 单测：`bun test <path>`。
- Remote Control：`occ remote-control`；证据见分析文档 §10.11。
- 仅改 AI 入口文档：静态核对本入口即可；改代码时仍跑 precheck。

---

## §6 档案与网络（摘要）

完整表以 **`cao/docs/providers-and-models.md`**、**`cao/docs/occ-for-cao.md`** 为准。

- 默认便宜编码：`deepseek`；智谱走 Coding Plan 地址；少用中转。
- `occ-agent --activate <名>` 会写 settings；**CAO worker 勿用这条切模型**。
- `OCC_PROXY_MODE=none|selective|all`。

---

## §7 角色路由

| 职责框架名 | 本项目称呼 | 手册 |
|---|---|---|
| pm | 主控 | [`roles/pm.md`](roles/pm.md) |
| executor | 实现 / CAO occ worker | [`roles/executor.md`](roles/executor.md) |
| reviewer | 评审 | [`roles/reviewer.md`](roles/reviewer.md) |

临时角色只写在任务或派单中，不建册。方法论权威：ai-work `规范/10`；手册不重复论证。

---

## §8 派工阅读清单模板

```text
角色：pm | executor | reviewer | 临时:<名>
阶段：<一步>
公共必读：docs/ai/README.md §接活阅读入口 + §1–§5
角色必读：docs/ai/roles/<role>.md 或派单内临时说明
任务依据：<任务说明 / issue / PR>
直接依赖：<文件或 CLAUDE.md 章节>
条件补读：<触发 → 路径>（如 CAO → docs/ai/rules/cao-sync.md）
可修改范围：<目录/文件>
验收：<命令或标准>
说明：清单外可自行查证；无阅读审批。
```

无专用派工装配脚本；用全局 `dispatch.sh` 时把上表写入派单。不要把 `CLAUDE.md` 全文或分析长文嵌进提示。

---

## §9 迁移与版本记录

### 2026-10-18（二次：统一 docs/ai）

| 旧路径 / 要求 | 新落点 |
|---|---|
| `docs/AI任务指南.md` | **`docs/ai/README.md`**（本文件）；旧入口已删除，不保留转指 |
| 根 `AGENTS.md` | 仍薄索引，改指 `docs/ai/README.md` |
| §7 表内角色（无分册） | **`docs/ai/roles/{pm,executor,reviewer}.md`** |
| CAO 姊妹仓同步（散落 AGENTS/cursor） | **`docs/ai/rules/cao-sync.md`** |
| 2026-10-18 首次分层阅读 | 沿用：公共/条件阅读、无全文强制 `CLAUDE.md` |

- **生效**：新会话与后续派单用本入口；运行中工人本棒沿原派单，续接时补本阶段变化。
- **旧入口**：`docs/AI任务指南.md` 已删除。
- **回退**：还原 `src/docs/ai/`、根 `AGENTS.md`、兼容指针（git / 备份）。
- **工具限制**：Claude Code 在 `src/` 下仍可能自动注入整份 `CLAUDE.md`；进一步减负需另开分册任务。
