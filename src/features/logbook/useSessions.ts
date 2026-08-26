import { create } from 'zustand'

import { deleteSession, listSessions, saveSession } from '@/features/logbook/db'
import type { SetResult, WorkoutSession } from '@/features/logbook/db'

interface SessionState {
  sessions: WorkoutSession[]
  loaded: boolean
  load: () => Promise<void>
  remove: (sessionId: string) => Promise<void>
  importSessions: (sessions: WorkoutSession[]) => Promise<number>
}

export const useSessions = create<SessionState>()((set, get) => ({
  sessions: [],
  loaded: false,

  load: async () => {
    set({ sessions: await listSessions(), loaded: true })
  },

  remove: async (sessionId) => {
    await deleteSession(sessionId)
    set({ sessions: get().sessions.filter((session) => session.sessionId !== sessionId) })
  },

  importSessions: async (incoming) => {
    const known = new Set(get().sessions.map((session) => session.sessionId))
    const fresh = incoming.filter((session) => !known.has(session.sessionId))

    for (const session of fresh) await saveSession(session)
    set({ sessions: await listSessions() })

    return fresh.length
  },
}))

export function sessionVolume(session: WorkoutSession): number {
  return session.results.reduce(
    (total, result) => total + (result.reps ?? 0) * (result.weightKg ?? 0),
    0,
  )
}

export function describeResult(result: SetResult): string {
  return [
    result.reps != null ? `${result.reps} Wdh` : null,
    result.durationSec != null ? `${result.durationSec} s` : null,
    result.weightKg ? `${result.weightKg} kg` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** Tagesschlüssel in lokaler Zeit, für Gruppierung und Kalender. */
export function dayKey(iso: string): string {
  const date = new Date(iso)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}
