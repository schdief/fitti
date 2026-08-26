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
  "title": "Oberkörper mit Kurzhanteln",
  "sessionId": "…"
}`

const STEPS = [
  {
    title: 'Kurzbefehl anlegen',
    body: 'In der Kurzbefehle-App einen neuen Kurzbefehl erstellen und exakt so benennen wie unten eingetragen.',
  },
  {
    title: 'Eingabe auslesen',
    body: 'Aktion „Wörterbuch aus Eingabe abrufen“ hinzufügen. Als Eingabe „Kurzbefehleingabe“ wählen.',
  },
  {
    title: 'Modus prüfen',
    body: 'Aktion „Wörterbuchwert abrufen“ mit dem Schlüssel mode. Danach „Wenn“ mit der Bedingung „ist gleich test“.',
  },
  {
    title: 'Testfall',
    body: 'Im Wenn-Zweig nur „Mitteilung zeigen“ mit dem Text „Fitti-Test erfolgreich“. Hier wird bewusst nichts in Health geschrieben.',
  },
  {
    title: 'Echter Eintrag',
    body: 'Im Andernfalls-Zweig die Health-Aktion deiner iOS-Version einsetzen (Workout protokollieren beziehungsweise Health-Sample protokollieren) und mit start, end, durationSec und activeEnergyKcal füttern.',
  },
  {
    title: 'Einmal freigeben',
    body: 'Den Kurzbefehl einmal von Hand starten und die Rückfrage bestätigen. Danach läuft er ohne Nachfrage.',
  },
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
            Kurzbefehl, den fitti mit den Trainingsdaten aufruft.
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
          Der Test sendet <code className="text-fg-muted">mode: "test"</code> und schreibt nichts in
          Health.
        </p>
      </div>
    </div>
  )
}
