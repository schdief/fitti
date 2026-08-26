import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type LogLevel = 'info' | 'ok' | 'warn' | 'error'

export interface LogEntry {
  id: string
  at: number
  level: LogLevel
  message: string
}

interface LabLogState {
  entries: LogEntry[]
  add: (level: LogLevel, message: string) => void
  clear: () => void
}

const MAX_ENTRIES = 200

/**
 * Persistiert, damit das Protokoll einen Absprung nach Spotify oder Kurzbefehle
 * und die Rückkehr in die App übersteht.
 */
export const useLabLog = create<LabLogState>()(
  persist(
    (set) => ({
      entries: [],
      add: (level, message) =>
        set((state) => ({
          entries: [
            { id: crypto.randomUUID(), at: Date.now(), level, message },
            ...state.entries,
          ].slice(0, MAX_ENTRIES),
        })),
      clear: () => set({ entries: [] }),
    }),
    {
      name: 'fitti.lab.log',
      partialize: ({ entries }) => ({ entries }),
    },
  ),
)

export function labLog(level: LogLevel, message: string): void {
  useLabLog.getState().add(level, message)
}
