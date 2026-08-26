import { ActionButton, Card, TextField } from '@/components/ui'
import { sendHealthTest, sendHealthWorkout } from '@/features/health/healthExport'
import { labLog } from '@/features/lab/labLog'
import { useSettings } from '@/features/settings/settingsStore'
import { buildShortcutUrl } from '@/lib/health'

export function ShortcutSpike() {
  const health = useSettings((state) => state.connections.health)
  const bodyWeightKg = useSettings((state) => state.profile.bodyWeightKg)
  const setHealth = useSettings((state) => state.setHealth)

  const sendWorkout = () => {
    const end = new Date()
    const start = new Date(end.getTime() - 15 * 60_000)

    sendHealthWorkout(
      {
        sessionId: crypto.randomUUID(),
        planId: 'diagnose',
        planTitle: 'fitti Testtraining',
        startedAt: start.toISOString(),
        endedAt: end.toISOString(),
        durationSec: 900,
        completed: true,
        results: [],
        metValue: 4.5,
        avgHeartRateBpm: 120,
      },
      health.shortcutName,
      bodyWeightKg,
      '/lab',
    )
  }

  const showUrl = () => {
    const end = new Date()
    const url = buildShortcutUrl({
      shortcutName: health.shortcutName,
      payload: {
        mode: 'log',
        app: 'fitti',
        workoutType: 'traditionalStrengthTraining',
        start: new Date(end.getTime() - 60_000).toISOString(),
        end: end.toISOString(),
        durationSec: 60,
        activeEnergyKcal: 5,
        avgHeartRateBpm: 120,
        title: 'fitti Verbindungstest',
        sessionId: crypto.randomUUID(),
      },
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
        Der Kurzbefehl muss exakt so heißen. Jeder Aufruf hat dieselbe Form, eine Verzweigung
        braucht er nicht.
      </p>

      <div className="flex flex-wrap gap-2">
        <ActionButton variant="primary" onClick={() => sendHealthTest(health.shortcutName, '/lab')}>
          Test senden
        </ActionButton>
        <ActionButton onClick={sendWorkout}>Workout senden</ActionButton>
        <ActionButton onClick={showUrl}>URL ins Log</ActionButton>
      </div>

      <p className="text-xs text-warn">
        Beide Aufrufe schreiben einen echten Eintrag in Health.
      </p>
    </Card>
  )
}
