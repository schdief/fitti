import { Settings, SlidersHorizontal, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui'

export function CatalogPage() {
  return (
    <>
      <PageHeader
        title="Trainingspläne"
        action={
          <Link
            to="/settings"
            aria-label="Einstellungen"
            className="-mr-2 flex size-10 items-center justify-center rounded-full text-fg-muted active:bg-surface"
          >
            <Settings size={22} aria-hidden />
          </Link>
        }
      />

      <div className="mx-auto max-w-lg px-4 py-4">
        <button
          type="button"
          disabled
          className="flex w-full items-center gap-2 rounded-card border border-line bg-surface px-4 py-3 text-left text-sm text-fg-faint"
        >
          <SlidersHorizontal size={18} aria-hidden />
          Nach Dauer und Muskelgruppen filtern
        </button>

        <Card className="mt-4 p-6 text-center">
          <Sparkles size={28} className="mx-auto text-accent" aria-hidden />
          <h2 className="mt-3 text-base font-semibold">Noch keine Pläne im Katalog</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Pläne liegen als JSON unter <code className="text-fg">public/plans/</code> und werden mit
            dem Copilot-Skill erzeugt.
          </p>
        </Card>
      </div>
    </>
  )
}
