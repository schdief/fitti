import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  aggregateVolume,
  calculateStatistics,
  volumeBucketLabel,
} from '../src/features/statistics/statistics.ts'
import type { WorkoutSession } from '../src/features/logbook/db.ts'

function session(day: number, durationSec = 3600, completed = true): WorkoutSession {
  const at = new Date(2026, 8, day, 12).toISOString()
  return {
    sessionId: String(day), planId: 'plan', planTitle: 'Test', startedAt: at, endedAt: at,
    durationSec, completed,
    results: [{ exerciseId: 'row', exerciseName: 'Rudern', setIndex: 0, reps: 12, durationSec: null, weightKg: 30, at }],
  }
}

test('empty statistics contain zero metrics and twelve empty weeks', () => {
  const stats = calculateStatistics([], new Date(2026, 8, 20))
  assert.equal(stats.count, 0)
  assert.equal(stats.totalHours, 0)
  assert.equal(stats.averagePerWeek, 0)
  assert.equal(stats.longestStreak, 0)
  assert.equal(stats.longestStreakIsCurrent, false)
  assert.equal(stats.firstTrainingAt, null)
  assert.equal(stats.weeks.length, 12)
  assert(stats.weeks.every((week) => week.count === 0 && week.durationSec === 0))
})

test('count and hours include saved partial training, not empty aborts', () => {
  const stats = calculateStatistics([
    session(7), session(12, 1800), session(17, 600, false),
    { ...session(18, 180, false), results: [] },
  ], new Date(2026, 8, 20))
  assert.equal(stats.count, 3)
  assert.equal(stats.partialCount, 1)
  assert.equal(stats.totalHours, 6000 / 3600)
  assert.equal(stats.weeks.reduce((sum, week) => sum + week.count, 0), 3)
})

test('weekly average includes inactive weeks and uses a minimum of seven days', () => {
  assert.equal(calculateStatistics([session(7)], new Date(2026, 8, 20)).averagePerWeek, .5)
  assert.equal(calculateStatistics([session(20)], new Date(2026, 8, 20, 14)).averagePerWeek, 1)
  assert.equal(calculateStatistics([session(7), session(8), session(14), session(15)], new Date(2026, 8, 20)).averagePerWeek, 2)
})

test('four rest days are allowed, five rest days start a new streak', () => {
  const sessions = [session(23), session(7), session(17), session(12)]
  const originalOrder = sessions.map((s) => s.sessionId)
  const stats = calculateStatistics(sessions, new Date(2026, 9, 30))
  assert.equal(stats.longestStreak, 3) // 7 -> 12 -> 17, then break before 23
  assert.equal(stats.longestStreakIsCurrent, false)
  assert.deepEqual(sessions.map((s) => s.sessionId), originalOrder)
})

test('the longest streak is current only when its latest workout is recent and it is still the longest', () => {
  const recent = calculateStatistics(
    [session(7), session(12), session(17)],
    new Date(2026, 8, 20),
  )
  assert.equal(recent.longestStreak, 3)
  assert.equal(recent.longestStreakIsCurrent, true)

  const expired = calculateStatistics(
    [session(7), session(12), session(14)],
    new Date(2026, 8, 20),
  )
  assert.equal(expired.longestStreakIsCurrent, false)

  const shorterCurrent = calculateStatistics(
    [session(1), session(6), session(11), session(17), session(20)],
    new Date(2026, 8, 20),
  )
  assert.equal(shorterCurrent.longestStreak, 3)
  assert.equal(shorterCurrent.longestStreakIsCurrent, false)
})

test('multiple units on the same day count as separate training units', () => {
  const stats = calculateStatistics([session(7), { ...session(7), sessionId: 'second' }, session(12)], new Date(2026, 8, 20))
  assert.equal(stats.count, 3)
  assert.equal(stats.longestStreak, 3)
})

test('weeks start on Monday and cross year boundaries correctly', () => {
  const dated = (date: Date) => ({ ...session(1), startedAt: date.toISOString() })
  const stats = calculateStatistics([
    dated(new Date(2025, 11, 29, 12)), dated(new Date(2026, 0, 4, 12)), dated(new Date(2026, 0, 5, 12)),
  ], new Date(2026, 0, 5, 23))
  assert.equal(stats.weeks.at(-1)?.count, 1)
  assert.equal(stats.weeks.at(-2)?.count, 2)
  assert.equal(new Date(stats.weeks.at(-1)!.startDay * 86400000).getUTCDay(), 1)
})

test('older workouts count in all-time metrics, not in the recent graph', () => {
  const stats = calculateStatistics([session(1)], new Date(2027, 0, 20))
  assert.equal(stats.count, 1)
  assert.equal(stats.longestStreak, 1)
  assert(stats.weeks.every((week) => week.count === 0))
})

