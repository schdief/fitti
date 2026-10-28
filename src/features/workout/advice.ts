import type { SetResult } from '@/features/logbook/db'
import type { WorkoutStep } from '@/features/workout/steps'
import { nextWeight } from './weights.ts'

export type Advice = 'increase' | 'hold' | 'decrease' | 'unknown'

export interface SetAdvice {
  advice: Advice
  recommendedWeightKg: number | null
  recommendedReps: number | null
  /** Kurzer Satz für den Trainingsbildschirm, begründet über alle Sätze. */
  text: string
}

/**
 * Empfehlung für den anstehenden Satz anhand aller Ergebnisse der Übung aus
 * dem jüngsten Training.
 *
 * Erst wenn alle geplanten Sätze erfasst wurden und alle Wiederholungsziele
 * erreicht sind, wird gesteigert. Bei einem deutlichen Einbruch wird nur der
 * betroffene Satz erleichtert; die übrigen Sätze bleiben unverändert.
 */
export function adviseSet(
  step: WorkoutStep,
  lastSets: SetResult[] | undefined,
  fallbackWeightStepKg: number,
): SetAdvice {
  if (step.exercise.mode !== 'reps' || !lastSets) return unknownAdvice()

  const bySet = new Map(lastSets.map((result) => [result.setIndex, result]))
  const last = bySet.get(step.setIndex)
  if (!last || last.reps == null) return unknownAdvice()

  const plannedSets = step.exercise.sets
  const allSetsRecorded = plannedSets.every((_, index) => bySet.get(index)?.reps != null)
  const allGoalsMet =
    allSetsRecorded &&
    plannedSets.every((plannedSet, index) => {
      const reps = bySet.get(index)?.reps
      return reps != null && reps >= (plannedSet.reps ?? 0)
    })
  const target = step.set.reps ?? 0
  if (target === 0) return unknownAdvice()

  const summary = plannedSets
    .map((plannedSet, index) => {
      const reps = bySet.get(index)?.reps
      return reps == null ? 'offen' : `${reps}/${plannedSet.reps ?? 0}`
    })
    .join(' · ')

  if (!step.exercise.usesWeight) {
    if (allGoalsMet) {
      return {
        advice: 'increase',
        recommendedWeightKg: null,
        recommendedReps: target + 1,
        text: `Alle ${plannedSets.length} Satz-Ziele erreicht.`,
      }
    }
    if (last.reps <= target - 3) {
      return {
        advice: 'decrease',
        recommendedWeightKg: null,
        recommendedReps: Math.max(1, target - 1),
        text: `Sätze ${summary}; nur Satz ${step.setIndex + 1} leichter.`,
      }
    }
    return {
      advice: 'hold',
      recommendedWeightKg: null,
      recommendedReps: last.reps,
      text: `Sätze ${summary}; Wiederholungen halten.`,
    }
  }

  const currentWeight = last.weightKg ?? step.set.targetWeightKg ?? 0

  if (allGoalsMet) {
    const recommendedWeightKg = nextWeight(
      currentWeight,
      1,
      step.exercise,
      fallbackWeightStepKg,
    )
    return {
      advice: 'increase',
      recommendedWeightKg,
      recommendedReps: null,
      text: `Alle ${plannedSets.length} Satz-Ziele erreicht.`,
    }
  }

  if (last.reps <= target - 3) {
    const recommendedWeightKg = nextWeight(
      currentWeight,
      -1,
      step.exercise,
      fallbackWeightStepKg,
    )
    const canDecrease = recommendedWeightKg < currentWeight
    return {
      advice: canDecrease ? 'decrease' : 'hold',
      recommendedWeightKg,
      recommendedReps: null,
      text: canDecrease
        ? `Sätze ${summary}; nur Satz ${step.setIndex + 1} erleichtern.`
        : `Untergrenze ${recommendedWeightKg} kg erreicht (${summary}) – Gewicht halten.`,
    }
  }

  return {
    advice: 'hold',
    recommendedWeightKg: currentWeight,
    recommendedReps: null,
    text: `Sätze ${summary}; nicht steigern.`,
  }
}

function unknownAdvice(): SetAdvice {
  return {
    advice: 'unknown',
    recommendedWeightKg: null,
    recommendedReps: null,
    text: '',
  }
}

export interface ExerciseComparison {
  exerciseId: string
  exerciseName: string
  /** Volumen (Wiederholungen × Gewicht) dieses und des vorigen Trainings. */
  volume: number
  previousVolume: number
  deltaPercent: number
}

export interface SessionAnalysis {
  totalVolume: number
  previousVolume: number | null
  better: ExerciseComparison[]
  worse: ExerciseComparison[]
  unchanged: ExerciseComparison[]
  /** Übungen ohne Vorgeschichte, es gibt also nichts zu vergleichen. */
  fresh: ExerciseComparison[]
  hasComparison: boolean
}

/** Schwelle, ab der eine Veränderung als solche gilt. Darunter ist es Rauschen. */
const NOISE_PERCENT = 3

/**
 * Vergleicht das gerade beendete Training mit dem letzten desselben Plans,
 * Übung für Übung über das Volumen.
 */
export function analyseSession(
  results: SetResult[],
  previousResults: SetResult[] | null,
): SessionAnalysis {
  const current = volumeByExercise(results)
  const previous = previousResults ? volumeByExercise(previousResults) : null

  const comparisons: ExerciseComparison[] = []

  for (const [exerciseId, entry] of current) {
    const before = previous?.get(exerciseId)
    const previousVolume = before?.volume ?? 0

    comparisons.push({
      exerciseId,
      exerciseName: entry.name,
      volume: entry.volume,
      previousVolume,
      deltaPercent:
        previousVolume > 0 ? ((entry.volume - previousVolume) / previousVolume) * 100 : 0,
    })
  }

  const hasComparison = previous !== null && previous.size > 0

  return {
    totalVolume: sum(comparisons.map((entry) => entry.volume)),
    previousVolume: hasComparison ? sum(comparisons.map((entry) => entry.previousVolume)) : null,
    better: comparisons
      .filter((entry) => entry.previousVolume > 0 && entry.deltaPercent > NOISE_PERCENT)
      .sort((a, b) => b.deltaPercent - a.deltaPercent),
    worse: comparisons
      .filter((entry) => entry.previousVolume > 0 && entry.deltaPercent < -NOISE_PERCENT)
      .sort((a, b) => a.deltaPercent - b.deltaPercent),
    unchanged: comparisons.filter(
      (entry) => entry.previousVolume > 0 && Math.abs(entry.deltaPercent) <= NOISE_PERCENT,
    ),
    fresh: comparisons.filter((entry) => entry.previousVolume === 0),
    hasComparison,
  }
}

function volumeByExercise(results: SetResult[]): Map<string, { name: string; volume: number }> {
  const map = new Map<string, { name: string; volume: number }>()

  for (const result of results) {
    // Ohne Gewicht zählen die Wiederholungen, sonst wären Eigengewichtsübungen
    // immer bei null.
    const value = (result.reps ?? 0) * (result.weightKg ?? 1)
    const entry = map.get(result.exerciseId)

    if (entry) entry.volume += value
    else map.set(result.exerciseId, { name: result.exerciseName, volume: value })
  }

  return map
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}
