import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

import { ActionButton, Card, TextField } from '@/components/ui'
import { labLog } from '@/features/lab/labLog'
import { useSettings } from '@/features/settings/settingsStore'
import { buildShortcutUrl, estimateActiveEnergyKcal } from '@/lib/health'
import type { HealthPayload } from '@/lib/health'

const PENDING_KEY = 'fitti.lab.healthPending'

export function ShortcutSpike() {
  const health = useSettings((state) => state.connections.health)
  const bodyWeightKg = useSettings((state) => state.profile.bodyWeightKg)
  const setHealth = useSettings((state) => state.setHealth)
  const [searchParams, setSearchParams] = useSearchParams()

  const result = searchParams.get('health')

  useEffect(() => {
    if (!result) return

    const pending = localStorage.getItem(PENDING_KEY)
    const roundtripMs = pending ? Date.now() - Number(pending) : null
    localStorage.removeItem(PENDING_KEY)

    labLog(
      result === 'ok' ? 'ok' : 'error',
      `x-callback zurück: ${result}${roundtripMs === null ? '' : ` nach ${roundtripMs} ms`}`,
    )

    const next = new URLSearchParams(searchParams)
    next.delete('health')
    setSearchParams(next, { replace: true })
  }, [result, searchParams, setSearchParams])

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      if (window.location.hash.includes('health=')) return

      const pending = localStorage.getItem(PENDING_KEY)
      if (!pending) return

      localStorage.removeItem(PENDING_KEY)
      labLog(
        'warn',
        `Zurück in der App nach ${Date.now() - Number(pending)} ms, aber ohne x-success. ` +
          'Fallback nötig: Nutzer muss den Erfolg bestätigen.',
      )
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  const run = (payload: HealthPayload) => {
    const url = buildShortcutUrl({
      shortcutName: health.shortcutName,
      payload,
      successRoute: '/lab?health=ok',
      errorRoute: '/lab?health=fail',
    })

    localStorage.setItem(PENDING_KEY, String(Date.now()))
    labLog('info', `Öffne Kurzbefehl „${health.shortcutName}“ (mode=${payload.mode})`)
    window.location.href = url
  }

  const sendTest = () =>
    run({ mode: 'test', app: 'fitti', sentAt: new Date().toISOString() })

  const sendWorkout = () => {
    const end = new Date()
    const start = new Date(end.getTime() - 15 * 60_000)
    run({
      mode: 'log',
      app: 'fitti',
      workoutType: 'traditionalStrengthTraining',
      start: start.toISOString(),
      end: end.toISOString(),
      durationSec: 900,
      activeEnergyKcal: estimateActiveEnergyKcal(900, bodyWeightKg),
      title: 'fitti Testtraining',
      sessionId: crypto.randomUUID(),
    })
  }

  const showUrl = () => {
    const url = buildShortcutUrl({
      shortcutName: health.shortcutName,
      payload: { mode: 'test', app: 'fitti', sentAt: new Date().toISOString() },
      successRoute: '/lab?health=ok',
      errorRoute: '/lab?health=fail',
    })
    labLog('info', url)
    void navigator.clipboard?.writeText(url).catch(() => undefined)
  }

  return (
    <Card className="space-y-3 p-4 pt-0">
      <TextField
        label="3 · Kurzbefehl-Name"
        value={health.shortcutName}
        onChange={(shortcutName) => setHealth({ shortcutName })}
        placeholder="Fitti Log"
      />

      <p className="text-xs text-fg-muted">
        Der Kurzbefehl muss exakt so heißen. Bei <code className="text-fg">mode=test</code> soll er
        nichts in Health schreiben, sondern nur eine Mitteilung zeigen.
      </p>

      <div className="flex flex-wrap gap-2">
        <ActionButton variant="primary" onClick={sendTest}>
          Test senden
        </ActionButton>
        <ActionButton onClick={sendWorkout}>Workout senden</ActionButton>
        <ActionButton onClick={showUrl}>URL ins Log</ActionButton>
      </div>

      <p className="text-xs text-warn">
        „Workout senden“ schreibt einen echten 15-Minuten-Eintrag in Health.
      </p>
    </Card>
  )
}
