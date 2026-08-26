import { Check, ChevronRight, Clock, Plus, SkipForward, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { ActionButton, Card } from '@/components/ui'
import { usePlan } from '@/features/catalog/useCatalog'
import { ExerciseFigures } from '@/features/figures/ExerciseFigures'
import { FigureView } from '@/features/figures/FigureView'
import { useFigure } from '@/features/figures/useFigure'
import { loadPreviousResults, saveSession } from '@/features/logbook/db'
import type { SetResult } from '@/features/logbook/db'
import { useSettings } from '@/features/settings/settingsStore'
import { SetInputSheet } from '@/features/workout/SetInputSheet'
import type { SetInputValues } from '@/features/workout/SetInputSheet'
import { cue, primeWorkoutAudio, signal } from '@/features/workout/cues'
import { buildSteps, formatClock, remainingSeconds, resultKey } from '@/features/workout/steps'
import type { WorkoutStep } from '@/features/workout/steps'
import { useTicker } from '@/features/workout/useTicker'
import { useWorkout } from '@/features/workout/workoutStore'
import { releaseWakeLock, requestWakeLock } from '@/lib/wakeLock'

function CountdownRing({
  remainingMs,
  totalMs,
  caption,
  compact = false,
}: {
  remainingMs: number
  totalMs: number
  caption: string
  compact?: boolean
}) {
  const ratio = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0
  const circumference = 2 * Math.PI * 45

  return (
    <div className={`relative mx-auto aspect-square ${compact ? 'w-40' : 'w-56'}`}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r="45" className="fill-none stroke-surface-hi" strokeWidth="6" />
        <circle
          cx="50"
          cy="50"
          r="45"
          className="fill-none stroke-accent transition-[stroke-dashoffset] duration-200 ease-linear"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`font-semibold tabular-nums ${compact ? 'text-4xl' : 'text-5xl'}`}
        >
          {formatClock(remainingMs / 1000)}
        </span>
        <span className="mt-1 text-xs uppercase tracking-wider text-fg-faint">{caption}</span>
      </div>
    </div>
  )
}

function TargetLine({ step }: { step: WorkoutStep }) {
  const target =
    step.exercise.mode === 'time'
      ? `${step.set.durationSec} s`
      : `${step.set.reps} Wiederholungen`
  const weight = step.set.targetWeightKg != null ? ` · ${step.set.targetWeightKg} kg` : ''

  return (
    <p className="text-center text-xl font-semibold">
      {target}
      <span className="font-normal text-fg-muted">{weight}</span>
    </p>
  )
}

function NextUp({ step }: { step: WorkoutStep | undefined }) {
  const { figure } = useFigure(step?.exercise.exerciseId ?? null)

  if (!step) {
    return <p className="text-center text-sm text-fg-muted">Danach ist Schluss.</p>
  }

  return (
    <div className="flex items-center justify-center gap-3">
      {figure ? (
        <FigureView figure={figure} pose="start" className="size-12 rounded-lg bg-surface-hi" />
      ) : null}
      <div className="text-left">
        <p className="text-[11px] uppercase tracking-wider text-fg-faint">Als Nächstes</p>
        <p className="text-sm font-medium">{step.exercise.name}</p>
        <p className="text-xs text-fg-muted">
          Satz {step.setIndex + 1}/{step.setCount} ·{' '}
          {step.exercise.mode === 'time' ? `${step.set.durationSec} s` : `${step.set.reps} Wdh`}
        </p>
      </div>
    </div>
  )
}

