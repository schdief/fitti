import { ChevronRight, Clock, Dumbbell, Layers } from 'lucide-react'
import { Link } from 'react-router-dom'

import { LEVEL_LABELS, MUSCLE_LABELS } from '@/lib/plan/enums'
import type { CatalogEntry } from '@/lib/plan/schema'

const MAX_CHIPS = 4

export function PlanCard({ entry }: { entry: CatalogEntry }) {
  const shown = entry.targetMuscles.slice(0, MAX_CHIPS)
  const rest = entry.targetMuscles.length - shown.length

  return (
    <Link
      to={`/plan/${entry.id}`}
      className="block rounded-card border border-line bg-surface p-4 active:bg-surface-hi"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[17px] font-semibold">{entry.title}</h3>
          {entry.description ? (
            <p className="mt-0.5 line-clamp-2 text-sm text-fg-muted">{entry.description}</p>
          ) : null}
        </div>
        <ChevronRight size={20} className="mt-0.5 shrink-0 text-fg-faint" aria-hidden />
      </div>

      <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted">
        <div className="flex items-center gap-1.5">
          <Clock size={14} aria-hidden />
          <dt className="sr-only">Dauer</dt>
          <dd className="tabular-nums">{entry.estimatedDurationMin} min</dd>
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

      <ul className="mt-3 flex flex-wrap gap-1.5">
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
