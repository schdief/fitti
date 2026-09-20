import { test } from 'node:test'
import assert from 'node:assert/strict'
import { historyByPlan, describeSince } from '../src/features/logbook/history.ts'
import type { WorkoutSession } from '../src/features/logbook/db.ts'

function session(id: string, completed: boolean, durationSec: number, day: number): WorkoutSession {
  return {
    sessionId: id, planId: 'test-plan', planTitle: 'Test', completed, durationSec,
    startedAt: `2026-09-${day}T10:00:00Z`, endedAt: `2026-09-${day}T11:00:00Z`,
    results: [{ exerciseId: 'test-exercise', exerciseName: 'Test', setIndex: 0, reps: 12, weightKg: 20, durationSec: null, at: `2026-09-${day}T10:05:00Z` }],
  }
}

test('saved partial workouts appear in history but do not shorten duration estimates', () => {
  const full = session('full', true, 2580, 18)
  const partial = session('partial', false, 180, 19)
  const empty = { ...session('empty', false, 30, 20), results: [] }
  assert.deepEqual(historyByPlan([empty, full, partial]).get('test-plan'), {
    count: 2, completedCount: 1, lastAt: partial.endedAt, averageDurationSec: 2580,
  })
})

test('partial-only history has a count and last date, not a fabricated average', () => {
  const partial = session('partial', false, 180, 19)
  assert.deepEqual(historyByPlan([partial]).get('test-plan'), {
    count: 1, completedCount: 0, lastAt: partial.endedAt, averageDurationSec: null,
  })
  assert.equal(historyByPlan([]).size, 0)
})

test('only the latest three completed sessions contribute to duration', () => {
  assert.equal(historyByPlan([
    session('old', true, 9000, 15), session('a', true, 2400, 16),
    session('b', true, 2580, 17), session('c', true, 2760, 18),
    session('partial', false, 300, 19),
  ]).get('test-plan')?.averageDurationSec, 2580)
})

test('last trained uses local calendar dates instead of rolling 24-hour periods', (context) => {
  context.mock.timers.enable({ apis: ['Date'], now: new Date(2026, 8, 20, 8).getTime() })
  assert.equal(describeSince(new Date(2026, 8, 19, 23).toISOString()), 'gestern')
  assert.equal(describeSince(new Date(2026, 8, 20, 7).toISOString()), 'heute')
  context.mock.timers.reset()
})