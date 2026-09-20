import { CheckCircle2, ChevronRight, Clock, Dumbbell, Layers } from 'lucide-react'
import { Link } from 'react-router-dom'

import { describeCount, describeSince } from '@/features/logbook/history'
import type { PlanHistory } from '@/features/logbook/history'
import { LEVEL_LABELS, MUSCLE_LABELS } from '@/lib/plan/enums'
import type { CatalogEntry } from '@/lib/plan/schema'

const MAX_CHIPS = 4

export function PlanCard({ entry, history, historyLoaded = true }: {
  entry: CatalogEntry
  history?: PlanHistory
  historyLoaded?: boolean
}) {
  const shown = entry.targetMuscles.slice(0, MAX_CHIPS)
  const rest = entry.targetMuscles.length - shown.length

  // Erfahrungswert schlaegt Schaetzung: der Schnitt der letzten Trainings.
  const minutes = history?.averageDurationSec
    ? Math.round(history.averageDurationSec / 60)
    : entry.estimatedDurationMin

  return (
    <Link
      to={`/plan/${entry.id}`}
      className="group block rounded-card border border-line bg-surface p-5 shadow-sm shadow-black/20 transition-colors hover:border-accent/40 active:bg-surface-hi"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold leading-snug tracking-tight">{entry.title}</h3>
          {entry.description ? (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-fg-muted">{entry.description}</p>
          ) : null}
        </div>
        <ChevronRight size={20} className="mt-0.5 shrink-0 text-fg-faint" aria-hidden />
      </div>

      <dl className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-fg-muted">
        <div className="flex items-center gap-1.5">
          <Clock size={14} aria-hidden />
          <dt className="sr-only">Dauer</dt>
          <dd className="tabular-nums">{minutes} min</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Layers size={14} aria-hidden />
          <dt className="sr-only">Umfang</dt>
          <dd className="tabular-nums">
            {entry.exerciseCount} Übungen · {entry.setCount} Sätze
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Dumbbell size={14} aria-hidden />
          <dt className="sr-only">Level</dt>
          <dd>{LEVEL_LABELS[entry.level]}</dd>
        </div>
      </dl>

      <div className="mt-3 flex items-start gap-2 text-xs leading-relaxed" aria-label="Trainingshistorie">
        <CheckCircle2 size={16} aria-hidden className={`mt-0.5 shrink-0 ${history?.count ? 'text-accent' : 'text-fg-muted'}`} />
        {!historyLoaded ? (
          <p className="text-fg-muted">Trainingshistorie lädt …</p>
        ) : history && history.count > 0 ? (
          <div>
            <p className="text-accent">
              {describeCount(history.count)} trainiert
              {history.lastAt ? ` · zuletzt ${describeSince(history.lastAt)}` : ''}
            </p>
            {history.completedCount < history.count ? (
              <p className="text-fg-muted">Davon {history.count - history.completedCount} × vorzeitig beendet</p>
            ) : null}
          </div>
        ) : (
          <p className="text-fg-muted">Noch kein Training gespeichert</p>
        )}
      </div>

      <ul className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-4">
        {shown.map((muscle) => (
          <li
            key={muscle}
            className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent"
          >
            {MUSCLE_LABELS[muscle]}
          </li>
        ))}
        {rest > 0 ? (
          <li className="rounded-full bg-surface-hi px-2 py-0.5 text-xs text-fg-muted">+{rest}</li>
        ) : null}
      </ul>
    </Link>
  )
}
