import { Clock, Dumbbell, Layers, Play } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/PageHeader'
import { ActionButton, Card } from '@/components/ui'
import { usePlan } from '@/features/catalog/useCatalog'
import { ExerciseFigures } from '@/features/figures/ExerciseFigures'
import { countExercises, countSets, estimatePlanSeconds } from '@/lib/plan/analysis'
import {
  BLOCK_TYPE_LABELS,
  EQUIPMENT_LABELS,
  LEVEL_LABELS,
  MUSCLE_LABELS,
} from '@/lib/plan/enums'
import type { PlanExercise } from '@/lib/plan/schema'

function setSummary(exercise: PlanExercise): string {
  const count = exercise.sets.length
  const values = exercise.sets.map((set) =>
    exercise.mode === 'time' ? `${set.durationSec} s` : `${set.reps}`,
  )
  const uniform = new Set(values).size === 1

  const work = uniform ? `${count} × ${values[0]}` : values.join(' · ')
  const weights = exercise.sets
    .map((set) => set.targetWeightKg)
    .filter((weight): weight is number => weight != null)

  const min = weights.length > 0 ? Math.min(...weights) : 0
  const max = weights.length > 0 ? Math.max(...weights) : 0
  const weight = weights.length === 0 ? '' : ` · ${min === max ? `${min}` : `${min}–${max}`} kg`

  const averageRest = Math.round(
    exercise.sets.reduce((sum, set) => sum + set.restSec, 0) / count,
  )
  const rest = averageRest > 0 ? ` · ${averageRest} s Pause` : ''

  return `${work}${weight}${rest}`
}

export function PlanDetailPage() {
  const { planId } = useParams()
  const navigate = useNavigate()
  const { plan, loading } = usePlan(planId)

  if (loading) {
    return (
      <>
        <PageHeader title="Plan" back />
        <p className="mt-8 text-center text-sm text-fg-muted">Lädt …</p>
      </>
    )
  }

  if (!plan) {
    return (
      <>
        <PageHeader title="Plan" back />
        <div className="mx-auto max-w-lg px-4 py-4">
          <Card className="p-6 text-center text-sm text-fg-muted">
            Dieser Plan existiert nicht oder passt nicht zum Schema.
          </Card>
        </div>
      </>
    )
  }

  const realMinutes = Math.round(estimatePlanSeconds(plan) / 60)

  return (
    <div className="min-h-dvh pb-28">
      <PageHeader title={plan.title} subtitle={LEVEL_LABELS[plan.level]} back />

      <div className="mx-auto max-w-lg space-y-4 px-4 py-4">
        {plan.description ? <p className="text-sm text-fg-muted">{plan.description}</p> : null}

        <Card className="grid grid-cols-3 divide-x divide-line">
          <Metric icon={<Clock size={16} aria-hidden />} value={`${plan.estimatedDurationMin} min`} label="Dauer" />
          <Metric
            icon={<Layers size={16} aria-hidden />}
            value={String(countSets(plan))}
            label="Sätze"
          />
          <Metric
            icon={<Dumbbell size={16} aria-hidden />}
            value={String(countExercises(plan))}
            label="Übungen"
          />
        </Card>

        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-faint">
            Zielmuskeln
          </h2>
          <ul className="flex flex-wrap gap-1.5">
            {plan.targetMuscles.map((muscle) => (
              <li
                key={muscle}
                className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent"
              >
                {MUSCLE_LABELS[muscle]}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-faint">
            Equipment
          </h2>
          <ul className="flex flex-wrap gap-1.5">
            {plan.equipment.map((item) => (
              <li key={item} className="rounded-full bg-surface-hi px-2.5 py-1 text-xs text-fg-muted">
                {EQUIPMENT_LABELS[item]}
              </li>
            ))}
          </ul>
        </section>

        {plan.blocks.map((block, blockIndex) => (
          <section key={`${block.type}-${blockIndex}`}>
            <h2 className="mb-2 flex items-center gap-2 px-1">
              <span className="text-sm font-semibold">{block.title}</span>
              {block.title !== BLOCK_TYPE_LABELS[block.type] ? (
                <span className="rounded-full bg-surface-hi px-2 py-0.5 text-[11px] text-fg-muted">
                  {BLOCK_TYPE_LABELS[block.type]}
                </span>
              ) : null}
              {block.rounds > 1 ? (
                <span className="text-xs text-fg-muted">{block.rounds} Durchgänge</span>
              ) : null}
            </h2>

            <Card className="divide-y divide-line">
              {block.exercises.map((exercise, exerciseIndex) => (
                <div key={`${exercise.exerciseId}-${exerciseIndex}`} className="flex gap-3 p-3">
                  <ExerciseFigures exerciseId={exercise.exerciseId} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium leading-snug">{exercise.name}</p>
                    <p className="mt-0.5 text-xs text-fg-muted">{setSummary(exercise)}</p>
                    {exercise.cues.length > 0 ? (
                      <p className="mt-1 line-clamp-2 text-xs text-fg-faint">
                        {exercise.cues.join(' · ')}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </Card>
          </section>
        ))}

        <p className="px-1 text-xs text-fg-faint">
          Gerechnete Dauer inklusive Pausen: {realMinutes} min · Ø {plan.avgHeartRateBpm} bpm
        </p>
      </div>

      <div className="pad-safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto max-w-lg">
          <ActionButton
            variant="primary"
            onClick={() => navigate(`/workout/${plan.id}`)}
            className="flex w-full items-center justify-center gap-2 py-3.5 text-base"
          >
            <Play size={18} aria-hidden />
            Training starten
          </ActionButton>
        </div>
      </div>
    </div>
  )
}

function Metric({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: string
  label: string
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-3">
      <span className="text-fg-muted">{icon}</span>
      <span className="text-base font-semibold tabular-nums">{value}</span>
      <span className="text-[11px] text-fg-faint">{label}</span>
    </div>
  )
}
