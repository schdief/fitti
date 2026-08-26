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
        <ActionButton variant="primary" onClick={() => sendHealthTest(health.shortcutName, '/lab')}>
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
