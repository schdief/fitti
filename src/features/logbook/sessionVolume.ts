import type { WorkoutSession } from './db.ts'

export function sessionVolume(session: WorkoutSession): number {
  return session.results.reduce(
    (total, result) => total + (result.reps ?? 0) * (result.weightKg ?? 0),
    0,
  )
}
