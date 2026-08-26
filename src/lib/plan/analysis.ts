import type { Plan, PlanExercise } from './schema.ts'

/** Grobe Annahme für eine Wiederholung, wenn kein Tempo angegeben ist. */
const SECONDS_PER_REP = 3
const TRANSITION_SECONDS = 15

export function estimateExerciseSeconds(exercise: PlanExercise): number {
  return exercise.sets.reduce((total, set) => {
    const work = exercise.mode === 'time' ? (set.durationSec ?? 0) : (set.reps ?? 0) * SECONDS_PER_REP
    return total + work + set.restSec
  }, 0)
}

export function estimatePlanSeconds(plan: Plan): number {
  return plan.blocks.reduce((total, block) => {
    const perRound = block.exercises.reduce(
      (sum, exercise) => sum + estimateExerciseSeconds(exercise) + TRANSITION_SECONDS,
      0,
    )
    const rounds = block.rounds * perRound
    const betweenRounds = (block.rounds - 1) * block.restBetweenRoundsSec
    return total + rounds + betweenRounds
  }, 0)
}

export function countExercises(plan: Plan): number {
  return plan.blocks.reduce((total, block) => total + block.exercises.length, 0)
}

export function countSets(plan: Plan): number {
  return plan.blocks.reduce(
    (total, block) =>
      total +
      block.rounds * block.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0),
    0,
  )
}

export function collectPrimaryMuscles(plan: Plan): Set<string> {
  const muscles = new Set<string>()
  for (const block of plan.blocks) {
    for (const exercise of block.exercises) {
      for (const muscle of exercise.primaryMuscles) muscles.add(muscle)
    }
  }
  return muscles
}

export function collectEquipment(plan: Plan): Set<string> {
  const equipment = new Set<string>()
  for (const block of plan.blocks) {
    for (const exercise of block.exercises) {
      for (const item of exercise.equipment) equipment.add(item)
    }
  }
  return equipment
}

export function collectExerciseIds(plan: Plan): Set<string> {
  const ids = new Set<string>()
  for (const block of plan.blocks) {
    for (const exercise of block.exercises) ids.add(exercise.exerciseId)
  }
  return ids
}
