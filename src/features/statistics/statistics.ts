import type { WorkoutSession } from '../logbook/db.ts'
import { sessionVolume } from '../logbook/sessionVolume.ts'

const DAY_MS = 86_400_000
export const CHART_WEEKS = 12

export type VolumePeriod = 'day' | 'week' | 'month' | 'year'

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
  longestStreakIsCurrent: boolean
  firstTrainingAt: string | null
  weeks: TrainingWeek[]
}

export interface VolumeBucket {
  startDay: number
  volumeKg: number
}

function recordedSessions(sessions: WorkoutSession[], now: Date): WorkoutSession[] {
  return sessions
    .filter((session) => (session.completed || session.results.length > 0)
      && Number.isFinite(Date.parse(session.startedAt))
      && Date.parse(session.startedAt) <= now.getTime())
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt))
}

export function calculateStatistics(sessions: WorkoutSession[], now = new Date()): TrainingStatistics {
  const today = calendarDay(now)
  const firstWeek = monday(today) - (CHART_WEEKS - 1) * 7
  const weeks = Array.from({ length: CHART_WEEKS }, (_, i) => ({
    startDay: firstWeek + i * 7, count: 0, durationSec: 0,
  }))
  // Same counting rule as catalogue history. Empty aborted starts are not training.
  const recorded = recordedSessions(sessions, now)

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
  const longestStreakIsCurrent =
    streak > 0 && streak === longestStreak && previousDay !== null && today - previousDay <= 5
  return {
    count: recorded.length,
    partialCount: recorded.filter((session) => !session.completed).length,
    totalHours: durationSec / 3600,
    // Include inactive weeks; avoid extrapolating a single training day to 7/week.
    averagePerWeek: recorded.length / Math.max(1, elapsedDays / 7),
    longestStreak,
    longestStreakIsCurrent,
    firstTrainingAt: first?.startedAt ?? null,
    weeks,
  }
}

function monthIndex(date: Date): number {
  return date.getFullYear() * 12 + date.getMonth()
}

function monthStartDay(index: number): number {
  const year = Math.floor(index / 12)
  const month = index - year * 12
  return Date.UTC(year, month, 1) / DAY_MS
}

function yearStartDay(year: number): number {
  return Date.UTC(year, 0, 1) / DAY_MS
}

function volumeBucketStart(day: number, period: VolumePeriod): number {
  if (period === 'day') return day
  if (period === 'week') return monday(day)
  const date = new Date(day * DAY_MS)
  return period === 'month'
    ? monthStartDay(date.getUTCFullYear() * 12 + date.getUTCMonth())
    : yearStartDay(date.getUTCFullYear())
}

export function aggregateVolume(
  sessions: WorkoutSession[],
  now: Date,
  period: VolumePeriod,
): VolumeBucket[] {
  const recorded = recordedSessions(sessions, now)
  const today = calendarDay(now)
  let firstStartDay: number
  let bucketCount: number
  let currentStartDay: number

  if (period === 'day') {
    bucketCount = 14
    firstStartDay = today - bucketCount + 1
    currentStartDay = today
  } else if (period === 'week') {
    bucketCount = CHART_WEEKS
    currentStartDay = monday(today)
    firstStartDay = currentStartDay - (bucketCount - 1) * 7
  } else if (period === 'month') {
    bucketCount = 12
    const currentMonth = monthIndex(now)
    firstStartDay = monthStartDay(currentMonth - bucketCount + 1)
    currentStartDay = monthStartDay(currentMonth)
  } else {
    const first = recorded[0]
    if (!first) return []
    const firstYear = new Date(first.startedAt).getFullYear()
    const currentYear = now.getFullYear()
    bucketCount = currentYear - firstYear + 1
    firstStartDay = yearStartDay(firstYear)
    currentStartDay = yearStartDay(currentYear)
  }

  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    startDay: period === 'day' || period === 'week'
      ? firstStartDay + index * (period === 'day' ? 1 : 7)
      : period === 'month'
        ? monthStartDay(monthIndex(new Date(firstStartDay * DAY_MS)) + index)
        : yearStartDay(new Date(firstStartDay * DAY_MS).getUTCFullYear() + index),
    volumeKg: 0,
  }))
  const byStartDay = new Map(buckets.map((bucket) => [bucket.startDay, bucket]))

  for (const session of recorded) {
    const day = calendarDay(new Date(session.startedAt))
    const startDay = volumeBucketStart(day, period)
    if (startDay < firstStartDay || startDay > currentStartDay) continue
    const bucket = byStartDay.get(startDay)
    if (bucket) bucket.volumeKg += sessionVolume(session)
  }

  return buckets
}

/** Week labels display the local calendar day encoded by startDay, without a second TZ shift. */
export function weekLabel(startDay: number): string {
  return new Date(startDay * DAY_MS).toLocaleDateString('de-DE', {
    day: 'numeric', month: 'numeric', timeZone: 'UTC',
  })
}

export function volumeBucketLabel(startDay: number, period: VolumePeriod): string {
  const date = new Date(startDay * DAY_MS)
  if (period === 'day') {
    return date.toLocaleDateString('de-DE', {
      weekday: 'short', day: 'numeric', month: 'numeric', timeZone: 'UTC',
    })
  }
  if (period === 'week') return `ab ${weekLabel(startDay)}`
  if (period === 'month') {
    return date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit', timeZone: 'UTC' })
  }
  return String(date.getUTCFullYear())
}