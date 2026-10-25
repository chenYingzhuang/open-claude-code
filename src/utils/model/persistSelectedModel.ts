import { updateSettingsForSource } from '../settings/settings.js'

/**
 * Remember an explicit model or provider choice in user settings.
 *
 * The in-memory main-loop override stays local to this process. `settings.model`
 * is what the next launch reads. `null` deletes that pin so a provider switch
 * does not keep resolving the previous account's model.
 */
export function persistSelectedModel(model: string | null): void {
  updateSettingsForSource('userSettings', {
    model: model === null ? undefined : model,
  })
}
