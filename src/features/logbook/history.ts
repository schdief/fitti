import type { WorkoutSession } from '@/features/logbook/db'

export interface PlanHistory {
  /** Vollständige Trainings und gespeicherte Teiltrainings mit erfassten Sätzen. */
  count: number
  completedCount: number
  lastAt: string | null
  /** Schnitt der letzten drei Trainings in Sekunden, sonst null. */
  averageDurationSec: number | null
}

const EMPTY: PlanHistory = { count: 0, completedCount: 0, lastAt: null, averageDurationSec: null }

/**
 * Gespeicherte Teiltrainings gehören zum Verlauf, sind aber keine vollständigen
 * Durchläufe. Leere Fehlstarts zählen nicht; nur vollständige Trainings bilden
 * die Grundlage für die geschätzte Dauer.
 */
export function historyByPlan(sessions: WorkoutSession[]): Map<string, PlanHistory> {
  const byPlan = new Map<string, WorkoutSession[]>()

  for (const session of sessions) {
    if (!session.completed && session.results.length === 0) continue
    const list = byPlan.get(session.planId)
    if (list) list.push(session)
    else byPlan.set(session.planId, [session])
  }

  const result = new Map<string, PlanHistory>()

  for (const [planId, list] of byPlan) {
    const sorted = [...list].sort((a, b) => b.endedAt.localeCompare(a.endedAt))
    const completed = sorted.filter((session) => session.completed)
    const recent = completed.slice(0, 3)
    const total = recent.reduce((sum, session) => sum + session.durationSec, 0)
    const average = recent.length > 0 ? Math.round(total / recent.length) : 0

    result.set(planId, {
      count: sorted.length,
      completedCount: completed.length,
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
  const now = new Date()
  // Lokale Kalendertage statt verstrichener 24 Stunden: gestern Abend bleibt
  // auch heute Morgen „gestern“, einschließlich Sommerzeitwechseln.
  const day = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const days = Math.round((day(now) - day(then)) / 86_400_000)

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
