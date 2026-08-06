# 按 Provider 档案配置 HTTP 代理

> 功能分支：`feature/provider-proxy-policy`  
> 核心实现（独立文件，便于与上游合并）：`src/utils/network/providerProxyPolicy.ts`

## 动机

多模型时常见需求：

- OpenAI / ChatGPT 订阅 → 走本地代理（如 `127.0.0.1:8118`）
- DeepSeek / 千问 / 智谱 → **直连**

进程级 `HTTP_PROXY` + 启动脚本无法干净表达「按档案切换」，也不适合打包成 exe 后在其它机器使用。

## 配置

编辑 `~/.occ/provider-profiles.json`（或 `OCC_CONFIG_DIR` 下同名文件），在对应档案增加 `proxy` 字段：

```json
{
  "version": 1,
  "active": "deepseek",
  "profiles": {
    "deepseek": {
      "name": "deepseek",
      "modelType": "openai",
      "proxy": { "mode": "direct" },
      "env": { "OPENAI_BASE_URL": "https://api.deepseek.com", "...": "..." }
    },
    "openai-sub": {
      "name": "openai-sub",
      "modelType": "openai",
      "proxy": {
        "mode": "http",
        "url": "http://127.0.0.1:8118"
      },
      "env": { "OPENAI_AUTH_MODE": "chatgpt", "...": "..." }
    }
  }
}
```

### `proxy.mode`

| 值 | 行为 |
|----|------|
| `direct` | 模型 API **不走** HTTP 代理 |
| `http` | 使用 `proxy.url`（缺省则回退 `OCC_HTTP_PROXY` / `HTTPS_PROXY`） |
| `env` | 兼容旧行为：仅看进程环境变量 |

可选 `proxy.noProxy`：额外旁路域名（逗号分隔），与环境 `NO_PROXY` 合并。

### 环境变量（运维覆盖，可选）

| 变量 | 含义 |
|------|------|
| `OCC_PROVIDER_PROXY_MODE` | 写在 profile.env 里时可被解析为 mode |
| `OCC_HTTP_PROXY` / `OCC_HTTPS_PROXY` | mode=http 时的 URL 回退 |
| `OCC_NO_PROXY` | 额外 NO_PROXY |

`/provider save` **会保留**已有 `proxy` 字段，不会因保存 env 快照而丢失。

## 合并上游时注意

| 文件 | 改动规模 |
|------|----------|
| `src/utils/network/providerProxyPolicy.ts` | **新文件**（主逻辑） |
| `src/utils/network/__tests__/providerProxyPolicy.test.ts` | **新文件** |
| `src/utils/network/proxy.ts` | 小：import + `getProxyUrl`/`getNoProxy` 委托 |
| `src/services/providerProfiles/activate.ts` | 小：activate 后 `sync…` |
| `src/services/providerProfiles/profiles.ts` | 小：类型 + save 时保留 `proxy` |

上游若大改 `proxy.ts`，只需重放「委托两行」；策略本体在独立文件，冲突面小。

## 与打包 exe

策略在进程内读配置目录，不依赖 shell 别名，适合：

- `bun build` / 打包分发
- Windows 虚拟机绿色目录 + `OCC_CONFIG_DIR`
