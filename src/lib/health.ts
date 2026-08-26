import { appUrl } from '@/lib/appUrl'

export interface HealthWorkoutPayload {
  mode: 'log'
  app: 'fitti'
  workoutType: 'traditionalStrengthTraining'
  start: string
  end: string
  durationSec: number
  activeEnergyKcal: number | null
  title: string
  sessionId: string
}

export interface HealthTestPayload {
  mode: 'test'
  app: 'fitti'
  sentAt: string
}

export type HealthPayload = HealthWorkoutPayload | HealthTestPayload

export interface ShortcutUrlOptions {
  shortcutName: string
  payload: HealthPayload
  successRoute?: string
  errorRoute?: string
}

export function buildShortcutUrl({
  shortcutName,
  payload,
  successRoute = '/settings?health=ok',
  errorRoute = '/settings?health=fail',
}: ShortcutUrlOptions): string {
  const params = new URLSearchParams({
    name: shortcutName,
    input: 'text',
    text: JSON.stringify(payload),
    'x-success': appUrl(successRoute),
    'x-error': appUrl(errorRoute),
    'x-cancel': appUrl(errorRoute),
  })

  return `shortcuts://x-callback-url/run-shortcut?${params.toString()}`
}

/**
 * MET-basierte Schätzung der Aktivenergie. Ohne Körpergewicht liefert Health
 * sonst gar keinen Kalorienwert.
 */
export function estimateActiveEnergyKcal(
  durationSec: number,
  bodyWeightKg: number | null,
  met = 4.5,
): number | null {
  if (!bodyWeightKg) return null
  const minutes = durationSec / 60
  return Math.round(((met * 3.5 * bodyWeightKg) / 200) * minutes)
}
