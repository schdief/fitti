import type { WorkoutSession } from '../logbook/db.ts'

const DAY_MS = 86_400_000
export const CHART_WEEKS = 12

/** Local calendar day encoded as an integer; DST does not change day gaps. */
function calendarDay(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS
}

function monday(day: number): number {
  const weekday = new Date(day * DAY_MS).getUTCDay()
  return day - (weekday + 6) % 7
}

export interface TrainingWeek {
  startDay: number
  count: number
  durationSec: number
}

export interface TrainingStatistics {
  count: number
  partialCount: number
  totalHours: number
  averagePerWeek: number
  longestStreak: number
  firstTrainingAt: string | null
  weeks: TrainingWeek[]
}

export function calculateStatistics(sessions: WorkoutSession[], now = new Date()): TrainingStatistics {
  const today = calendarDay(now)
  const firstWeek = monday(today) - (CHART_WEEKS - 1) * 7
  const weeks = Array.from({ length: CHART_WEEKS }, (_, i) => ({
    startDay: firstWeek + i * 7, count: 0, durationSec: 0,
  }))
  // Same counting rule as catalogue history. Empty aborted starts are not training.
  const recorded = sessions
    .filter((session) => (session.completed || session.results.length > 0)
      && Number.isFinite(Date.parse(session.startedAt))
      && Date.parse(session.startedAt) <= now.getTime())
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt))

  let durationSec = 0
  let streak = 0
  let longestStreak = 0
  let previousDay: number | null = null

  for (const session of recorded) {
    const day = calendarDay(new Date(session.startedAt))
    const duration = Number.isFinite(session.durationSec) ? Math.max(0, session.durationSec) : 0
    durationSec += duration
    // Four complete rest days are allowed: Mon -> Sat belongs to one streak.
    streak = previousDay !== null && day - previousDay <= 5 ? streak + 1 : 1
    longestStreak = Math.max(longestStreak, streak)
    previousDay = day

    const index = (monday(day) - firstWeek) / 7
    if (index >= 0 && index < weeks.length) {
      weeks[index].count += 1
      weeks[index].durationSec += duration
    }
  }

  const first = recorded[0]
  const elapsedDays = first ? today - calendarDay(new Date(first.startedAt)) + 1 : 0
  return {
    count: recorded.length,
    partialCount: recorded.filter((session) => !session.completed).length,
    totalHours: durationSec / 3600,
    // Include inactive weeks; avoid extrapolating a single training day to 7/week.
    averagePerWeek: recorded.length / Math.max(1, elapsedDays / 7),
    longestStreak,
    firstTrainingAt: first?.startedAt ?? null,
    weeks,
  }
}

/** Week labels display the local calendar day encoded by startDay, without a second TZ shift. */
export function weekLabel(startDay: number): string {
  return new Date(startDay * DAY_MS).toLocaleDateString('de-DE', {
    day: 'numeric', month: 'numeric', timeZone: 'UTC',
  })
}