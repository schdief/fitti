import type { Plan } from './schema.ts'
import { buildSteps, remainingSeconds } from './steps.ts'

/** Gleiche Rechnung wie im Training, damit überall dieselbe Dauer steht. */
export function estimatePlanSeconds(plan: Plan): number {
  return remainingSeconds(buildSteps(plan))
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
