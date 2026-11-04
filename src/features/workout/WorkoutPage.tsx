import {
  ArrowDown,
  ArrowUp,
  Check,
  Clock,
  FastForward,
  Flame,
  Info,
  Minus,
  PartyPopper,
  Plus,
  SkipForward,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, TouchEvent as ReactTouchEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { ActionButton, Card } from '@/components/ui'
import { Confetti } from '@/components/Confetti'
import { usePlan } from '@/features/catalog/useCatalog'
import { AnimatedFigure } from '@/features/figures/AnimatedFigure'
import { MusicBar } from '@/features/music/MusicBar'
import { AnalysisButton } from '@/features/workout/AnalysisButton'
import { loadPreviousResults, saveSession } from '@/features/logbook/db'
import type { SetResult, WorkoutSession } from '@/features/logbook/db'
import { useSessions } from '@/features/logbook/useSessions'
import { sendHealthWorkout } from '@/features/health/healthExport'
import { useSettings } from '@/features/settings/settingsStore'
import { adviseSet, analyseSession } from '@/features/workout/advice'
import type { Advice } from '@/features/workout/advice'
import { buildCoachPrompt, formatDelta } from '@/features/workout/coachPrompt'
import { cue, primeWorkoutAudio, signal } from '@/features/workout/cues'
import { buildSteps, formatClock, remainingSeconds } from '@/features/workout/steps'
import type { WorkoutStep } from '@/features/workout/steps'
import { useTicker } from '@/features/workout/useTicker'
import { nextWeight } from '@/features/workout/weights'
import { useWorkout } from '@/features/workout/workoutStore'
import { releaseWakeLock, requestWakeLock } from '@/lib/wakeLock'

function CountdownRing({
  remainingMs,
  totalMs,
  caption,
  urgent = false,
  className = '',
  action,
}: {
  remainingMs: number
  totalMs: number
  caption: string
  /** Letzte Sekunden: Ring und Zahl in Warnfarbe, passend zum Signalton. */
  urgent?: boolean
  className?: string
  /** Sitzt auf dem unteren Rand des Rings, damit innen nur die Zeit steht. */
  action?: ReactNode
}) {
  const ratio = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0
  const circumference = 2 * Math.PI * 45

  return (
    <div className={`countdown-ring relative aspect-square shrink-0 ${className}`}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r="45" className="fill-none stroke-surface-hi" strokeWidth="6" />
        <circle
          cx="50"
          cy="50"
          r="45"
          className={`countdown-progress fill-none ${urgent ? 'stroke-warn' : 'stroke-accent'}`}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`countdown-time font-semibold tabular-nums transition-colors duration-200 ${urgent ? 'text-warn' : 'text-fg'}`}
        >
          {formatClock(remainingMs / 1000)}
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wider text-fg-faint">
          {caption}
        </span>
      </div>
      {action ? (
        <div className="absolute inset-x-0 bottom-0 flex translate-y-1/2 justify-center">
          {action}
        </div>
      ) : null}
    </div>
  )
}

type StepState = 'done' | 'current' | 'deferred' | 'pending'

const STEP_COLORS: Record<StepState, string> = {
  done: 'bg-accent',
  current: 'bg-accent/45',
  deferred: 'bg-warn',
  pending: 'bg-surface-hi',
}

/**
 * Ein Segment je Übung, darin ein Strich je Satz – immer in Planreihenfolge.
 * Verschobene Sätze bleiben an ihrem Platz und werden gelb markiert, damit der
 * Balken beim Umsortieren nicht zerfällt.
 */