test('invalid or future start dates and invalid durations do not spoil metrics', () => {
  const stats = calculateStatistics([
    { ...session(7), startedAt: 'invalid' }, session(28), session(12, -10), session(13, NaN),
  ], new Date(2026, 8, 20))
  assert.equal(stats.count, 2)
  assert.equal(stats.totalHours, 0)
})

test('volume buckets cover the requested rolling periods and label month and year boundaries', () => {
  const dated = (year: number, month: number, day: number) => ({
    ...session(day),
    startedAt: new Date(year, month, day, 12).toISOString(),
  })
  const sessions = [
    dated(2025, 11, 31),
    dated(2026, 0, 1),
    dated(2026, 0, 31),
    dated(2026, 1, 1),
  ]
  const now = new Date(2026, 1, 15, 12)

  const days = aggregateVolume(sessions, now, 'day')
  const weeks = aggregateVolume(sessions, now, 'week')
  const months = aggregateVolume(sessions, now, 'month')
  const years = aggregateVolume(sessions, now, 'year')
  assert.equal(days.length, 14)
  assert.equal(weeks.length, 12)
  assert.equal(months.length, 12)
  assert.deepEqual(years.map((bucket) => volumeBucketLabel(bucket.startDay, 'year')), ['2025', '2026'])
  assert.equal(months.at(-2)?.volumeKg, 2 * 360)
  assert.equal(months.at(-1)?.volumeKg, 360)
  assert.equal(years[0]?.volumeKg, 360)
  assert.equal(years[1]?.volumeKg, 3 * 360)
  assert.deepEqual(
    weeks.filter((bucket) => bucket.volumeKg > 0).map((bucket) => bucket.volumeKg),
    [2 * 360, 2 * 360],
  )
})

test('monthly and yearly volume buckets use the current month west of UTC', () => {
  const previousTz = process.env.TZ
  process.env.TZ = 'America/New_York'
  try {
    const dated = (year: number, month: number, day: number) => ({
      ...session(day),
      startedAt: new Date(year, month, day, 12).toISOString(),
    })
    const sessions = [
      dated(2025, 11, 31),
      dated(2026, 0, 1),
      dated(2026, 0, 31),
      dated(2026, 1, 1),
    ]
    const now = new Date(2026, 1, 15, 12)
    const months = aggregateVolume(sessions, now, 'month')
    const years = aggregateVolume(sessions, now, 'year')
    const monthLabels = months.map((bucket) => volumeBucketLabel(bucket.startDay, 'month'))

    assert.equal(monthLabels.length, 12)
    assert.equal(monthLabels.at(-2), 'Jan. 26')
    assert.equal(monthLabels.at(-1), 'Feb. 26')
    assert.equal(months.at(-2)?.volumeKg, 2 * 360)
    assert.equal(months.at(-1)?.volumeKg, 360)
    assert.deepEqual(years.map((bucket) => volumeBucketLabel(bucket.startDay, 'year')), ['2025', '2026'])
    assert.deepEqual(years.map((bucket) => bucket.volumeKg), [360, 3 * 360])
  } finally {
    if (previousTz === undefined) delete process.env.TZ
    else process.env.TZ = previousTz
  }
})

test('daily volume uses local calendar dates across the daylight-saving transition', () => {
  const previousTz = process.env.TZ
  process.env.TZ = 'America/New_York'
  try {
    const dates = [7, 8, 9].map((day) => new Date(2026, 2, day, 12))
    const sessions = dates.map((date, index) => ({
      ...session(1),
      sessionId: String(index),
      startedAt: date.toISOString(),
    }))
    const buckets = aggregateVolume(sessions, new Date(2026, 2, 9, 18), 'day')
    const dayStarts = dates.map((date) =>
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
    )
    assert.deepEqual(dayStarts.slice(1).map((day, index) => day - dayStarts[index]!), [1, 1])
    assert.deepEqual(
      dayStarts.map((startDay) => buckets.find((bucket) => bucket.startDay === startDay)?.volumeKg),
      [360, 360, 360],
    )
  } finally {
    if (previousTz === undefined) delete process.env.TZ
    else process.env.TZ = previousTz
  }
})

test('volume counts partial sets, treats missing weights as zero, and filters empty, invalid, and future sessions', () => {
  const missingWeight = {
    ...session(17, 600, false),
    results: [{ ...session(17).results[0]!, reps: 10, weightKg: null }],
  }
  const statsSessions = [
    session(17),
    missingWeight,
    { ...session(18, 180, false), results: [] },
    { ...session(19), startedAt: 'invalid' },
    { ...session(21), startedAt: new Date(2026, 8, 21, 12).toISOString() },
  ]
  const buckets = aggregateVolume(statsSessions, new Date(2026, 8, 20), 'day')
  assert.equal(buckets.reduce((sum, bucket) => sum + bucket.volumeKg, 0), 360)
})

test('year volume has no buckets before the first valid training', () => {
  assert.deepEqual(aggregateVolume([], new Date(2026, 8, 20), 'year'), [])
})