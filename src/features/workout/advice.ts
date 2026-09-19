import type { SetResult } from '@/features/logbook/db'
import type { WorkoutStep } from '@/features/workout/steps'

export type Advice = 'increase' | 'hold' | 'decrease' | 'unknown'

export interface SetAdvice {
  advice: Advice
  /** Kurzer Satz für den Trainingsbildschirm. */
  text: string
}

/**
 * Empfehlung für den anstehenden Satz aus dem letzten Ergebnis derselben Übung
 * und Satznummer.
 *
 * Grundregel im Krafttraining: Wer die Zielwiederholungen sauber schafft, darf
 * beim nächsten Mal mehr auflegen. Wer deutlich darunter bleibt, sollte
 * reduzieren. Dazwischen bleibt das Gewicht stehen.
 */
export function adviseSet(step: WorkoutStep, last: SetResult | undefined): SetAdvice {
  if (step.exercise.mode !== 'reps' || !last || last.reps == null) {
    return { advice: 'unknown', text: '' }
  }

  const target = step.set.reps ?? 0
  if (target === 0) return { advice: 'unknown', text: '' }

  const done = last.reps
  const weight = last.weightKg

  if (done >= target) {
    return {
      advice: 'increase',
      text: weight
        ? `Letztes Mal ${done} Wdh mit ${weight} kg – leg etwas drauf`
        : `Letztes Mal ${done} Wdh geschafft – eine Stufe schwerer`,
    }
  }

  if (done <= target - 3) {
    return {
      advice: 'decrease',
      text: weight
        ? `Letztes Mal nur ${done} von ${target} Wdh mit ${weight} kg – geh runter`
        : `Letztes Mal nur ${done} von ${target} Wdh – etwas leichter`,
    }
  }

  return {
    advice: 'hold',
    text: `Letztes Mal ${done} von ${target} Wdh – Gewicht halten`,
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
