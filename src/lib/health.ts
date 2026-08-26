import { appUrl, isStandalone } from '@/lib/appUrl'

/**
 * Einziges Nutzlastformat. Bewusst ohne Varianten, damit der Kurzbefehl auf der
 * iPhone-Seite keine Fallunterscheidung braucht.
 */
export interface HealthPayload {
  mode: 'log'
  app: 'fitti'
  workoutType: 'traditionalStrengthTraining'
  start: string
  end: string
  durationSec: number
  activeEnergyKcal: number | null
  /** Durchschnittliche Herzfrequenz in Schlägen pro Minute. */
  avgHeartRateBpm: number
  title: string
  sessionId: string
}

export interface ShortcutUrlOptions {
  shortcutName: string
  payload: HealthPayload
  successRoute?: string
  errorRoute?: string
  /** Ohne Callback kehrt iOS von selbst zur aufrufenden App zurück. */
  withCallback?: boolean
}

export function buildShortcutUrl({
  shortcutName,
  payload,
  successRoute = '/settings?health=ok',
  errorRoute = '/settings?health=fail',
  withCallback = !isStandalone(),
}: ShortcutUrlOptions): string {
  // Bewusst kein URLSearchParams: das kodiert Leerzeichen als "+", und die
  // Kurzbefehle-App liest das wörtlich. Der Name muss %20 enthalten.
  const encode = (values: Record<string, string>) =>
    Object.entries(values)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&')

  const base = {
    name: shortcutName,
    input: 'text',
    text: JSON.stringify(payload),
  }

  if (!withCallback) {
    return `shortcuts://run-shortcut?${encode(base)}`
  }

  return `shortcuts://x-callback-url/run-shortcut?${encode({
    ...base,
    'x-success': appUrl(successRoute),
    'x-error': appUrl(errorRoute),
    'x-cancel': appUrl(errorRoute),
  })}`
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
