import type { Plan, PlanExercise, PlanSet } from '@/lib/plan/schema'

/** Ein Satz als kleinste Einheit des Ablaufs. Die Liste ist linear abarbeitbar. */
export interface WorkoutStep {
  key: string
  blockIndex: number
  blockTitle: string
  round: number
  rounds: number
  exerciseIndex: number
  exerciseCount: number
  setIndex: number
  setCount: number
  exercise: PlanExercise
  set: PlanSet
  /** Pause nach diesem Satz, inklusive Rundenpause am Blockende. */
  restSec: number
}

const SECONDS_PER_REP = 3
const TRANSITION_SECONDS = 8

export function buildSteps(plan: Plan): WorkoutStep[] {
  const steps: WorkoutStep[] = []

  plan.blocks.forEach((block, blockIndex) => {
    for (let round = 1; round <= block.rounds; round += 1) {
      block.exercises.forEach((exercise, exerciseIndex) => {
        exercise.sets.forEach((set, setIndex) => {
          const lastOfRound =
            exerciseIndex === block.exercises.length - 1 && setIndex === exercise.sets.length - 1
          const moreRounds = round < block.rounds

          steps.push({
            key: `${blockIndex}-${round}-${exerciseIndex}-${setIndex}`,
            blockIndex,
            blockTitle: block.title,
            round,
            rounds: block.rounds,
            exerciseIndex,
            exerciseCount: block.exercises.length,
            setIndex,
            setCount: exercise.sets.length,
            exercise,
            set,
            restSec:
              lastOfRound && moreRounds && block.restBetweenRoundsSec > 0
                ? block.restBetweenRoundsSec
                : set.restSec,
          })
        })
      })
    }
  })

  return steps
}

export function workSeconds(step: WorkoutStep): number {
  return step.exercise.mode === 'time'
    ? (step.set.durationSec ?? 0)
    : (step.set.reps ?? 0) * SECONDS_PER_REP
}

/** Restliche Trainingszeit ab einem Schritt, grob geschätzt. */
export function remainingSeconds(steps: WorkoutStep[], fromIndex: number): number {
  return steps.slice(fromIndex).reduce((total, step, offset) => {
    const rest = offset === steps.length - fromIndex - 1 ? 0 : step.restSec
    return total + workSeconds(step) + rest
  }, TRANSITION_SECONDS)
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/** Schlüssel für den Vorschlagswert aus dem Logbuch. */
export function resultKey(exerciseId: string, setIndex: number): string {
  return `${exerciseId}#${setIndex}`
}
