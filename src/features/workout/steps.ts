export { buildSteps, remainingSeconds, workSeconds } from '@/lib/plan/steps'
export type { WorkoutStep } from '@/lib/plan/steps'

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
