import { CalendarDays, ChevronRight, Clock, Layers } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { PageHeader } from '@/components/PageHeader'
import { Card, SegmentedControl } from '@/components/ui'
import { CalendarView } from '@/features/logbook/CalendarView'
import { dayKey, sessionVolume, useSessions } from '@/features/logbook/useSessions'
import type { WorkoutSession } from '@/features/logbook/db'

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
}

function SessionCard({ session }: { session: WorkoutSession }) {
  const volume = Math.round(sessionVolume(session))

  return (
    <Link
      to={`/logbook/${session.sessionId}`}
      className="block rounded-card border border-line bg-surface p-4 active:bg-surface-hi"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wider text-fg-faint">
            {formatDay(session.startedAt)}
            {session.completed ? '' : ' · abgebrochen'}
          </p>
          <h3 className="truncate text-[16px] font-semibold">{session.planTitle}</h3>
        </div>
        <ChevronRight size={20} className="mt-1 shrink-0 text-fg-faint" aria-hidden />
      </div>

      <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
        <div className="flex items-center gap-1.5">
          <Clock size={14} aria-hidden />
          <dt className="sr-only">Dauer</dt>
          <dd className="tabular-nums">{Math.round(session.durationSec / 60)} min</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Layers size={14} aria-hidden />
          <dt className="sr-only">Sätze</dt>
          <dd className="tabular-nums">{session.results.length} Sätze</dd>
        </div>
        {volume > 0 ? (
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Volumen</dt>
            <dd className="tabular-nums">{volume} kg Volumen</dd>
          </div>
        ) : null}
      </dl>
    </Link>
  )
}

export function LogbookPage() {
  const { sessions, loaded, load } = useSessions()
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [load])

  const grouped = useMemo(() => {
    const map = new Map<string, WorkoutSession[]>()
    for (const session of sessions) {
      const label = new Date(session.startedAt).toLocaleDateString('de-DE', {
        month: 'long',
        year: 'numeric',
      })
      map.set(label, [...(map.get(label) ?? []), session])
    }
    return [...map.entries()]
  }, [sessions])

  const daySessions = selectedDay
    ? sessions.filter((session) => dayKey(session.startedAt) === selectedDay)
    : []

  return (
    <>
      <PageHeader
        title="Logbuch"
        subtitle={
          loaded ? (sessions.length === 1 ? '1 Training' : `${sessions.length} Trainings`) : undefined
        }
      />

      <div className="mx-auto max-w-lg space-y-4 px-4 py-4">
        {sessions.length === 0 ? (
          <Card className="p-6 text-center">
            <CalendarDays size={28} className="mx-auto text-accent" aria-hidden />
            <h2 className="mt-3 text-base font-semibold">Noch keine Trainings aufgezeichnet</h2>
            <p className="mt-1 text-sm text-fg-muted">
              Abgeschlossene Trainings landen hier – inklusive Wiederholungen und Gewichten für die
              Vorschläge beim nächsten Mal.
            </p>
          </Card>
        ) : (
          <>
            <SegmentedControl
              label="Ansicht"
              value={view}
              onChange={setView}
              options={[
                { value: 'list', label: 'Liste' },
                { value: 'calendar', label: 'Kalender' },
              ]}
            />

            {view === 'calendar' ? (
              <>
                <CalendarView
                  sessions={sessions}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                />
                {selectedDay ? (
                  <ul className="space-y-3">
                    {daySessions.map((session) => (
                      <li key={session.sessionId}>
                        <SessionCard session={session} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-center text-xs text-fg-faint">
                    Auf einen markierten Tag tippen, um die Trainings zu sehen.
                  </p>
                )}
              </>
            ) : (
              grouped.map(([label, entries]) => (
                <section key={label}>
                  <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-fg-faint">
                    {label}
                  </h2>
                  <ul className="space-y-3">
                    {entries.map((session) => (
                      <li key={session.sessionId}>
                        <SessionCard session={session} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}
          </>
        )}
      </div>
    </>
  )
}
