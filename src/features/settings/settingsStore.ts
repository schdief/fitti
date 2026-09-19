import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { ConnectionState, Level, WeightUnit } from '@/lib/types'

export const SETTINGS_SCHEMA_VERSION = 3
export const ONBOARDING_VERSION = 1

export type AiProvider = 'gemini' | 'openai'

export interface AiSettings {
  provider: AiProvider
  /**
   * Liegt im Browserspeicher. Das ist fuer einen persoenlichen Schluessel
   * vertretbar, aber kein Geheimnisspeicher – der Nutzer wird darauf
   * hingewiesen und sollte ein Ausgabenlimit setzen.
   */
  apiKey: string
  model: string
  lastCheckedAt: string | null
  message: string | null
}

export const AI_DEFAULT_MODEL: Record<AiProvider, string> = {
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4o-mini',
}

export interface ConnectionStatus {
  state: ConnectionState
  lastCheckedAt: string | null
  message: string | null
}

export interface SettingsData {
  profile: {
    bodyWeightKg: number | null
    unit: WeightUnit
    defaultLevel: Level | 'any'
  }
  training: {
    voiceCues: boolean
    voiceVolume: number
    countdownFromSec: number
    keepScreenAwake: boolean
    restAdjustPercent: number
    weightStepKg: number
  }
  connections: {
    spotify: ConnectionStatus
    health: ConnectionStatus & {
      shortcutName: string
      autoExport: 'off' | 'ask' | 'on'
    }
    ai: AiSettings
  }
  onboarding: {
    completedVersion: number
  }
}

const initialData: SettingsData = {
  profile: {
    bodyWeightKg: null,
    unit: 'kg',
    defaultLevel: 'any',
  },
  training: {
    voiceCues: true,
    voiceVolume: 0.8,
    countdownFromSec: 10,
    keepScreenAwake: true,
    restAdjustPercent: 0,
    weightStepKg: 2.5,
  },
  connections: {
    spotify: { state: 'unconfigured', lastCheckedAt: null, message: null },
    health: {
      state: 'unconfigured',
      lastCheckedAt: null,
      message: null,
      shortcutName: 'Fitti Log',
      autoExport: 'ask',
    },
    ai: {
      provider: 'gemini',
      apiKey: '',
      model: AI_DEFAULT_MODEL.gemini,
      lastCheckedAt: null,
      message: null,
    },
  },
  onboarding: {
    completedVersion: 0,
  },
}

interface SettingsActions {
  setProfile: (patch: Partial<SettingsData['profile']>) => void
  setTraining: (patch: Partial<SettingsData['training']>) => void
  setSpotify: (patch: Partial<SettingsData['connections']['spotify']>) => void
  setHealth: (patch: Partial<SettingsData['connections']['health']>) => void
  setAi: (patch: Partial<AiSettings>) => void
  completeOnboarding: () => void
  resetOnboarding: () => void
}

export const useSettings = create<SettingsData & SettingsActions>()(
  persist(
    (set) => ({
      ...initialData,
      setProfile: (patch) => set((state) => ({ profile: { ...state.profile, ...patch } })),
      setTraining: (patch) => set((state) => ({ training: { ...state.training, ...patch } })),
      setSpotify: (patch) =>
        set((state) => ({
          connections: {
            ...state.connections,
            spotify: { ...state.connections.spotify, ...patch },
          },
        })),
      setHealth: (patch) =>
        set((state) => ({
          connections: {
            ...state.connections,
            health: { ...state.connections.health, ...patch },
          },
        })),
      setAi: (patch) =>
        set((state) => ({
          connections: {
            ...state.connections,
            ai: { ...state.connections.ai, ...patch },
          },
        })),
      completeOnboarding: () => set({ onboarding: { completedVersion: ONBOARDING_VERSION } }),
      resetOnboarding: () => set({ onboarding: { completedVersion: 0 } }),
    }),
    {
      name: 'fitti.settings',
      version: SETTINGS_SCHEMA_VERSION,
      partialize: ({ profile, training, connections, onboarding }) => ({
        profile,
        training,
        connections,
        onboarding,
      }),
      // Ältere Stände auf das aktuelle Schema heben. Fehlende Felder erben aus initialData.
      migrate: (persisted) => {
        const previous = (persisted ?? {}) as Partial<SettingsData>
        return {
          ...initialData,
          ...previous,
          profile: { ...initialData.profile, ...previous.profile },
          training: { ...initialData.training, ...previous.training },
          connections: {
            spotify: { ...initialData.connections.spotify, ...previous.connections?.spotify },
            health: { ...initialData.connections.health, ...previous.connections?.health },
            ai: { ...initialData.connections.ai, ...previous.connections?.ai },
          },
          onboarding: { ...initialData.onboarding, ...previous.onboarding },
        }
      },
    },
  ),
)
