/**
 * Provider-scoped HTTP proxy policy (feature: provider-proxy-policy).
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Upstream occ only reads process-level HTTP(S)_PROXY / NO_PROXY. Multi-provider
 * users often need "OpenAI via local proxy, DeepSeek direct". Encoding that in
 * a shell launcher is not portable for packaged binaries / other machines.
 *
 * This module is intentionally isolated so upstream merges only collide on
 * small call-site hooks (proxy.ts + activate.ts), not on a large patch inside
 * the shared proxy implementation.
 *
 * Config (in ~/.occ/provider-profiles.json on each profile):
 *
 *   "proxy": {
 *     "mode": "direct" | "http" | "env",
 *     "url": "http://127.0.0.1:8118",   // required for mode=http (else env fallback)
 *     "noProxy": "api.deepseek.com,.aliyuncs.com"  // optional extra bypass list
 *   }
 *
 * Modes:
 *   direct — never use HTTP proxy for model API traffic
 *   http   — always use `url` (or OCC_HTTP_PROXY / HTTPS_PROXY fallback)
 *   env    — legacy: pure process.env (default when unset)
 *
 * Env overrides (optional, for ops without editing JSON):
 *   OCC_PROVIDER_PROXY_MODE=direct|http|env
 *   OCC_HTTP_PROXY / OCC_HTTPS_PROXY
 *   OCC_NO_PROXY
 */

import { readFileSync } from 'fs'
import { occConfigPath } from 'src/config/paths.js'
import { logForDebugging } from '../telemetry/debug.js'

export type ProviderProxyMode = 'direct' | 'http' | 'env'

export type ProviderProxyConfig = {
  mode: ProviderProxyMode
  /** HTTP proxy URL when mode is `http`. */
  url?: string
  /** Extra NO_PROXY entries (comma-separated), merged with process env. */
  noProxy?: string
}

/** Shape we read from a provider profile without importing profiles.ts (merge-safe). */
export type ProfileProxySource = {
  name?: string
  proxy?: ProviderProxyConfig | null
  env?: Record<string, string | undefined>
}

type EnvLike = Record<string, string | undefined>

const DEFAULT_POLICY: ProviderProxyConfig = { mode: 'env' }

let activePolicy: ProviderProxyConfig = { ...DEFAULT_POLICY }
let bootstrappedFromDisk = false
/** Once set via API/profile sync, skip overwriting from disk bootstrap. */
let explicitlySet = false

/** Listeners (e.g. clearProxyCache) run after policy changes. */
const changeListeners = new Set<() => void>()

export function onProviderProxyPolicyChange(listener: () => void): () => void {
  changeListeners.add(listener)
  return () => changeListeners.delete(listener)
}

function notifyChange(): void {
  for (const listener of changeListeners) {
    try {
      listener()
    } catch {
      // Never let cache-clear side effects break requests.
    }
  }
}

function normalizeMode(raw: unknown): ProviderProxyMode | undefined {
  if (raw === 'direct' || raw === 'http' || raw === 'env') return raw
  return undefined
}

export function normalizeProviderProxyConfig(
  input: ProviderProxyConfig | null | undefined,
): ProviderProxyConfig | undefined {
  if (!input || typeof input !== 'object') return undefined
  const mode = normalizeMode(input.mode)
  if (!mode) return undefined
  const out: ProviderProxyConfig = { mode }
  if (typeof input.url === 'string' && input.url.trim()) {
    out.url = input.url.trim()
  }
  if (typeof input.noProxy === 'string' && input.noProxy.trim()) {
    out.noProxy = input.noProxy.trim()
  }
  return out
}

/**
 * Resolve policy from a profile: explicit `proxy` field wins; else optional
 * env keys on the profile (OCC_PROVIDER_PROXY_MODE / OCC_HTTP_PROXY).
 */
export function policyFromProfileSource(
  profile: ProfileProxySource | null | undefined,
): ProviderProxyConfig | undefined {
  if (!profile) return undefined
  const fromField = normalizeProviderProxyConfig(profile.proxy ?? undefined)
  if (fromField) return fromField

  const env = profile.env ?? {}
  const mode =
    normalizeMode(env.OCC_PROVIDER_PROXY_MODE) ??
    normalizeMode(env.OCC_PROXY_MODE)
  if (!mode) return undefined
  const url =
    (
      env.OCC_HTTP_PROXY ||
      env.OCC_HTTPS_PROXY ||
      env.HTTPS_PROXY ||
      ''
    ).trim() || undefined
  const noProxy = (env.OCC_NO_PROXY || '').trim() || undefined
  return normalizeProviderProxyConfig({ mode, url, noProxy })
}

