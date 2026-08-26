import { useState } from 'react'

import { ActionButton } from '@/components/ui'
import type { WorkoutStep } from '@/features/workout/steps'

export interface SetInputValues {
  reps: number | null
  durationSec: number | null
  weightKg: number | null
}

function Stepper({
  label,
  value,
  suffix,
  step,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  suffix: string
  step: number
  min: number
  max: number
  onChange: (next: number) => void
}) {
  const clamp = (next: number) => Math.min(max, Math.max(min, Math.round(next * 100) / 100))

  return (
    <div>
      <p className="mb-1.5 text-center text-xs font-medium uppercase tracking-wider text-fg-faint">
        {label}
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`${label} verringern`}
          onClick={() => onChange(clamp(value - step))}
          className="size-14 shrink-0 rounded-2xl bg-surface-hi text-2xl text-fg-muted active:bg-line"
        >
          −
        </button>
        <output className="flex-1 text-center text-3xl font-semibold tabular-nums">
          {value}
          <span className="ml-1 text-base font-normal text-fg-muted">{suffix}</span>
        </output>
        <button
          type="button"
          aria-label={`${label} erhöhen`}
          onClick={() => onChange(clamp(value + step))}
          className="size-14 shrink-0 rounded-2xl bg-surface-hi text-2xl text-fg-muted active:bg-line"
        >
          +
        </button>
      </div>
    </div>
  )
}

export function SetInputSheet({
  step,
  defaults,
  previousLabel,
  weightStepKg,
  onSubmit,
  onCancel,
}: {
  step: WorkoutStep
  defaults: SetInputValues
  previousLabel: string | null
  weightStepKg: number
  onSubmit: (values: SetInputValues) => void
  onCancel: () => void
}) {
  const [reps, setReps] = useState(defaults.reps ?? 0)
  const [durationSec, setDurationSec] = useState(defaults.durationSec ?? 0)
  const [weightKg, setWeightKg] = useState(defaults.weightKg ?? 0)

  const isTime = step.exercise.mode === 'time'

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Abbrechen"
        onClick={onCancel}
        className="absolute inset-0 bg-black/70"
      />

      <div className="pad-safe-bottom relative rounded-t-3xl border-t border-line bg-surface px-4 pb-4 pt-5">
        <h2 className="text-center text-lg font-semibold">{step.exercise.name}</h2>
        <p className="mt-0.5 text-center text-sm text-fg-muted">
          Satz {step.setIndex + 1} von {step.setCount}
          {previousLabel ? ` · letztes Mal ${previousLabel}` : ''}
        </p>

        <div className="mt-5 space-y-5">
          {isTime ? (
            <Stepper
              label="Geschaffte Zeit"
              value={durationSec}
              suffix="s"
              step={5}
              min={0}
              max={3600}
              onChange={setDurationSec}
            />
          ) : (
            <Stepper
              label="Wiederholungen"
              value={reps}
              suffix="Wdh"
              step={1}
              min={0}
              max={500}
              onChange={setReps}
            />
          )}

          {step.exercise.usesWeight ? (
            <Stepper
              label="Gewicht"
              value={weightKg}
              suffix="kg"
              step={weightStepKg}
              min={0}
              max={500}
              onChange={setWeightKg}
            />
          ) : null}
        </div>

        <ActionButton
          variant="primary"
          onClick={() =>
            onSubmit({
              reps: isTime ? null : reps,
              durationSec: isTime ? durationSec : null,
              weightKg: step.exercise.usesWeight ? weightKg : null,
            })
          }
          className="mt-6 w-full py-3.5 text-base"
        >
          Übernehmen
        </ActionButton>
      </div>
    </div>
  )
}
