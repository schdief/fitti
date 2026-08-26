import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Card } from '@/components/ui'
import { dayKey } from '@/features/logbook/useSessions'
import type { WorkoutSession } from '@/features/logbook/db'

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function monthLabel(date: Date): string {
  return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

export function CalendarView({
  sessions,
  onSelectDay,
  selectedDay,
}: {
  sessions: WorkoutSession[]
  selectedDay: string | null
  onSelectDay: (day: string | null) => void
}) {
  const [month, setMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })

  const byDay = useMemo(() => {
    const map = new Map<string, WorkoutSession[]>()
    for (const session of sessions) {
      const key = dayKey(session.startedAt)
      map.set(key, [...(map.get(key) ?? []), session])
    }
    return map
  }, [sessions])

  const firstWeekday = (month.getDay() + 6) % 7
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const todayKey = dayKey(new Date().toISOString())

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]

  const shift = (delta: number) =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1))

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Vorheriger Monat"
          onClick={() => shift(-1)}
          className="flex size-9 items-center justify-center rounded-full text-fg-muted active:bg-surface-hi"
        >
          <ChevronLeft size={20} aria-hidden />
        </button>
        <h2 className="text-sm font-semibold">{monthLabel(month)}</h2>
        <button
          type="button"
          aria-label="Nächster Monat"
          onClick={() => shift(1)}
          className="flex size-9 items-center justify-center rounded-full text-fg-muted active:bg-surface-hi"
        >
          <ChevronRight size={20} aria-hidden />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[11px] text-fg-faint">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (day === null) return <span key={`empty-${index}`} />

          const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const entries = byDay.get(key) ?? []
          const isSelected = selectedDay === key
          const isToday = todayKey === key

          return (
            <button
              key={key}
              type="button"
              disabled={entries.length === 0}
              onClick={() => onSelectDay(isSelected ? null : key)}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg text-sm tabular-nums transition-colors ${
                isSelected
                  ? 'bg-accent text-accent-fg'
                  : entries.length > 0
                    ? 'bg-accent/15 text-accent'
                    : 'text-fg-faint'
              } ${isToday && !isSelected ? 'ring-1 ring-line' : ''}`}
            >
              {day}
              {entries.length > 0 ? (
                <span className="mt-0.5 flex gap-0.5">
                  {entries.slice(0, 3).map((session) => (
                    <span
                      key={session.sessionId}
                      className={`size-1 rounded-full ${isSelected ? 'bg-accent-fg' : 'bg-accent'}`}
                    />
                  ))}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </Card>
  )
}
