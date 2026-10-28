import { createStore, del, get, keys, set } from 'idb-keyval'

const store = createStore('fitti', 'sessions')

export interface SetResult {
  exerciseId: string
  exerciseName: string
  setIndex: number
  reps: number | null
  durationSec: number | null
  weightKg: number | null
  at: string
}

export interface WorkoutSession {
  sessionId: string
  planId: string
  planTitle: string
  startedAt: string
  endedAt: string
  durationSec: number
  completed: boolean
  results: SetResult[]
  /** Kennwerte des Plans, mitgespeichert für spätere Health-Exporte. */
  metValue?: number
  avgHeartRateBpm?: number
  note?: string
  exportedToHealth?: boolean
}

export async function saveSession(session: WorkoutSession): Promise<void> {
  await set(session.sessionId, session, store)
}

export async function listSessions(): Promise<WorkoutSession[]> {
  const ids = await keys(store)
  const sessions = await Promise.all(ids.map((id) => get<WorkoutSession>(id as string, store)))

  return sessions
    .filter((session): session is WorkoutSession => session !== undefined)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

export async function deleteSession(sessionId: string): Promise<void> {
  await del(sessionId, store)
}

/** Merkt sich, dass ein Training bereits an Health übergeben wurde. */
export async function markExported(sessionId: string): Promise<void> {
  const session = await get<WorkoutSession>(sessionId, store)
  if (!session) return
  await set(sessionId, { ...session, exportedToHealth: true }, store)
}

export async function clearSessions(): Promise<void> {
  const ids = await keys(store)
  await Promise.all(ids.map((id) => del(id as string, store)))
}

/**
 * Ergebnisse aus dem jüngsten Training je Übung – übungübergreifend über alle
 * Pläne hinweg, damit Empfehlungen alle Sätze derselben Einheit vergleichen.
 */
export async function loadPreviousResults(): Promise<Map<string, SetResult[]>> {
  const sessions = await listSessions()
  const previous = new Map<string, SetResult[]>()

  for (const session of sessions) {
    const resultsByExercise = new Map<string, SetResult[]>()

    for (const result of session.results) {
      const results = resultsByExercise.get(result.exerciseId) ?? []
      results.push(result)
      resultsByExercise.set(result.exerciseId, results)
    }

    for (const [exerciseId, results] of resultsByExercise) {
      if (!previous.has(exerciseId)) previous.set(exerciseId, results)
    }
  }

  return previous
}
