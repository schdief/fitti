import { Check } from 'lucide-react'
import { useState } from 'react'

import { PageHeader } from '@/components/PageHeader'
import { ActionButton, Card, StatusBadge, TextField } from '@/components/ui'
import { sendHealthTest } from '@/features/health/healthExport'
import { useSettings } from '@/features/settings/settingsStore'

const SAMPLE_PAYLOAD = `{
  "mode": "log",
  "app": "fitti",
  "workoutType": "traditionalStrengthTraining",
  "start": "2026-08-26T17:04:00Z",
  "end": "2026-08-26T17:51:00Z",
  "durationSec": 2820,
  "activeEnergyKcal": 312,
  "avgHeartRateBpm": 124,
  "title": "Oberkörper mit Kurzhanteln",
  "sessionId": "…"
}`

const STEPS = [
  {
    title: 'Kurzbefehl anlegen',
    body: 'In der Kurzbefehle-App einen neuen Kurzbefehl erstellen und exakt so benennen wie im Feld oben.',
  },
  {
    title: 'Eingabe auslesen',
    body: 'Aktion „Wörterbuch aus Eingabe abrufen“ hinzufügen und als Eingabe „Kurzbefehleingabe“ wählen. Damit stehen alle Werte als Wörterbuch bereit.',
  },
  {
    title: 'Training protokollieren',
    body: 'Health-Aktion deiner iOS-Version einsetzen („Workout protokollieren“ oder „Health-Sample protokollieren“). Typ: Krafttraining. Start, Ende und Aktivenergie aus dem Wörterbuch einsetzen – dazu im Feld auf die Variable „Wörterbuch“ tippen und den Schlüssel eintragen.',
  },
  {
    title: 'Herzfrequenz mitschreiben',
    body: 'Eine zweite Health-Aktion für ein Sample vom Typ Herzfrequenz, Wert aus avgHeartRateBpm, Zeitraum von start bis end. Krankenkassen erkennen ein Training oft erst ab einer Mindestfrequenz an.',
  },
  {
    title: 'Einmal freigeben',
    body: 'Den Kurzbefehl einmal von Hand starten und die Nachfrage bestätigen. Danach läuft er ohne Rückfrage.',
  },
  {
    title: 'Zurück zu fitti',
    body: 'Nach dem Lauf wechselst du selbst zurück zu fitti. iOS kann aus der Kurzbefehle-App nicht automatisch in eine Home-Screen-App zurückspringen, deshalb fragt fitti anschließend kurz nach, ob es geklappt hat.',
  },
]

const KEYS = [
  ['start', 'Beginn des Trainings'],
  ['end', 'Ende des Trainings'],
  ['durationSec', 'Dauer in Sekunden'],
  ['activeEnergyKcal', 'Geschätzte Aktivenergie'],
  ['avgHeartRateBpm', 'Durchschnittliche Herzfrequenz'],
  ['title', 'Name des Trainings'],
]

export function HealthSetupPage() {
  const health = useSettings((state) => state.connections.health)
  const setHealth = useSettings((state) => state.setHealth)
  const [copied, setCopied] = useState(false)

  return (
    <div className="min-h-dvh">
      <PageHeader title="Apple Health" subtitle="Einrichtung des Kurzbefehls" back />

      <div className="pad-safe-bottom mx-auto max-w-lg space-y-4 px-4 py-4">
        <Card className="space-y-2 p-4">
          <StatusBadge state={health.state} />
          <p className="text-sm text-fg-muted">
            Health ist über keine Web-Schnittstelle erreichbar. Der Umweg führt deshalb über einen
            Kurzbefehl, den fitti mit den Trainingsdaten aufruft. Er braucht keine Verzweigung –
            jeder Aufruf hat dieselbe Form.
          </p>
        </Card>

        <Card>
          <TextField
            label="Name des Kurzbefehls"
            value={health.shortcutName}
            onChange={(shortcutName) => setHealth({ shortcutName })}
            placeholder="Fitti Log"
          />
        </Card>

        <ol className="space-y-3">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <Card className="flex gap-3 p-4">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                  {index + 1}
                </span>
                <div>
                  <p className="text-[15px] font-medium">{step.title}</p>
                  <p className="mt-0.5 text-sm text-fg-muted">{step.body}</p>
                </div>
              </Card>
            </li>
          ))}
        </ol>

        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-fg-faint">
            Schlüssel im Wörterbuch
          </h2>
          <Card className="divide-y divide-line">
            {KEYS.map(([key, description]) => (
              <div key={key} className="flex items-baseline gap-3 px-4 py-2">
                <code className="shrink-0 text-xs text-accent">{key}</code>
                <span className="text-xs text-fg-muted">{description}</span>
              </div>
            ))}
          </Card>
        </section>

        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-fg-faint">
            Beispiel-Payload
          </h2>
          <Card className="p-3">
            <pre className="overflow-x-auto text-[11px] leading-relaxed text-fg-muted">
              {SAMPLE_PAYLOAD}
            </pre>
            <ActionButton
              onClick={() => {
                void navigator.clipboard?.writeText(SAMPLE_PAYLOAD).catch(() => undefined)
                setCopied(true)
              }}
              className="mt-2 w-full"
            >
              {copied ? (
                <span className="flex items-center justify-center gap-1">
                  <Check size={16} aria-hidden />
                  Kopiert
                </span>
              ) : (
                'Payload kopieren'
              )}
            </ActionButton>
          </Card>
        </section>

        <ActionButton
          variant="primary"
          onClick={() => sendHealthTest(health.shortcutName, '/health-setup')}
          className="w-full py-3.5 text-base"
        >
          Verbindung testen
        </ActionButton>

        <p className="text-center text-xs text-fg-faint">
          Der Test schreibt ein einminütiges Training namens „fitti Verbindungstest“ in Health.
          Diesen Eintrag kannst du dort danach löschen.
        </p>
      </div>
    </div>
  )
}
