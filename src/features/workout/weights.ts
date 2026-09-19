import type { PlanExercise } from '@/lib/plan/schema'

/**
 * Nächstes wählbares Gewicht. Maschinen haben oft unregelmäßige Stufen, die
 * sich erst weiter oben regelmäßig fortsetzen – deshalb erst die Liste, dann
 * die Schrittweite.
 */
export function nextWeight(
  current: number,
  direction: 1 | -1,
  exercise: PlanExercise,
  fallbackStepKg: number,
): number {
  const step = exercise.weightStepKg ?? fallbackStepKg
  const options = exercise.weightOptionsKg

  if (!options || options.length === 0) {
    return round(Math.max(0, current + direction * step))
  }

  const lowest = options[0]!
  const highest = options[options.length - 1]!

  if (direction > 0) {
    const above = options.find((value) => value > current + 0.001)
    return round(above ?? Math.max(highest, current) + step)
  }

  if (current > highest + 0.001) {
    return round(Math.max(highest, current - step))
  }

  const below = [...options].reverse().find((value) => value < current - 0.001)
  return round(below ?? lowest)
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
