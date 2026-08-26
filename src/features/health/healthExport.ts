import { buildShortcutUrl, estimateActiveEnergyKcal } from '@/lib/health'
import type { HealthPayload } from '@/lib/health'
import type { WorkoutSession } from '@/features/logbook/db'

const PENDING_KEY = 'fitti.health.pending'

export interface PendingExport {
  mode: 'test' | 'log'
  sessionId: string | null
  at: number
}

export function pendingExport(): PendingExport | null {
  const raw = localStorage.getItem(PENDING_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as PendingExport
  } catch {
    localStorage.removeItem(PENDING_KEY)
    return null
  }
}

export function clearPendingExport(): void {
  localStorage.removeItem(PENDING_KEY)
}

/**
 * Öffnet den Kurzbefehl. Verlässt die App – die Rückkehr wertet der
 * HealthCallbackHandler anhand des x-callback-Parameters aus.
 */
export function runShortcut(options: {
  shortcutName: string
  payload: HealthPayload
  sessionId?: string | null
  returnRoute: string
}): void {
  const { shortcutName, payload, sessionId = null, returnRoute } = options

  localStorage.setItem(
    PENDING_KEY,
    JSON.stringify({ mode: payload.mode, sessionId, at: Date.now() } satisfies PendingExport),
  )

  window.location.href = buildShortcutUrl({
    shortcutName,
    payload,
    successRoute: `${returnRoute}?health=ok`,
    errorRoute: `${returnRoute}?health=fail`,
  })
}

export function sendHealthTest(shortcutName: string, returnRoute: string): void {
  runShortcut({
    shortcutName,
    returnRoute,
    payload: { mode: 'test', app: 'fitti', sentAt: new Date().toISOString() },
  })
}

export function sendHealthWorkout(
  session: WorkoutSession,
  shortcutName: string,
  bodyWeightKg: number | null,
  returnRoute: string,
): void {
  runShortcut({
    shortcutName,
    returnRoute,
    sessionId: session.sessionId,
    payload: {
      mode: 'log',
      app: 'fitti',
      workoutType: 'traditionalStrengthTraining',
      start: session.startedAt,
      end: session.endedAt,
      durationSec: session.durationSec,
      activeEnergyKcal: estimateActiveEnergyKcal(
        session.durationSec,
        bodyWeightKg,
        session.metValue ?? 4.5,
      ),
      avgHeartRateBpm: session.avgHeartRateBpm ?? 120,
      title: session.planTitle,
      sessionId: session.sessionId,
    },
  })
}
