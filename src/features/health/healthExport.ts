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
  mode: 'test' | 'log'
  sessionId?: string | null
  returnRoute: string
}): void {
  const { shortcutName, payload, mode, sessionId = null, returnRoute } = options

  localStorage.setItem(
    PENDING_KEY,
    JSON.stringify({ mode, sessionId, at: Date.now() } satisfies PendingExport),
  )

  window.location.href = buildShortcutUrl({
    shortcutName,
    payload,
    successRoute: `${returnRoute}?health=ok`,
    errorRoute: `${returnRoute}?health=fail`,
  })
}

/**
 * Der Test läuft durch denselben Weg wie ein echtes Training. Dadurch braucht
 * der Kurzbefehl keinen Sonderfall – der Eintrag ist eine Minute lang und klar
 * benannt, lässt sich in Health also leicht wieder löschen.
 */
export function sendHealthTest(shortcutName: string, returnRoute: string): void {
  const end = new Date()
  const start = new Date(end.getTime() - 60_000)

  runShortcut({
    shortcutName,
    returnRoute,
    mode: 'test',
    payload: {
      mode: 'log',
      app: 'fitti',
      workoutType: 'traditionalStrengthTraining',
      start: start.toISOString(),
      end: end.toISOString(),
      durationSec: 60,
      activeEnergyKcal: 5,
      avgHeartRateBpm: 120,
      title: 'fitti Verbindungstest',
      sessionId: crypto.randomUUID(),
    },
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
    mode: 'log',
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
