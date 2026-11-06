import type { Settings } from './settings'

// Keys that are only client-side and should not be synced
type ClientOnlyKeys = 'user' | 'projection'

// Keys that can be synced with the backend
export type SyncableSettingKey = Exclude<keyof Settings, ClientOnlyKeys>

// Partial settings for PUT requests (can send just one field)
export type UserSettingsRequest = Partial<Pick<Settings, SyncableSettingKey>>

// Response from the API (full settings object)
export type UserSettingsResponse = Pick<Settings, SyncableSettingKey>
