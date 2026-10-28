import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { SetResult } from '../src/features/logbook/db.ts'
import { adviseSet } from '../src/features/workout/advice.ts'
import type { WorkoutStep } from '../src/features/workout/steps.ts'
import type { PlanExercise } from '../src/lib/plan/schema.ts'

const sets = [
  { reps: 12, targetWeightKg: 25, restSec: 60 },
  { reps: 11, targetWeightKg: 30, restSec: 60 },
  { reps: 10, targetWeightKg: 30, restSec: 60 },
]

const weightedExercise: PlanExercise = {
  exerciseId: 'test-machine',
  name: 'Test Maschine',
  mode: 'reps',
  usesWeight: true,
  primaryMuscles: ['quads'],
  secondaryMuscles: [],
  equipment: ['machine'],
  timing: { toMidSec: 2, holdMidSec: 0, toStartSec: 2, holdStartSec: 0 },
  cues: [],
  weightStepKg: 2.5,
  sets,
}

function step(setIndex: number, exercise = weightedExercise): WorkoutStep {
  return {
    key: `test-${setIndex}`,
    blockIndex: 0,
    blockTitle: 'Test',
    round: 1,
    rounds: 1,
    exerciseIndex: 0,
    exerciseCount: 1,
    setIndex,
    setCount: exercise.sets.length,
    exercise,
    set: exercise.sets[setIndex]!,
    restSec: exercise.sets[setIndex]!.restSec,
  }
}

function result(setIndex: number, reps: number, weightKg: number | null): SetResult {
  return {
    exerciseId: 'test-machine',
    exerciseName: 'Test Maschine',
    setIndex,
    reps,
    durationSec: null,
    weightKg,
    at: '2026-10-28T10:00:00Z',
  }
}

test('only recommends increasing when every planned set from the same workout meets its target', () => {
  const allSetsMet = [result(0, 12, 25), result(1, 11, 30), result(2, 10, 30)]

  assert.deepEqual(adviseSet(step(0), allSetsMet, 2.5), {
    advice: 'increase',
    recommendedWeightKg: 27.5,
    recommendedReps: null,
    text: 'Alle 3 Satz-Ziele erreicht.',
  })
  assert.equal(adviseSet(step(1), allSetsMet, 2.5).recommendedWeightKg, 32.5)
})

test('a later-set failure prevents increases and reduces only the failing set', () => {
  const mixedResults = [result(0, 12, 25), result(1, 11, 30), result(2, 7, 30)]

  const firstSet = adviseSet(step(0), mixedResults, 2.5)
  assert.equal(firstSet.advice, 'hold')
  assert.equal(firstSet.recommendedWeightKg, 25)
  assert.match(firstSet.text, /Sätze 12\/12 · 11\/11 · 7\/10/)

  const thirdSet = adviseSet(step(2), mixedResults, 2.5)
  assert.equal(thirdSet.advice, 'decrease')
  assert.equal(thirdSet.recommendedWeightKg, 27.5)
})

test('missing planned sets prevent increases', () => {
  const partial = [result(0, 12, 25), result(1, 11, 30)]
  assert.equal(adviseSet(step(0), partial, 2.5).advice, 'hold')
  assert.match(adviseSet(step(0), partial, 2.5).text, /offen/)
})

test('weighted recommendations never fall below an exercise option floor', () => {
  const hackSquat: PlanExercise = {
    ...weightedExercise,
    weightOptionsKg: [47.5],
    sets: sets.map((set) => ({ ...set, targetWeightKg: 47.5 })),
  }
  const failed = [result(0, 12, 47.5), result(1, 11, 47.5), result(2, 7, 47.5)]
  const advice = adviseSet(step(2, hackSquat), failed, 2.5)
  assert.equal(advice.advice, 'hold')
  assert.equal(advice.recommendedWeightKg, 47.5)
})

test('unweighted exercises recommend repetitions instead of weight', () => {
  const bodyweight: PlanExercise = {
    ...weightedExercise,
    usesWeight: false,
    weightStepKg: undefined,
    sets: sets.map(({ reps, restSec }) => ({ reps, restSec })),
  }
  const completed = [result(0, 12, null), result(1, 11, null), result(2, 10, null)]
  const advice = adviseSet(step(1, bodyweight), completed, 2.5)
  assert.equal(advice.advice, 'increase')
  assert.equal(advice.recommendedWeightKg, null)
  assert.equal(advice.recommendedReps, 12)
})