export function setActiveProviderProxyPolicy(
  config: ProviderProxyConfig | null | undefined,
): void {
  explicitlySet = true
  const next = normalizeProviderProxyConfig(config) ?? { ...DEFAULT_POLICY }
  const prev = activePolicy
  activePolicy = next
  if (
    prev.mode !== next.mode ||
    prev.url !== next.url ||
    prev.noProxy !== next.noProxy
  ) {
    logForDebugging(
      `[providerProxyPolicy] active mode=${next.mode}` +
        (next.url ? ` url=${next.url}` : '') +
        (next.noProxy ? ` noProxy=${next.noProxy}` : ''),
    )
    notifyChange()
  }
}

export function getActiveProviderProxyPolicy(): ProviderProxyConfig {
  ensureBootstrappedFromDisk()
  return activePolicy
}

export function syncProviderProxyPolicyFromProfile(
  profile: ProfileProxySource | null | undefined,
): void {
  const policy = policyFromProfileSource(profile)
  setActiveProviderProxyPolicy(policy ?? { mode: 'env' })
}

/**
 * Lazy bootstrap: when the process starts with an already-active profile on
 * disk, apply its proxy policy before the first model request.
 */
export function ensureBootstrappedFromDisk(): void {
  if (bootstrappedFromDisk || explicitlySet) return
  bootstrappedFromDisk = true
  try {
    const path = occConfigPath('provider-profiles.json')
    const raw = readFileSync(path, 'utf8')
    const parsed = JSON.parse(raw) as {
      active?: string
      profiles?: Record<string, ProfileProxySource>
    }
    const activeName = parsed.active
    if (!activeName || !parsed.profiles?.[activeName]) return
    const policy = policyFromProfileSource(parsed.profiles[activeName])
    if (policy) {
      // Disk bootstrap only — do not flip explicitlySet (tests / later set win).
      activePolicy = policy
      logForDebugging(
        `[providerProxyPolicy] bootstrapped from profile "${activeName}" mode=${policy.mode}`,
      )
    }
  } catch {
    // Missing file / invalid JSON → keep default env mode.
  }
}

/** @internal test helper */
export function _resetProviderProxyPolicyForTests(): void {
  activePolicy = { ...DEFAULT_POLICY }
  bootstrappedFromDisk = false
  explicitlySet = false
  changeListeners.clear()
}

function envProxyUrl(env: EnvLike): string | undefined {
  // Match proxy.ts upstream order, including CLAUDE_CODE_* last-resort vars.
  return (
    env.https_proxy ||
    env.HTTPS_PROXY ||
    env.http_proxy ||
    env.HTTP_PROXY ||
    env.CLAUDE_CODE_HTTPS_PROXY ||
    env.CLAUDE_CODE_HTTP_PROXY
  )
}

function envNoProxy(env: EnvLike): string | undefined {
  return env.no_proxy || env.NO_PROXY
}

/**
 * Proxy URL for the active provider policy.
 * - direct → undefined (no proxy)
 * - http   → config.url or OCC_* / standard env
 * - env    → standard process env only
 */
export function resolveProxyUrlForActiveProvider(
  env: EnvLike = process.env,
): string | undefined {
  ensureBootstrappedFromDisk()
  const policy = activePolicy

  if (policy.mode === 'direct') {
    return undefined
  }

  if (policy.mode === 'http') {
    return (
      policy.url ||
      env.OCC_HTTP_PROXY ||
      env.OCC_HTTPS_PROXY ||
      envProxyUrl(env)
    )
  }

  // mode === 'env'
  return envProxyUrl(env)
}

/**
 * NO_PROXY list for the active provider (merged with process env).
 */
export function resolveNoProxyForActiveProvider(
  env: EnvLike = process.env,
): string | undefined {
  ensureBootstrappedFromDisk()
  const policy = activePolicy
  const fromEnv = env.OCC_NO_PROXY || envNoProxy(env)
  const fromPolicy = policy.noProxy

  if (policy.mode === 'direct') {
    // Force bypass of any accidental global proxy for model traffic.
    // Callers that only consult resolveProxyUrl get undefined already;
    // this helps axios paths that still see a process-level proxy.
    return fromPolicy || fromEnv || '*'
  }

  if (!fromPolicy && !fromEnv) return undefined
  if (fromPolicy && fromEnv) return `${fromEnv},${fromPolicy}`
  return fromPolicy || fromEnv
}
