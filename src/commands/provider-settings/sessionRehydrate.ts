import type { AppState } from 'src/state/AppStateStore.js'
import { getInitialEffortSetting } from 'src/utils/model/effort.js'
import { persistSelectedModel } from 'src/utils/model/persistSelectedModel.js'
import { getInitialSettings } from 'src/utils/settings/settings.js'

/** The AppState capability a provider switch may have in interactive sessions. */
export type ProviderSessionRehydrateContext = {
  setAppState?: ((update: (prev: AppState) => AppState) => void) | undefined
}

/** Re-seed session state after a successful provider/profile/family switch. */
export function rehydrateProviderSession(
  context: ProviderSessionRehydrateContext | undefined,
): void {
  // The previous pin was for the provider we just left. Clear it even when
  // there is no AppState, so the next launch follows the new profile default
  // instead of resolving the old id on the new account.
  persistSelectedModel(null)

  // Some headless command callers intentionally have no AppState store.
  if (typeof context?.setAppState !== 'function') return

  context.setAppState(prev => ({
    ...prev,
    settings: getInitialSettings(),
    // Provider-scoped session overrides belong together: none may outlive the
    // provider/profile whose model ids and tier defaults they describe.
    mainLoopModel: null,
    mainLoopModelForSession: null,
    effortValue: getInitialEffortSetting(),
    sessionModelSettingsOverrides: {},
  }))
}
