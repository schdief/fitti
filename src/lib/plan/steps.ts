import type { Plan, PlanExercise, PlanSet } from './schema.ts'

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

/** Grobe Annahme für eine Wiederholung, wenn kein Tempo angegeben ist. */
const SECONDS_PER_REP = 3

/** Zuschlag je Übung fürs Umbauen, Einstellen und Hinlaufen. */
const TRANSITION_SECONDS = 15

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

/**
 * Dauer ab einem Schritt bis zum Ende. Der Zuschlag fällt einmal je Übung an,
 * die Pause nach dem letzten Satz zählt nicht mehr mit.
 *
 * Einzige Quelle für alle Zeitangaben: Plankatalog, Plandetails und der
 * Trainingsbildschirm rechnen damit, sonst zeigen sie verschiedene Zahlen.
 */
export function remainingSeconds(steps: WorkoutStep[], fromIndex = 0): number {
  const upcoming = steps.slice(fromIndex)
  let total = 0
  let currentExercise = ''

  upcoming.forEach((step, offset) => {
    const exerciseKey = `${step.blockIndex}-${step.round}-${step.exerciseIndex}`
    if (exerciseKey !== currentExercise) {
      total += TRANSITION_SECONDS
      currentExercise = exerciseKey
    }

    total += workSeconds(step)
    if (offset < upcoming.length - 1) total += step.restSec
  })

  return total
}