export function WorkoutPage() {
  const { planId } = useParams()
  const navigate = useNavigate()
  const { plan, loading } = usePlan(planId)

  const active = useWorkout((state) => state.active)
  const training = useSettings((state) => state.training)

  const [previous, setPrevious] = useState<Map<string, SetResult>>(new Map())
  const savedRef = useRef(false)

  const steps = useMemo(() => (plan ? buildSteps(plan) : []), [plan])
  const step = active ? steps[active.stepIndex] : undefined
  const nextStep = active ? steps[active.stepIndex + 1] : undefined

  const phase = active?.phase
  const endsAt = active?.endsAt ?? null
  const running = Boolean(active) && phase !== 'done'
  const now = useTicker(running)

  useEffect(() => {
    void loadPreviousResults().then(setPrevious)
  }, [])

  // Display wachhalten. iOS gibt die Sperre beim Wechsel in den Hintergrund frei,
  // deshalb wird sie beim Zurückkommen neu angefordert.
  useEffect(() => {
    if (!running || !training.keepScreenAwake) return

    void requestWakeLock()
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void requestWakeLock()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      void releaseWakeLock()
    }
  }, [running, training.keepScreenAwake])

  const advance = () => {
    const state = useWorkout.getState()
    const current = state.active
    if (!current) return

    const nextIndex = current.stepIndex + 1
    if (nextIndex >= steps.length) {
      state.finish()
      return
    }

    state.goToStep(nextIndex)
    const upcoming = steps[nextIndex]!
    state.beginWork(upcoming.exercise.mode === 'time' ? (upcoming.set.durationSec ?? null) : null)
  }

  // Ablaufende Zeiten: Zielzeitpunkt steht fest, hier werden nur die Cues geplant.
  useEffect(() => {
    if (!endsAt || (phase !== 'rest' && phase !== 'work')) return

    const finishPhase = () => {
      if (phase === 'work') {
        cue('Pause')
        useWorkout.getState().finishWork()
      } else {
        cue('Weitermachen')
        advance()
      }
    }

    const delay = endsAt - Date.now()
    if (delay <= 0) {
      finishPhase()
      return
    }

    const timers = [window.setTimeout(finishPhase, delay)]
    const warnMs = training.countdownFromSec * 1000
    if (warnMs > 0 && delay > warnMs) {
      timers.push(window.setTimeout(signal, delay - warnMs))
    }

    return () => timers.forEach(window.clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, endsAt, training.countdownFromSec])

  // Training abgeschlossen: einmalig ins Logbuch schreiben.
  useEffect(() => {
    if (phase !== 'done' || savedRef.current || !plan || !active) return
    savedRef.current = true

    void saveSession({
      sessionId: active.sessionId,
      planId: active.planId,
      planTitle: active.planTitle,
      startedAt: new Date(active.startedAt).toISOString(),
      endedAt: new Date(active.endedAt ?? Date.now()).toISOString(),
      durationSec: Math.round(((active.endedAt ?? Date.now()) - active.startedAt) / 1000),
      completed: true,
      results: active.results,
    })
  }, [phase, plan, active])

  if (loading) {
    return <p className="mt-16 text-center text-sm text-fg-muted">Lädt …</p>
  }

  if (!plan || steps.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Card className="p-6 text-center text-sm text-fg-muted">Plan nicht gefunden.</Card>
      </div>
    )
  }

  if (active && active.planId !== planId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Card className="space-y-4 p-6 text-center">
          <p className="text-sm">
            „{active.planTitle}“ läuft noch. Erst beenden oder verwerfen, dann kann ein neues
            Training starten.
          </p>
          <div className="flex justify-center gap-2">
            <ActionButton
              variant="primary"
              onClick={() => navigate(`/workout/${active.planId}`, { replace: true })}
            >
              Fortsetzen
            </ActionButton>
            <ActionButton variant="danger" onClick={() => useWorkout.getState().discard()}>
              Verwerfen
            </ActionButton>
          </div>
        </Card>
      </div>
    )
  }

  const startWorkout = async () => {
    await primeWorkoutAudio()
    const state = useWorkout.getState()
    state.start(plan.id, plan.title)
    const first = steps[0]!
    state.beginWork(first.exercise.mode === 'time' ? (first.set.durationSec ?? null) : null)
  }

  const abort = async () => {
    const current = useWorkout.getState().active
    const keep = current && current.results.length > 0

    if (!window.confirm(keep ? 'Training beenden und Fortschritt speichern?' : 'Training abbrechen?')) {
      return
    }

    if (keep && current) {
      await saveSession({
        sessionId: current.sessionId,
        planId: current.planId,
        planTitle: current.planTitle,
        startedAt: new Date(current.startedAt).toISOString(),
        endedAt: new Date().toISOString(),
        durationSec: Math.round((Date.now() - current.startedAt) / 1000),
        completed: false,
        results: current.results,
      })
    }

    useWorkout.getState().discard()
    void releaseWakeLock()
    navigate(`/plan/${plan.id}`, { replace: true })
  }

  if (!active) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">{plan.title}</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {steps.length} Sätze · etwa {plan.estimatedDurationMin} Minuten
          </p>
        </div>

        <Card className="p-4 text-sm text-fg-muted">
          Das Display bleibt während des Trainings an. Ansagen mischen sich mit deiner Musik.
        </Card>

        <ActionButton
          variant="primary"
          onClick={() => void startWorkout()}
          className="w-full py-4 text-base"
        >
          Los geht’s
        </ActionButton>

        <button type="button" onClick={() => navigate(-1)} className="text-sm text-fg-muted">
          Zurück
        </button>
      </div>
    )
  }

  const completedSets = active.results.length
  const progress = completedSets / steps.length
  const elapsedSec = (now - active.startedAt) / 1000
  const leftSec = remainingSeconds(steps, active.stepIndex)

  if (phase === 'done') {
    const volume = active.results.reduce(
      (total, result) => total + (result.reps ?? 0) * (result.weightKg ?? 0),
      0,
    )

    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-4">
        <div className="text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent/15">
            <Check size={32} className="text-accent" aria-hidden />
          </div>
          <h1 className="mt-4 text-2xl font-semibold">Geschafft</h1>
          <p className="mt-1 text-sm text-fg-muted">{active.planTitle}</p>
        </div>

        <Card className="grid grid-cols-3 divide-x divide-line text-center">
          <div className="py-4">
            <p className="text-xl font-semibold tabular-nums">
              {Math.round(((active.endedAt ?? Date.now()) - active.startedAt) / 60000)}
            </p>
            <p className="text-[11px] text-fg-faint">Minuten</p>
          </div>
          <div className="py-4">
            <p className="text-xl font-semibold tabular-nums">{completedSets}</p>
            <p className="text-[11px] text-fg-faint">Sätze</p>
          </div>
          <div className="py-4">
            <p className="text-xl font-semibold tabular-nums">{Math.round(volume)}</p>
            <p className="text-[11px] text-fg-faint">kg Volumen</p>
          </div>
        </Card>

        <ActionButton
          variant="primary"
          onClick={() => {
            useWorkout.getState().discard()
            navigate('/logbook', { replace: true })
          }}
          className="w-full py-4 text-base"
        >
          Ins Logbuch
        </ActionButton>
      </div>
    )
  }

  if (!step) return null

  const previousResult = previous.get(resultKey(step.exercise.exerciseId, step.setIndex))
  const previousLabel = previousResult
    ? [
        previousResult.reps != null ? `${previousResult.reps} Wdh` : null,
        previousResult.durationSec != null ? `${previousResult.durationSec} s` : null,
        previousResult.weightKg ? `${previousResult.weightKg} kg` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : null

  const submit = (values: SetInputValues) => {
    const state = useWorkout.getState()

    state.submitResult({
      exerciseId: step.exercise.exerciseId,
      exerciseName: step.exercise.name,
      setIndex: step.setIndex,
      reps: values.reps,
      durationSec: values.durationSec,
      weightKg: values.weightKg,
      at: new Date().toISOString(),
    })

    const isLast = state.active!.stepIndex === steps.length - 1
    if (isLast) {
      state.finish()
      return
    }

    if (step.restSec > 0) {
      state.startRest(step.restSec)
      return
    }

    advance()
  }

  const remainingMs = endsAt ? Math.max(0, endsAt - now) : 0

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="pad-safe-top border-b border-line px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] uppercase tracking-wider text-fg-faint">
              {step.blockTitle}
              {step.rounds > 1 ? ` · Runde ${step.round}/${step.rounds}` : ''}
            </p>
            <h1 className="truncate text-lg font-semibold">{step.exercise.name}</h1>
          </div>
          <span className="shrink-0 rounded-full bg-surface-hi px-2.5 py-1 text-xs tabular-nums text-fg-muted">
            Satz {step.setIndex + 1}/{step.setCount}
          </span>
          <button
            type="button"
            aria-label="Training beenden"
            onClick={() => void abort()}
            className="-mr-2 flex size-9 shrink-0 items-center justify-center rounded-full text-fg-muted active:bg-surface"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="mx-auto mt-2 h-1 max-w-lg overflow-hidden rounded-full bg-surface-hi">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 px-4 py-4">
        {phase === 'rest' ? (
          <>
            <CountdownRing
              remainingMs={remainingMs}
              totalMs={active.plannedRestSec * 1000}
              caption="Pause"
            />
            <NextUp step={nextStep} />
            <div className="flex justify-center gap-2">
              <ActionButton onClick={() => useWorkout.getState().extendRest(30)}>
                <span className="flex items-center gap-1">
                  <Plus size={16} aria-hidden />
                  30 s
                </span>
              </ActionButton>
              <ActionButton
                variant="primary"
                onClick={() => {
                  cue('Weitermachen')
                  advance()
                }}
              >
                <span className="flex items-center gap-1">
                  <SkipForward size={16} aria-hidden />
                  Weiter
                </span>
              </ActionButton>
            </div>
          </>
        ) : (
          <>
            <ExerciseFigures exerciseId={step.exercise.exerciseId} size="lg" />

            {step.exercise.mode === 'time' && endsAt ? (
              <CountdownRing
                remainingMs={remainingMs}
                totalMs={(step.set.durationSec ?? 1) * 1000}
                caption="Halten"
                compact
              />
            ) : (
              <TargetLine step={step} />
            )}

            {step.exercise.tempo ? (
              <p className="text-center text-xs text-fg-faint">Tempo {step.exercise.tempo}</p>
            ) : null}

            {step.exercise.cues.length > 0 ? (
              <ul className="space-y-1 text-center text-sm text-fg-muted">
                {step.exercise.cues.map((hint) => (
                  <li key={hint}>{hint}</li>
                ))}
              </ul>
            ) : null}

            {previousLabel ? (
              <p className="text-center text-xs text-fg-faint">Letztes Mal: {previousLabel}</p>
            ) : null}
          </>
        )}
      </main>

      <footer className="pad-safe-bottom border-t border-line px-4 py-3">
        <div className="mx-auto max-w-lg space-y-3">
          {phase !== 'rest' ? (
            <ActionButton
              variant="primary"
              onClick={() => useWorkout.getState().finishWork()}
              className="flex w-full items-center justify-center gap-2 py-4 text-base"
            >
              <Check size={20} aria-hidden />
              Satz erledigt
            </ActionButton>
          ) : null}

          <dl className="flex items-center justify-between text-xs text-fg-muted">
            <div className="flex items-center gap-1.5">
              <Clock size={14} aria-hidden />
              <dt className="sr-only">Vergangen</dt>
              <dd className="tabular-nums">{Math.floor(elapsedSec / 60)} min gelaufen</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <ChevronRight size={14} aria-hidden />
              <dt className="sr-only">Verbleibend</dt>
              <dd className="tabular-nums">noch etwa {Math.ceil(leftSec / 60)} min</dd>
            </div>
          </dl>
        </div>
      </footer>

      {phase === 'input' ? (
        <SetInputSheet
          step={step}
          previousLabel={previousLabel}
          weightStepKg={training.weightStepKg}
          defaults={{
            reps: previousResult?.reps ?? step.set.reps ?? 0,
            durationSec: previousResult?.durationSec ?? step.set.durationSec ?? 0,
            weightKg: previousResult?.weightKg ?? step.set.targetWeightKg ?? 0,
          }}
          onSubmit={submit}
          onCancel={() => {
            const state = useWorkout.getState()
            state.beginWork(
              step.exercise.mode === 'time' ? (step.set.durationSec ?? null) : null,
            )
          }}
        />
      ) : null}
    </div>
  )
}
