import { afterEach, describe, expect, test } from 'bun:test'
import {
  _resetProviderProxyPolicyForTests,
  normalizeProviderProxyConfig,
  policyFromProfileSource,
  resolveNoProxyForActiveProvider,
  resolveProxyUrlForActiveProvider,
  setActiveProviderProxyPolicy,
  syncProviderProxyPolicyFromProfile,
} from '../providerProxyPolicy.js'

afterEach(() => {
  _resetProviderProxyPolicyForTests()
})

describe('normalizeProviderProxyConfig', () => {
  test('accepts direct/http/env', () => {
    expect(normalizeProviderProxyConfig({ mode: 'direct' })).toEqual({
      mode: 'direct',
    })
    expect(
      normalizeProviderProxyConfig({
        mode: 'http',
        url: ' http://127.0.0.1:8118 ',
      }),
    ).toEqual({ mode: 'http', url: 'http://127.0.0.1:8118' })
  })

  test('rejects unknown mode', () => {
    expect(
      normalizeProviderProxyConfig({ mode: 'socks' as 'direct' }),
    ).toBeUndefined()
  })
})

describe('policyFromProfileSource', () => {
  test('prefers proxy field over env', () => {
    const p = policyFromProfileSource({
      proxy: { mode: 'direct' },
      env: { OCC_PROVIDER_PROXY_MODE: 'http', OCC_HTTP_PROXY: 'http://x' },
    })
    expect(p).toEqual({ mode: 'direct' })
  })

  test('falls back to profile env keys', () => {
    const p = policyFromProfileSource({
      env: {
        OCC_PROVIDER_PROXY_MODE: 'http',
        OCC_HTTP_PROXY: 'http://127.0.0.1:8118',
      },
    })
    expect(p).toEqual({
      mode: 'http',
      url: 'http://127.0.0.1:8118',
    })
  })
})

describe('resolveProxyUrlForActiveProvider', () => {
  test('direct ignores env proxy', () => {
    setActiveProviderProxyPolicy({ mode: 'direct' })
    expect(
      resolveProxyUrlForActiveProvider({
        HTTP_PROXY: 'http://127.0.0.1:8118',
        HTTPS_PROXY: 'http://127.0.0.1:8118',
      }),
    ).toBeUndefined()
  })

  test('http uses configured url', () => {
    setActiveProviderProxyPolicy({
      mode: 'http',
      url: 'http://127.0.0.1:8118',
    })
    expect(resolveProxyUrlForActiveProvider({})).toBe('http://127.0.0.1:8118')
  })

  test('env uses process-like env', () => {
    setActiveProviderProxyPolicy({ mode: 'env' })
    expect(
      resolveProxyUrlForActiveProvider({
        HTTPS_PROXY: 'http://proxy.example:8080',
      }),
    ).toBe('http://proxy.example:8080')
  })
})

describe('resolveNoProxyForActiveProvider', () => {
  test('merges policy noProxy with env', () => {
    setActiveProviderProxyPolicy({
      mode: 'http',
      url: 'http://127.0.0.1:8118',
      noProxy: 'api.deepseek.com',
    })
    expect(resolveNoProxyForActiveProvider({ NO_PROXY: 'localhost' })).toBe(
      'localhost,api.deepseek.com',
    )
  })

  test('direct yields bypass list', () => {
    setActiveProviderProxyPolicy({ mode: 'direct' })
    expect(resolveNoProxyForActiveProvider({})).toBe('*')
  })
})

describe('syncProviderProxyPolicyFromProfile', () => {
  test('applies profile and resolves', () => {
    syncProviderProxyPolicyFromProfile({
      name: 'deepseek',
      proxy: { mode: 'direct' },
    })
    expect(
      resolveProxyUrlForActiveProvider({ HTTP_PROXY: 'http://x' }),
    ).toBeUndefined()

    syncProviderProxyPolicyFromProfile({
      name: 'openai',
      proxy: { mode: 'http', url: 'http://127.0.0.1:8118' },
    })
    expect(resolveProxyUrlForActiveProvider({})).toBe('http://127.0.0.1:8118')
  })
})
