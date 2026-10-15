/**
 * `--model` / QueryEngine must drop ids outside settings.availableModels so
 * the provider default chain runs instead of forwarding an illegal id to the
 * API (regression: deepseek settings + --model glm-5.3 → 400).
 */
import { afterAll, describe, expect, test } from 'bun:test'
import { setupSettingsMock } from '../../../../tests/mocks/settings.js'
import { debugMock } from '../../../../tests/mocks/debug.js'
import { logMock } from '../../../../tests/mocks/log.js'
import { mock } from 'bun:test'

mock.module('src/utils/telemetry/log.ts', logMock)
mock.module('src/utils/telemetry/debug.ts', debugMock)

const settingsMock = setupSettingsMock()

const { isModelAllowed, sanitizeModelAgainstAllowlist } = await import(
  '../modelAllowlist.js'
)

type Settings = {
  availableModels?: string[]
}

function withSettings(settings: Settings): void {
  settingsMock.set({ getSettings_DEPRECATED: () => settings })
}

afterAll(() => {
  settingsMock.reset()
})

describe('sanitizeModelAgainstAllowlist', () => {
  test('passes null (explicit default) through unchanged', () => {
    withSettings({ availableModels: ['deepseek-v4-pro'] })
    expect(sanitizeModelAgainstAllowlist(null)).toBeNull()
  })

  test('passes undefined (nothing requested) through unchanged', () => {
    withSettings({ availableModels: ['deepseek-v4-pro'] })
    expect(sanitizeModelAgainstAllowlist(undefined)).toBeUndefined()
  })

  test('keeps an allowlisted model', () => {
    withSettings({
      availableModels: ['deepseek-v4-pro', 'deepseek-flash'],
    })
    expect(sanitizeModelAgainstAllowlist('deepseek-flash')).toBe(
      'deepseek-flash',
    )
  })

  test('drops a model outside the allowlist', () => {
    withSettings({
      availableModels: ['deepseek-v4-pro', 'deepseek-flash'],
    })
    expect(sanitizeModelAgainstAllowlist('glm-5.3')).toBeUndefined()
    expect(isModelAllowed('glm-5.3')).toBe(false)
  })

  test('keeps any model when availableModels is unset', () => {
    withSettings({})
    expect(sanitizeModelAgainstAllowlist('glm-5.3')).toBe('glm-5.3')
    expect(isModelAllowed('glm-5.3')).toBe(true)
  })

  test('drops every concrete id when the allowlist is empty', () => {
    withSettings({ availableModels: [] })
    expect(sanitizeModelAgainstAllowlist('deepseek-v4-pro')).toBeUndefined()
  })
})
