import { CalendarDays } from 'lucide-react'

import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui'

export function LogbookPage() {
  return (
    <>
      <PageHeader title="Logbuch" />

      <div className="mx-auto max-w-lg px-4 py-4">
        <Card className="p-6 text-center">
          <CalendarDays size={28} className="mx-auto text-accent" aria-hidden />
          <h2 className="mt-3 text-base font-semibold">Noch keine Trainings aufgezeichnet</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Abgeschlossene Trainings landen hier – inklusive Wiederholungen und Gewichten für die
            Vorschläge beim nächsten Mal.
          </p>
        </Card>
      </div>
    </>
  )
}
