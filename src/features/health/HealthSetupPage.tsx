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
    title: 'Aktion: Wörterbuch aus Eingabe abrufen',
    body: 'Unten nach „Wörterbuch“ suchen und „Wörterbuch aus Eingabe abrufen“ hinzufügen. Als Eingabe „Kurzbefehleingabe“ wählen. Falls am Ende noch „Stoppen und ausgeben“ steht: diese Aktion löschen, sie wird nicht gebraucht.',
  },
  {
    title: 'Aktion: Wörterbuchwert abrufen – fünfmal',
    body: 'Nach „Wörterbuchwert“ suchen und die Aktion fünfmal hinzufügen, einmal je Schlüssel: start, end, durationSec, activeEnergyKcal, avgHeartRateBpm. Den Schlüssel jeweils in das Feld „Schlüssel“ tippen.',
  },
  {
    title: 'Wichtig: richtiges Wörterbuch wählen',
    body: 'Ab der zweiten dieser Aktionen zeigt das Feld dahinter auf die Aktion direkt darüber. Tippe darauf und wähle stattdessen die Variable „Wörterbuch“ aus Schritt 2. Sonst kommen leere Werte heraus.',
  },
  {
    title: 'Aktion: Workout protokollieren',
    body: 'Nach „Workout“ suchen. Typ auf „Traditionelles Krafttraining“ stellen. Startdatum = Variable von start, Enddatum = Variable von end, Kalorien = Variable von activeEnergyKcal.',
  },
  {
    title: 'Aktion: Health-Sample protokollieren',
    body: 'Nach „Health-Sample“ suchen. Typ auf „Herzfrequenz“ stellen, Wert = Variable von avgHeartRateBpm, Datum = Variable von start. Das ist der Wert, den Krankenkassen auswerten.',
  },
  {
    title: 'Einmal von Hand starten',
    body: 'Unten auf das Abspielsymbol tippen und die Nachfrage bestätigen. Ohne diese Freigabe blockiert iOS den Aufruf aus fitti heraus.',
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
            Der fertige Kurzbefehl
          </h2>
          <Card className="divide-y divide-line">
            {[
              'Wörterbuch aus Kurzbefehleingabe abrufen',
              'Wert für „start“ in Wörterbuch abrufen',
              'Wert für „end“ in Wörterbuch abrufen',
              'Wert für „durationSec“ in Wörterbuch abrufen',
              'Wert für „activeEnergyKcal“ in Wörterbuch abrufen',
              'Wert für „avgHeartRateBpm“ in Wörterbuch abrufen',
              'Workout protokollieren (Krafttraining, start – end, Kalorien)',
              'Health-Sample protokollieren (Herzfrequenz, avgHeartRateBpm)',
            ].map((line, index) => (
              <p key={line} className="flex gap-3 px-4 py-2 text-xs">
                <span className="w-4 shrink-0 tabular-nums text-fg-faint">{index + 1}</span>
                <span className="text-fg-muted">{line}</span>
              </p>
            ))}
          </Card>
        </section>

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

        <Card className="p-4">
          <h2 className="text-sm font-semibold">Wenn eine Aktion fehlt</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Gibt es „Workout protokollieren“ in deiner iOS-Version nicht, reicht auch nur
            „Health-Sample protokollieren“: einmal für „Aktive Energie“ mit
            <code className="mx-1 text-fg">activeEnergyKcal</code> und einmal für „Herzfrequenz“
            mit <code className="mx-1 text-fg">avgHeartRateBpm</code>. Der Eintrag erscheint dann
            als Datenpunkt statt als Training.
          </p>
        </Card>
      </div>
    </div>
  )
}