function SegmentedProgress({
  groups,
  stateOf,
  className = '',
}: {
  groups: { key: string; stepKeys: string[] }[]
  stateOf: (stepKey: string) => StepState
  className?: string
}) {
  return (
    <div className={`mx-auto flex max-w-lg gap-1.5 ${className}`} aria-hidden>
      {groups.map((group) => (
        <div key={group.key} className="flex flex-1 gap-0.5">
          {group.stepKeys.map((stepKey) => (
            <span
              key={stepKey}
              className={`h-6 flex-1 rounded-full transition-colors ${STEP_COLORS[stateOf(stepKey)]}`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Große Tasten an den Rändern, die Zahl mit Einheit dazwischen: so klappt die
 * Eingabe zwischen zwei Sätzen mit einem Daumen.
 */
function ValueStepper({
  label,
  value,
  onStep,
  compact = false,
}: {
  /** Einheit, zugleich Name der Tasten: „Wdh“ oder „kg“. */
  label: string
  value: number
  onStep: (direction: 1 | -1) => void
  compact?: boolean
}) {
  const button = `workout-step-button flex shrink-0 items-center justify-center rounded-xl bg-surface-hi text-fg transition-colors hover:bg-line active:bg-line ${
    compact ? 'workout-step-button-compact' : ''
  }`

  return (
    <div
      className={`flex items-center gap-2 ${
        compact ? 'w-full' : 'workout-stepper-row px-2 py-1.5 not-first:border-t not-first:border-line'
      }`}
    >
      <button
        type="button"
        aria-label={`${label} verringern`}
        onClick={() => onStep(-1)}
        className={button}
      >
        <Minus size={20} aria-hidden />
      </button>
      <p className="flex min-w-0 flex-1 items-baseline justify-center gap-1">
        <output className={`font-semibold tabular-nums ${compact ? 'text-2xl' : 'text-3xl'}`}>
          {value.toLocaleString('de-DE')}
        </output>
        <span className="text-sm font-medium text-fg-muted">{label}</span>
      </p>
      <button
        type="button"
        aria-label={`${label} erhöhen`}
        onClick={() => onStep(1)}
        className={button}
      >
        <Plus size={20} aria-hidden />
      </button>
    </div>
  )
}

function targetLabel(step: WorkoutStep): string {
  return step.exercise.mode === 'time' ? `${step.set.durationSec} s` : `${step.set.reps} Wdh`
}

/** Maschineneinstellung und Satzhinweis: beides braucht man beim Einstellen. */
function ExerciseChips({ step }: { step: WorkoutStep }) {
  const { setup } = step.exercise
  const { note } = step.set
  if (!setup && !note) return null

  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {setup ? (
        <span className="inline-flex items-center gap-1.5 rounded-2xl bg-surface-hi px-2.5 py-1 text-xs font-medium text-fg">
          <SlidersHorizontal size={12} aria-hidden className="shrink-0 text-fg-muted" />
          {setup}
        </span>
      ) : null}
      {note ? (
        <span className="inline-flex items-center gap-1.5 rounded-2xl bg-surface-hi px-2.5 py-1 text-xs text-fg-muted">
          <Info size={12} aria-hidden className="shrink-0" />
          {note}
        </span>
      ) : null}
    </div>
  )
}

/** Empfehlung als Fußzeile der Fläche, deren Gewicht sie betrifft. */
function RecommendationStrip({
  advice,
  value,
  text,
}: {
  advice: Advice
  value: string
  text: string
}) {
  const tone =
    advice === 'increase'
      ? 'bg-accent/10 text-accent'
      : advice === 'decrease'
        ? 'bg-warn/10 text-warn'
        : 'bg-surface-hi text-fg'
  const label = advice === 'increase' ? 'HOCH' : advice === 'decrease' ? 'RUNTER' : 'HALTEN'
  const Icon = advice === 'increase' ? ArrowUp : advice === 'decrease' ? ArrowDown : Minus

  return (
    <div
      role="note"
      aria-label="Trainingsempfehlung"
      data-testid="workout-recommendation"
      className={`workout-advice flex items-center gap-3 border-t border-line px-3 py-2.5 ${tone}`}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-current/15">
        <Icon size={18} aria-hidden />
      </span>
      <p className="min-w-0 leading-snug">
        <span className="block text-sm font-bold">
          {label} · {value}
        </span>
        <span className="block text-xs text-fg/75">{text}</span>
      </p>
    </div>
  )
}

/**
 * Vorschau in der Pause: Name, Satz und Einstellung direkt über der
 * Bewegung. Bewusst ohne Rahmen, sonst stünde die Bühne der Figur in einer
 * zweiten Karte.
 */
function NextUp({ step }: { step: WorkoutStep }) {
  return (
    <section aria-label="Als Nächstes" className="next-preview">
      <div className="space-y-1.5 text-center">
        <div>
          <h2 className="text-balance text-lg font-semibold leading-tight tracking-tight">
            {step.exercise.name}
          </h2>
          <p className="mt-0.5 text-sm tabular-nums text-fg-muted">
            Als Nächstes · Satz {step.setIndex + 1} von {step.setCount} · {targetLabel(step)}
          </p>
        </div>
        <ExerciseChips step={step} />
      </div>
      <AnimatedFigure
        exerciseId={step.exercise.exerciseId}
        timing={step.exercise.timing}
        fill
        className="rest-preview-figure workout-figure"
      />
    </section>
  )
}

export function WorkoutPage() {
  const { planId } = useParams()
  const navigate = useNavigate()
  const { plan, loading } = usePlan(planId)

  const active = useWorkout((state) => state.active)
  const training = useSettings((state) => state.training)
  const health = useSettings((state) => state.connections.health)
  const bodyWeightKg = useSettings((state) => state.profile.bodyWeightKg)

  const [previous, setPrevious] = useState<Map<string, SetResult[]>>(new Map())
  const [askAbort, setAskAbort] = useState(false)
  const [reps, setReps] = useState(0)
  const [weightKg, setWeightKg] = useState(0)
  const sessions = useSessions((state) => state.sessions)
  const savedRef = useRef(false)
  const sessionRef = useRef<WorkoutSession | null>(null)
  // Muss vor allen vorzeitigen Rückgaben stehen, sonst bricht React ab, sobald
  // der Abschlussbildschirm erscheint.
  const swipeStart = useRef<{ x: number; y: number } | null>(null)

  const steps = useMemo(() => (plan ? buildSteps(plan) : []), [plan])

  // Die Reihenfolge lebt im Store, damit eine belegte Station nach hinten wandern kann.
  const orderedSteps = useMemo(() => {
    if (steps.length === 0) return []
    const byKey = new Map(steps.map((entry) => [entry.key, entry]))
    const fromOrder = (active?.order ?? [])
      .map((key) => byKey.get(key))
      .filter((entry): entry is WorkoutStep => entry !== undefined)
    return fromOrder.length === steps.length ? fromOrder : steps
  }, [steps, active?.order])

  const step = active ? orderedSteps[active.stepIndex] : undefined
  const nextStep = active ? orderedSteps[active.stepIndex + 1] : undefined

  // Aufeinanderfolgende Sätze derselben Übung bilden ein Segment des Balkens.
  // Bewusst über den Plan, nicht über die Warteschlange.
  const progressGroups = useMemo(() => {
    const groups: { key: string; stepKeys: string[] }[] = []

    steps.forEach((entry) => {
      const key = `${entry.blockIndex}-${entry.exerciseIndex}-${entry.round}`
      const last = groups.at(-1)
      if (last && last.key === key) last.stepKeys.push(entry.key)
      else groups.push({ key, stepKeys: [entry.key] })
    })

    return groups
  }, [steps])

  const queuePosition = useMemo(
    () => new Map((active?.order ?? []).map((key, index) => [key, index])),
    [active?.order],
  )

  const phase = active?.phase
  const endsAt = active?.endsAt ?? null
  const running = Boolean(active) && phase !== 'done'
  const now = useTicker(running)

  /**
   * Satz, auf den sich die Eingabefelder beziehen. In der Pause ist das bereits
   * der nächste – so lässt sich das Gewicht einstellen, während man sitzt, und
   * der Wert bleibt beim Weitermachen erhalten.
   */
  const inputStep = phase === 'rest' ? nextStep : step

  useEffect(() => {
    void loadPreviousResults().then(setPrevious)
  }, [])

  // Aeltere oder fremde Staende ohne gueltige Reihenfolge auf den Plan zuruecksetzen.
  useEffect(() => {
    if (!active || steps.length === 0) return
    if (active.planOrder?.length === steps.length && active.order?.length === steps.length) return
    useWorkout.getState().setOrder(steps.map((entry) => entry.key))
  }, [active, steps])

  // Eingabefelder auf den Vorschlagswert des anstehenden Satzes setzen.
  useEffect(() => {
    if (!inputStep) return
    const lastSets = previous.get(inputStep.exercise.exerciseId)
    const last = lastSets?.find((result) => result.setIndex === inputStep.setIndex)
    const recommendation = adviseSet(inputStep, lastSets, training.weightStepKg)
    setReps(recommendation.recommendedReps ?? last?.reps ?? inputStep.set.reps ?? 0)
    setWeightKg(
      recommendation.recommendedWeightKg ?? last?.weightKg ?? inputStep.set.targetWeightKg ?? 0,
    )
  }, [inputStep, previous, training.weightStepKg])

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
    if (nextIndex >= orderedSteps.length) {
      state.finish()
      return
    }

    state.goToStep(nextIndex)
    const upcoming = orderedSteps[nextIndex]!
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

    const session: WorkoutSession = {
      sessionId: active.sessionId,
      planId: active.planId,
      planTitle: active.planTitle,
      startedAt: new Date(active.startedAt).toISOString(),
      endedAt: new Date(active.endedAt ?? Date.now()).toISOString(),
      durationSec: Math.round(((active.endedAt ?? Date.now()) - active.startedAt) / 1000),
      completed: true,
      results: active.results,
      metValue: plan.metValue,
      avgHeartRateBpm: plan.avgHeartRateBpm,
    }

    sessionRef.current = session

    void saveSession(session).then(() => {
      void useSessions.getState().load()

      if (health.autoExport === 'on' && health.state === 'connected') {
        useWorkout.getState().discard()
        sendHealthWorkout(session, health.shortcutName, bodyWeightKg, '/logbook')
      }
    })
  }, [phase, plan, active, health, bodyWeightKg])

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
    state.start(plan.id, plan.title, steps.map((entry) => entry.key))
  }

  const leaveWorkout = async (keepProgress: boolean) => {
    const current = useWorkout.getState().active

    if (keepProgress && current && current.results.length > 0) {
      await saveSession({
        sessionId: current.sessionId,
        planId: current.planId,
        planTitle: current.planTitle,
        startedAt: new Date(current.startedAt).toISOString(),
        endedAt: new Date().toISOString(),
        durationSec: Math.round((Date.now() - current.startedAt) / 1000),
        completed: false,
        results: current.results,
        metValue: plan.metValue,
        avgHeartRateBpm: plan.avgHeartRateBpm,
      })
    }

    useWorkout.getState().discard()
    void releaseWakeLock()
    navigate(keepProgress ? '/logbook' : `/plan/${plan.id}`, { replace: true })
  }

  if (!active) {
    // Nur erreichbar, wenn jemand direkt auf diese Adresse springt. Der normale
    // Weg startet das Training bereits in der Plan-Detailansicht.
    return (
      <div className="mx-auto flex min-h-app max-w-lg flex-col justify-center gap-6 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">{plan.title}</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {steps.length} Sätze · etwa {plan.estimatedDurationMin} Minuten
          </p>
        </div>

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
  const elapsedSec = phase === 'ready' ? 0 : Math.max(0, (now - active.startedAt) / 1000)
  const leftSec = remainingSeconds(orderedSteps, active.stepIndex)

  if (phase === 'done') {
    const volume = active.results.reduce(
      (total, result) => total + (result.reps ?? 0) * (result.weightKg ?? 0),
      0,
    )

    // Letztes abgeschlossenes Training desselben Plans als Vergleich.
    const earlier = sessions
      .filter(
        (entry) =>
          entry.completed && entry.planId === active.planId && entry.sessionId !== active.sessionId,
      )
      .sort((a, b) => b.endedAt.localeCompare(a.endedAt))[0]

    const analysis = analyseSession(active.results, earlier?.results ?? null)

    return (
      <div className="mx-auto flex min-h-app max-w-lg flex-col justify-center gap-5 px-4 py-6">
        <Confetti />

        <div className="text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent/15">
            <PartyPopper size={32} className="text-accent" aria-hidden />
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

        {analysis.hasComparison ? (
          <Card className="space-y-2 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-faint">
              Gegenüber dem letzten Mal
            </h2>

            {analysis.better.map((entry) => (
              <p key={entry.exerciseId} className="flex justify-between gap-3 text-sm">
                <span className="truncate">{entry.exerciseName}</span>
                <span className="shrink-0 font-semibold text-accent">
                  {formatDelta(entry.deltaPercent)}
                </span>
              </p>
            ))}

            {analysis.worse.map((entry) => (
              <p key={entry.exerciseId} className="flex justify-between gap-3 text-sm">
                <span className="truncate">{entry.exerciseName}</span>
                <span className="shrink-0 font-semibold text-warn">
                  {formatDelta(entry.deltaPercent)}
                </span>
              </p>
            ))}

            {/* Unveränderte und neue Übungen bleiben sichtbar, sonst fehlt der Überblick. */}
            {analysis.unchanged.map((entry) => (
              <p key={entry.exerciseId} className="flex justify-between gap-3 text-sm">
                <span className="truncate text-fg-muted">{entry.exerciseName}</span>
                <span className="shrink-0 font-semibold text-fg-faint">± 0 %</span>
              </p>
            ))}

            {analysis.fresh.map((entry) => (
              <p key={entry.exerciseId} className="flex justify-between gap-3 text-sm">
                <span className="truncate text-fg-muted">{entry.exerciseName}</span>
                <span className="shrink-0 text-fg-faint">neu</span>
              </p>
            ))}
          </Card>
        ) : (
          <p className="text-center text-sm text-fg-muted">
            Beim nächsten Mal vergleicht fitti dieses Training mit dem heutigen.
          </p>
        )}

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

        <AnalysisButton
          buildPrompt={() =>
            sessionRef.current ? buildCoachPrompt(sessionRef.current, plan, analysis) : ''
          }
        />

        {health.autoExport === 'ask' && health.state === 'connected' && sessionRef.current ? (
          <ActionButton
            onClick={() => {
              const session = sessionRef.current
              if (!session) return
              useWorkout.getState().discard()
              sendHealthWorkout(session, health.shortcutName, bodyWeightKg, '/logbook')
            }}
            className="w-full py-3"
          >
            An Apple Health senden
          </ActionButton>
        ) : null}
      </div>
    )
  }

  if (!step) return null

  const isTime = step.exercise.mode === 'time'
  const plannedSec = step.set.durationSec ?? 0

  const submit = () => {
    const state = useWorkout.getState()

    // Bei Zeitübungen zählt, was tatsächlich gehalten wurde – auch bei frühem Abbruch.
    const heldSec = endsAt
      ? Math.max(0, Math.round(plannedSec - Math.max(0, endsAt - Date.now()) / 1000))
      : plannedSec

    state.submitResult({
      exerciseId: step.exercise.exerciseId,
      exerciseName: step.exercise.name,
      setIndex: step.setIndex,
      reps: isTime ? null : reps,
      durationSec: isTime ? heldSec : null,
      weightKg: step.exercise.usesWeight ? weightKg : null,
      at: new Date().toISOString(),
    })

    const isLast = state.active!.stepIndex === orderedSteps.length - 1
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

  // Während der Pause betrifft das Verschieben die nächste Übung, sonst die laufende.
  const resting = phase === 'rest'
  const ready = phase === 'ready'
  const deferTarget = resting ? nextStep : step
  const deferFrom = resting ? active.stepIndex + 1 : active.stepIndex

  const deferKeys = deferTarget
    ? orderedSteps
        .slice(deferFrom)
        .filter(
          (entry) =>
            entry.blockIndex === deferTarget.blockIndex &&
            entry.exerciseIndex === deferTarget.exerciseIndex,
        )
        .map((entry) => entry.key)
    : []

  const canDefer =
    deferTarget !== undefined && orderedSteps.length - deferFrom > deferKeys.length

  // Gegenstück: die zuletzt ans Ende geschobene Übung wieder nach vorn holen.
  const recallTarget =
    orderedSteps.length - 1 > deferFrom ? orderedSteps[orderedSteps.length - 1] : undefined

  const recallKeys = recallTarget
    ? orderedSteps
        .slice(deferFrom)
        .filter(
          (entry) =>
            entry.blockIndex === recallTarget.blockIndex &&
            entry.exerciseIndex === recallTarget.exerciseIndex,
        )
        .map((entry) => entry.key)
    : []

  const canRecall =
    recallTarget !== undefined &&
    (active.deferred ?? []).includes(recallTarget.key) &&
    !recallKeys.includes(deferTarget?.key ?? '')

  // In der Pause gilt der gerade beendete Satz bereits als erledigt.
  const doneUpTo = resting ? active.stepIndex + 1 : active.stepIndex

  const stepStateOf = (stepKey: string): StepState => {
    const position = queuePosition.get(stepKey)
    if (position === undefined) return 'pending'
    if (position < doneUpTo) return 'done'
    if (position === doneUpTo) return 'current'
    return active.deferred?.includes(stepKey) ? 'deferred' : 'pending'
  }

  /**
   * Nach dem Umsortieren steht an der aktuellen Stelle ein anderer Satz. In der
   * Pause läuft der Timer weiter und in der Startansicht wurde noch nicht
   * begonnen – dort ändert sich nur die Vorschau.
   */
  const restartCurrentStep = () => {
    if (resting || ready) return

    const current = useWorkout.getState().active
    if (!current) return

    const byKey = new Map(steps.map((entry) => [entry.key, entry]))
    const upcoming = byKey.get(current.order[current.stepIndex] ?? '')
    useWorkout
      .getState()
      .beginWork(upcoming?.exercise.mode === 'time' ? (upcoming.set.durationSec ?? null) : null)
  }

  const deferExercise = () => {
    useWorkout.getState().deferSteps(deferKeys)
    restartCurrentStep()
  }

  const recallExercise = () => {
    useWorkout.getState().recallSteps(recallKeys, deferFrom)
    restartCurrentStep()
  }

  // Wischen als Abkürzung: nach links die Übung nach hinten schieben, nach
  // rechts die zuletzt geschobene zurückholen. Die Knöpfe tun dasselbe.
  const onTouchStart = (event: ReactTouchEvent) => {
    const touch = event.touches[0]
    swipeStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null
  }

  const onTouchEnd = (event: ReactTouchEvent) => {
    const start = swipeStart.current
    swipeStart.current = null

    const touch = event.changedTouches[0]
    if (!start || !touch) return

    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y

    // Nur eindeutig waagerechte, ausreichend lange Bewegungen zählen.
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return

    if (dx < 0) {
      if (canDefer) deferExercise()
    } else if (canRecall) {
      recallExercise()
    }
  }

  /** Startet den anstehenden Satz aus der Startansicht heraus. */
  const ignite = () => {
    void primeWorkoutAudio()
    useWorkout.getState().beginWork(isTime ? (step.set.durationSec ?? null) : null)
  }

  const cueList =
    step.exercise.cues.length > 0 ? (
      <ul className="space-y-0.5 text-center text-[13px] leading-snug text-fg-muted">
        {step.exercise.cues.map((hint) => (
          <li key={hint} className="text-balance">
            {hint}
          </li>
        ))}
      </ul>
    ) : null

  const exerciseHeading = (
    <div className="space-y-1.5 text-center">
      <div>
        <h1 className="text-balance text-xl font-semibold leading-tight tracking-tight">
          {step.exercise.name}
        </h1>
        <p className="mt-0.5 text-sm tabular-nums text-fg-muted">
          Satz {step.setIndex + 1} von {step.setCount}
          {step.rounds > 1 ? ` · Runde ${step.round} von ${step.rounds}` : ''}
        </p>
      </div>
      <ExerciseChips step={step} />
    </div>
  )

  // Empfehlung aus allen Sätzen des jüngsten Trainings dieser Übung.
  const suggestion = inputStep
    ? adviseSet(inputStep, previous.get(inputStep.exercise.exerciseId), training.weightStepKg)
    : {
        advice: 'unknown' as const,
        recommendedWeightKg: null,
        recommendedReps: null,
        text: '',
      }
  const recommendationValue = inputStep?.exercise.usesWeight
    ? suggestion.recommendedWeightKg == null
      ? ''
      : `${suggestion.recommendedWeightKg.toLocaleString('de-DE')} kg`
    : suggestion.recommendedReps == null
      ? ''
      : `${suggestion.recommendedReps} Wdh`
  const recommendation =
    suggestion.text && recommendationValue ? (
      <RecommendationStrip
        advice={suggestion.advice}
        value={recommendationValue}
        text={suggestion.text}
      />
    ) : null

  // Farbe und Signalton kündigen das Ende gleichzeitig an.
  const urgent =
    endsAt !== null &&
    training.countdownFromSec > 0 &&
    remainingMs <= training.countdownFromSec * 1000

  // Ziel und Erfassung des laufenden Satzes, direkt über dem Hauptknopf.
  const setSurface = (
    <section
      aria-label="Satz erfassen"
      className="overflow-hidden rounded-2xl border border-line bg-surface"
    >
      {isTime ? (
        <div className="flex min-h-16 items-center justify-center p-3">
          {ready ? (
            <p className="flex items-baseline gap-1.5">
              <span className="text-3xl font-semibold tabular-nums">{plannedSec}</span>
              <span className="text-sm font-medium text-fg-muted">s halten</span>
            </p>
          ) : endsAt ? (
            <CountdownRing
              remainingMs={remainingMs}
              totalMs={Math.max(1, plannedSec) * 1000}
              caption="Halten"
              urgent={urgent}
              className="hold-ring"
            />
          ) : (
            <p className="text-2xl font-semibold">Zeit um</p>
          )}
        </div>
      ) : (
        <ValueStepper
          label="Wdh"
          value={reps}
          onStep={(direction) => setReps(Math.max(0, Math.min(500, reps + direction)))}
        />
      )}
      {step.exercise.usesWeight ? (
        <ValueStepper
          label="kg"
          value={weightKg}
          onStep={(direction) =>
            setWeightKg(nextWeight(weightKg, direction, step.exercise, training.weightStepKg))
          }
        />
      ) : null}
      {recommendation}
    </section>
  )

  // Pausenuhr und Gewicht des nächsten Satzes, an derselben Stelle wie die Satzfläche.
  const restSurface = (
    <section aria-label="Pause" className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex items-center justify-center gap-3 p-3">
        <CountdownRing
          remainingMs={remainingMs}
          totalMs={active.plannedRestSec * 1000}
          caption="Pause"
          urgent={urgent}
          className="rest-ring"
          action={
            <button
              type="button"
              onClick={() => useWorkout.getState().extendRest(30)}
              className="rest-extend inline-flex items-center gap-0.5 rounded-full bg-surface-hi px-3 text-sm font-semibold text-fg ring-4 ring-surface transition-colors hover:bg-line active:bg-line"
            >
              <Plus size={14} aria-hidden />
              30 s
            </button>
          }
        />

        {/* Gewicht schon in der Pause einstellen, dann steht es beim Start. */}
        {nextStep?.exercise.usesWeight ? (
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <p className="text-xs font-medium text-fg-muted">
              Gewicht für Satz {nextStep.setIndex + 1}
            </p>
            <ValueStepper
              compact
              label="kg"
              value={weightKg}
              onStep={(direction) =>
                setWeightKg(
                  nextWeight(weightKg, direction, nextStep.exercise, training.weightStepKg),
                )
              }
            />
          </div>
        ) : null}
      </div>
      {recommendation}
    </section>
  )

  const continueAfterRest = () => {
    cue('Weitermachen')
    advance()
  }

  // Der Hauptknopf steht in jeder Phase an derselben Stelle.
  const primaryAction = ready
    ? { label: 'Zündung', icon: <Flame size={20} aria-hidden />, onClick: ignite }
    : resting
      ? { label: 'Weiter', icon: <SkipForward size={20} aria-hidden />, onClick: continueAfterRest }
      : { label: 'Fertig', icon: <Check size={20} aria-hidden />, onClick: submit }

  return (
    <div className="workout-shell flex min-h-app flex-col">
      {/*
        Der Übungsname steht über der Animation, nicht hier oben: In der Pause
        wäre er wertlos, und während des Satzes gehört er zur Figur.
      */}
      <header className="border-b border-line px-4 pb-3">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <SegmentedProgress groups={progressGroups} stateOf={stepStateOf} />
            <p className="mt-1.5 flex items-center justify-between gap-3 text-[11px] font-medium tabular-nums text-fg-muted">
              <span>
                {completedSets} von {orderedSteps.length} Sätzen
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} aria-hidden />
                {/* Gleich gerundet wie in den Plandetails, sonst stehen dort zwei Zahlen. */}
                {Math.floor(elapsedSec / 60)} von {Math.round((elapsedSec + leftSec) / 60)} min
              </span>
            </p>
          </div>

          <button
            type="button"
            aria-label="Training beenden"
            onClick={() => setAskAbort(true)}
            className="-mr-1 flex size-11 shrink-0 items-center justify-center rounded-full bg-danger/15 text-danger active:opacity-70"
          >
            <X size={20} aria-hidden />
          </button>
        </div>
      </header>

      {/*
        Oben steht, was zu tun ist, unten, was zu erfassen ist – direkt über dem
        Hauptknopf. Die Figur bekommt den Platz dazwischen.
      */}
      <main
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="workout-main mx-auto w-full max-w-lg flex-1 touch-pan-y px-4 py-3"
      >
        {resting ? (
          <div className="workout-view" data-phase="rest">
            {nextStep ? (
              <NextUp step={nextStep} />
            ) : (
              <p className="text-center text-sm text-fg-muted">Danach ist Schluss.</p>
            )}
            {restSurface}
          </div>
        ) : (
          <div className="workout-view" data-phase={ready ? 'ready' : 'work'}>
            <div className="workout-what">
              {exerciseHeading}
              <AnimatedFigure
                exerciseId={step.exercise.exerciseId}
                timing={step.exercise.timing}
                fill
                className="workout-active-figure workout-figure"
              />
              {cueList}
            </div>
            {setSurface}
          </div>
        )}
      </main>

      <footer className="border-t border-line px-4 pt-3">
        <div className="mx-auto max-w-lg space-y-3">
          <div className="flex gap-2">
            <ActionButton
              variant="primary"
              onClick={primaryAction.onClick}
              className="flex flex-1 items-center justify-center gap-2 py-4 text-base"
            >
              {primaryAction.icon}
              {primaryAction.label}
            </ActionButton>

            {canDefer ? (
              <ActionButton
                variant="warn"
                onClick={deferExercise}
                className="workout-skip flex shrink-0 items-center justify-center gap-1.5 px-3 py-4"
              >
                <FastForward size={18} aria-hidden />
                <span className="workout-skip-label">Überspringen</span>
              </ActionButton>
            ) : null}
          </div>

          <MusicBar />
        </div>
      </footer>

      {askAbort ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <button
            type="button"
            aria-label="Zurück zum Training"
            onClick={() => setAskAbort(false)}
            className="absolute inset-0 bg-black/70"
          />
          <div className="pad-safe-bottom relative space-y-3 rounded-t-3xl border-t border-line bg-surface px-4 pb-4 pt-5">
            <h2 className="text-center text-lg font-semibold">Training beenden?</h2>
            <p className="text-center text-sm text-fg-muted">
              {completedSets === 0
                ? 'Es ist noch kein Satz erfasst.'
                : completedSets === 1
                  ? `1 von ${orderedSteps.length} Sätzen ist geschafft.`
                  : `${completedSets} von ${orderedSteps.length} Sätzen sind geschafft.`}
            </p>

            <ActionButton
              variant="primary"
              disabled={completedSets === 0}
              onClick={() => void leaveWorkout(true)}
              className="w-full py-3.5 text-base"
            >
              Speichern und beenden
            </ActionButton>
            <ActionButton
              variant="danger"
              onClick={() => void leaveWorkout(false)}
              className="w-full py-3"
            >
              Ohne Speichern verwerfen
            </ActionButton>
            <ActionButton onClick={() => setAskAbort(false)} className="w-full py-3">
              Weiter trainieren
            </ActionButton>
          </div>
        </div>
      ) : null}
    </div>
  )
}
