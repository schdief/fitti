import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calculateStatistics } from '../src/features/statistics/statistics.ts'
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
  assert.deepEqual(sessions.map((s) => s.sessionId), originalOrder)
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