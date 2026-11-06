import { getUserInformation } from '@/accounts/helpers/user-information-storage'
import { httpsApiInstance } from '@/services/https-api-instance'

import type { UserSettingsRequest, UserSettingsResponse } from '../models/settings-api'

export async function httpGetUserSettings(): Promise<UserSettingsResponse> {
  const { e_mail } = getUserInformation()
  const response = await httpsApiInstance.get<UserSettingsResponse>(`/user-settings/${e_mail}`)
  return response.data
}

export async function httpUpdateUserSettings(
  settings: UserSettingsRequest
): Promise<UserSettingsResponse> {
  const { e_mail } = getUserInformation()
  const response = await httpsApiInstance.put<UserSettingsResponse>(
    `/user-settings/${e_mail}`,
    settings
  )
  return response.data
}
