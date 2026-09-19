import type { WorkoutSession } from '@/features/logbook/db'

export interface PlanHistory {
  /** Abgeschlossene Trainings dieses Plans. */
  count: number
  lastAt: string | null
  /** Schnitt der letzten drei Trainings in Sekunden, sonst null. */
  averageDurationSec: number | null
}

const EMPTY: PlanHistory = { count: 0, lastAt: null, averageDurationSec: null }

/**
 * Historie je Plan. Abgebrochene Trainings zählen nicht mit, sonst würde ein
 * versehentlich gestartetes Training als absolviert erscheinen.
 */
export function historyByPlan(sessions: WorkoutSession[]): Map<string, PlanHistory> {
  const byPlan = new Map<string, WorkoutSession[]>()

  for (const session of sessions) {
    if (!session.completed) continue
    const list = byPlan.get(session.planId)
    if (list) list.push(session)
    else byPlan.set(session.planId, [session])
  }

  const result = new Map<string, PlanHistory>()

  for (const [planId, list] of byPlan) {
    const sorted = [...list].sort((a, b) => b.endedAt.localeCompare(a.endedAt))
    const recent = sorted.slice(0, 3)
    const total = recent.reduce((sum, session) => sum + session.durationSec, 0)
    const average = recent.length > 0 ? Math.round(total / recent.length) : 0

    result.set(planId, {
      count: sorted.length,
      lastAt: sorted[0]?.endedAt ?? null,
      // Unter einer Minute war es kein Training, sondern ein Fehlstart.
      averageDurationSec: average >= 60 ? average : null,
    })
  }

  return result
}

export function planHistory(
  sessions: WorkoutSession[],
  planId: string | undefined,
): PlanHistory {
  if (!planId) return EMPTY
  return historyByPlan(sessions).get(planId) ?? EMPTY
}

/** „heute“, „gestern“, „vor 3 Tagen“ … – kürzer als ein Datum und aussagekräftiger. */
export function describeSince(iso: string): string {
  const then = new Date(iso)
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000)

  if (days <= 0) return 'heute'
  if (days === 1) return 'gestern'
  if (days < 7) return `vor ${days} Tagen`
  if (days < 14) return 'vor einer Woche'
  if (days < 31) return `vor ${Math.floor(days / 7)} Wochen`
  if (days < 62) return 'vor einem Monat'
  return `vor ${Math.floor(days / 30)} Monaten`
}

export function describeCount(count: number): string {
  if (count === 0) return 'noch nie'
  if (count === 1) return '1 ×'
  return `${count} ×`
}
