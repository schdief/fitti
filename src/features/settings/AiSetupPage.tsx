import { ExternalLink } from 'lucide-react'

import { PageHeader } from '@/components/PageHeader'
import { Card, SegmentedControl, TextField } from '@/components/ui'
import { useSettings } from '@/features/settings/settingsStore'
import { AI_DEFAULT_MODEL } from '@/features/settings/settingsStore'
import { AI_CONSOLE_URL, AI_LABELS } from '@/lib/ai/client'

const STEPS: Record<'gemini' | 'openai', string[]> = {
  gemini: [
    'Öffne Google AI Studio und melde dich mit deinem Google-Konto an.',
    'Tippe auf „Create API key“ und wähle ein Projekt aus oder lege eines an.',
    'Kopiere den Schlüssel – er beginnt mit „AIza“.',
    'Füge ihn unten ein. Für Gemini gibt es ein kostenloses Kontingent, das für ein paar Auswertungen pro Tag reicht.',
  ],
  openai: [
    'Öffne die OpenAI-Plattform und melde dich an.',
    'Lege unter „API keys“ einen neuen Schlüssel an.',
    'Kopiere ihn sofort – er wird nur einmal angezeigt und beginnt mit „sk-“.',
    'OpenAI rechnet nach Verbrauch ab. Hinterlege ein Guthaben und setze ein Ausgabenlimit.',
  ],
}

export function AiSetupPage() {
  const ai = useSettings((state) => state.connections.ai)
  const setAi = useSettings((state) => state.setAi)

  return (
    <div className="min-h-app">
      <PageHeader title="KI-Analyse" subtitle="Schlüssel erzeugen und hinterlegen" back />

      <div className="pad-safe-bottom mx-auto max-w-lg space-y-4 px-4 py-4">
        <p className="text-sm text-fg-muted">
          Mit einem eigenen Schlüssel wertet fitti dein Training direkt in der App aus. Ohne
          Schlüssel bleibt es beim Teilen: Der fertige Text geht dann ans Teilen-Menü, und du
          fügst ihn selbst in eine KI-App ein.
        </p>

        <Card className="p-4">
          <SegmentedControl
            label="KI-Anbieter"
            value={ai.provider}
            onChange={(provider) =>
              setAi({ provider, model: AI_DEFAULT_MODEL[provider], message: null })
            }
            options={[
              { value: 'gemini', label: 'Gemini' },
              { value: 'openai', label: 'ChatGPT' },
            ]}
          />
        </Card>

        <Card className="space-y-3 p-4">
          <h2 className="text-sm font-semibold">Schlüssel bei {AI_LABELS[ai.provider]} erzeugen</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-fg-muted">
            {STEPS[ai.provider].map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ol>

          <a
            href={AI_CONSOLE_URL[ai.provider]}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-card bg-accent py-3 text-sm font-semibold text-accent-fg"
          >
            <ExternalLink size={16} aria-hidden />
            Seite öffnen
          </a>
        </Card>

        <Card>
          <TextField
            label="API-Schlüssel"
            value={ai.apiKey}
            onChange={(apiKey) => setAi({ apiKey, message: null })}
            placeholder={ai.provider === 'gemini' ? 'AIza…' : 'sk-…'}
            type="password"
          />
          <TextField
            label="Modell"
            value={ai.model}
            onChange={(model) => setAi({ model, message: null })}
            placeholder={AI_DEFAULT_MODEL[ai.provider]}
          />
        </Card>

        <Card className="space-y-2 border-warn/40 p-4 text-xs text-fg-muted">
          <h2 className="text-sm font-semibold text-warn">Was du wissen solltest</h2>
          <p>
            Der Schlüssel liegt unverschlüsselt im Speicher deines Browsers und wird bei jeder
            Anfrage direkt vom Gerät an den Anbieter geschickt. Das ist für einen persönlichen
            Schlüssel vertretbar, aber kein Tresor: Nimm einen Schlüssel, der nur für fitti gilt,
            und setze beim Anbieter ein Ausgabenlimit.
          </p>
          <p>
            Übertragen werden Plan, Sätze, Gewichte und die Dauer deines Trainings. Name, Konto
            oder Gesundheitsdaten aus Apple Health sind nicht dabei.
          </p>
          <p>Löschst du das Feld, nutzt fitti wieder das Teilen-Menü.</p>
        </Card>
      </div>
    </div>
  )
}
