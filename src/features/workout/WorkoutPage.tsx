import {
  Check,
  Clock,
  FastForward,
  Flame,
  PartyPopper,
  Plus,
  SkipForward,
  Sparkles,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { TouchEvent as ReactTouchEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { ActionButton, Card } from '@/components/ui'
import { Confetti } from '@/components/Confetti'
import { usePlan } from '@/features/catalog/useCatalog'
import { AnimatedFigure } from '@/features/figures/AnimatedFigure'
import { MusicBar } from '@/features/music/MusicBar'
import { loadPreviousResults, saveSession } from '@/features/logbook/db'
import type { SetResult, WorkoutSession } from '@/features/logbook/db'
import { useSessions } from '@/features/logbook/useSessions'
import { sendHealthWorkout } from '@/features/health/healthExport'
import { useSettings } from '@/features/settings/settingsStore'
import { adviseSet, analyseSession } from '@/features/workout/advice'
import { buildCoachPrompt, formatDelta } from '@/features/workout/coachPrompt'
import { cue, primeWorkoutAudio, signal } from '@/features/workout/cues'
import { buildSteps, formatClock, remainingSeconds, resultKey } from '@/features/workout/steps'
import type { WorkoutStep } from '@/features/workout/steps'
import { useTicker } from '@/features/workout/useTicker'
import { nextWeight } from '@/features/workout/weights'
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

/** Große Tasten, damit die Eingabe zwischen zwei Sätzen mit einem Daumen klappt. */
function InlineStepper({
  label,
  value,
  onStep,
}: {
  label: string
  value: number
  onStep: (direction: 1 | -1) => void
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs uppercase tracking-wider text-fg-faint">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`${label} verringern`}
          onClick={() => onStep(-1)}
          className="size-16 shrink-0 rounded-2xl bg-surface-hi text-3xl leading-none text-fg-muted active:bg-line"
        >
          −
        </button>
        <output className="min-w-20 text-center text-4xl font-semibold tabular-nums">{value}</output>
        <button
          type="button"
          aria-label={`${label} erhöhen`}
          onClick={() => onStep(1)}
          className="size-16 shrink-0 rounded-2xl bg-surface-hi text-3xl leading-none text-fg-muted active:bg-line"
        >
          +
        </button>
      </div>
    </div>
  )
}

function NextUp({ step }: { step: WorkoutStep | undefined }) {
  if (!step) {
    return <p className="text-center text-sm text-fg-muted">Danach ist Schluss.</p>
  }

  return (
    <div className="flex items-center justify-center gap-3">
      <AnimatedFigure
        exerciseId={step.exercise.exerciseId}
        timing={step.exercise.timing}
        className="size-16 shrink-0"
      />
      <div className="text-left">
        <p className="text-[11px] uppercase tracking-wider text-fg-faint">Als Nächstes</p>
        <p className="text-sm font-medium">{step.exercise.name}</p>
        <p className="text-xs text-fg-muted">
          Satz {step.setIndex + 1}/{step.setCount} ·{' '}
          {step.exercise.mode === 'time' ? `${step.set.durationSec} s` : `${step.set.reps} Wdh`}
        </p>
        {step.exercise.setup ? (
          <p className="text-xs text-warn">{step.exercise.setup}</p>
        ) : null}
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
  const health = useSettings((state) => state.connections.health)
  const bodyWeightKg = useSettings((state) => state.profile.bodyWeightKg)

  const [previous, setPrevious] = useState<Map<string, SetResult>>(new Map())
  const [askAbort, setAskAbort] = useState(false)
  const [reps, setReps] = useState(0)
  const [weightKg, setWeightKg] = useState(0)
  const [shared, setShared] = useState(false)
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
    const last = previous.get(resultKey(inputStep.exercise.exerciseId, inputStep.setIndex))
    setReps(last?.reps ?? inputStep.set.reps ?? 0)
    setWeightKg(last?.weightKg ?? inputStep.set.targetWeightKg ?? 0)
  }, [inputStep?.key, previous])

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
  const elapsedSec = (now - active.startedAt) / 1000
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

    const share = () => {
      const session = sessionRef.current
      if (!session) return

      const text = buildCoachPrompt(session, plan, analysis)

      if (navigator.share) {
        void navigator.share({ title: 'fitti Training', text }).catch(() => undefined)
        return
      }

      void navigator.clipboard
        ?.writeText(text)
        .then(() => setShared(true))
        .catch(() => undefined)
    }

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

            {analysis.better.length === 0 && analysis.worse.length === 0 ? (
              <p className="text-sm text-fg-muted">Alles auf dem Niveau vom letzten Mal.</p>
            ) : null}

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

        <ActionButton onClick={share} className="flex w-full items-center justify-center gap-2 py-3">
          <Sparkles size={18} aria-hidden />
          {shared ? 'In die Zwischenablage kopiert' : 'Analyse anfordern'}
        </ActionButton>

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
      <ul className="space-y-1 text-center text-sm text-fg-muted">
        {step.exercise.cues.map((hint) => (
          <li key={hint}>{hint}</li>
        ))}
      </ul>
    ) : null

  const titleBlock = (
    <div className="text-center">
      <h1 className="truncate text-lg font-semibold">{step.exercise.name}</h1>
      {step.exercise.setup ? (
        <p className="truncate text-xs text-warn">{step.exercise.setup}</p>
      ) : null}
      {step.rounds > 1 ? (
        <p className="text-[11px] uppercase tracking-wider text-fg-faint">
          Runde {step.round}/{step.rounds}
        </p>
      ) : null}
    </div>
  )

  // Empfehlung aus dem letzten Ergebnis desselben Satzes.
  const suggestion = inputStep
    ? adviseSet(inputStep, previous.get(resultKey(inputStep.exercise.exerciseId, inputStep.setIndex)))
    : { advice: 'unknown' as const, text: '' }

  const suggestionNote = suggestion.text ? (
    <p
      className={`text-center text-xs ${
        suggestion.advice === 'increase'
          ? 'text-accent'
          : suggestion.advice === 'decrease'
            ? 'text-warn'
            : 'text-fg-muted'
      }`}
    >
      {suggestion.text}
    </p>
  ) : null

  return (
    <div className="flex min-h-app flex-col">
      {/*
        Der Übungsname steht über der Animation, nicht hier oben: In der Pause
        wäre er wertlos, und während des Satzes gehört er zur Figur.
      */}
      <header className="pad-safe-top border-b border-line px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <SegmentedProgress
            groups={progressGroups}
            stateOf={stepStateOf}
            className="min-w-0 flex-1"
          />

          <button
            type="button"
            aria-label="Training beenden"
            onClick={() => setAskAbort(true)}
            className="-mr-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-danger/15 text-danger active:opacity-70"
          >
            <X size={20} aria-hidden />
          </button>
        </div>
      </header>

      <main
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="mx-auto flex w-full max-w-lg flex-1 touch-pan-y flex-col justify-center gap-3 px-4 py-3"
      >
        {ready ? (
          <>
            {titleBlock}

            <AnimatedFigure
              exerciseId={step.exercise.exerciseId}
              timing={step.exercise.timing}
              className="mx-auto w-full max-w-[min(52%,30dvh)]"
            />

            <div className="text-center">
              <p className="text-[11px] uppercase tracking-wider text-fg-faint">Los geht’s mit</p>
              <p className="mt-0.5 text-sm text-fg-muted">
                Satz {step.setIndex + 1}/{step.setCount} ·{' '}
                {isTime ? `${step.set.durationSec} s` : `${step.set.reps} Wdh`}
                {step.exercise.usesWeight && step.set.targetWeightKg != null
                  ? ` · ${step.set.targetWeightKg} kg`
                  : ''}
              </p>
            </div>

            {suggestionNote}
            {cueList}
          </>
        ) : phase === 'rest' ? (
          <>
            {/* Doppelter Abstand zur Uhr, damit Vorschau und Pause klar getrennt sind. */}
            <div className="mb-3">
              <NextUp step={nextStep} />
            </div>

            <CountdownRing
              remainingMs={remainingMs}
              totalMs={active.plannedRestSec * 1000}
              caption="Pause"
              compact
            />

            {/* Gewicht schon in der Pause einstellen, dann steht es beim Start. */}
            {nextStep?.exercise.usesWeight ? (
              <InlineStepper
                label="kg"
                value={weightKg}
                onStep={(direction) =>
                  setWeightKg(
                    nextWeight(weightKg, direction, nextStep.exercise, training.weightStepKg),
                  )
                }
              />
            ) : null}

            {suggestionNote}

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

            {canDefer ? (
              <div className="flex justify-center">
                <ActionButton variant="warn" onClick={deferExercise}>
                  <span className="flex items-center gap-1.5">
                    <FastForward size={16} aria-hidden />
                    Überspringen
                  </span>
                </ActionButton>
              </div>
            ) : null}
          </>
        ) : (
          <>
            {titleBlock}

            <AnimatedFigure
              exerciseId={step.exercise.exerciseId}
              timing={step.exercise.timing}
              className="mx-auto w-full max-w-[min(52%,30dvh)]"
            />

            {isTime && endsAt ? (
              <CountdownRing
                remainingMs={remainingMs}
                totalMs={(step.set.durationSec ?? 1) * 1000}
                caption="Halten"
                compact
              />
            ) : null}

            {isTime && !endsAt ? (
              <p className="text-center text-2xl font-semibold tabular-nums">Zeit um</p>
            ) : null}

            <div className="flex flex-col items-center gap-2">
              {isTime ? null : (
                <InlineStepper
                  label="Wdh"
                  value={reps}
                  onStep={(direction) => setReps(Math.max(0, Math.min(500, reps + direction)))}
                />
              )}
              {step.exercise.usesWeight ? (
                <InlineStepper
                  label="kg"
                  value={weightKg}
                  onStep={(direction) =>
                    setWeightKg(
                      nextWeight(weightKg, direction, step.exercise, training.weightStepKg),
                    )
                  }
                />
              ) : null}
            </div>

            {suggestionNote}
            {cueList}
          </>
        )}
      </main>

      <footer className="pad-safe-bottom border-t border-line px-4 py-3">
        <div className="mx-auto max-w-lg space-y-3">
          {ready ? (
            <div className="flex gap-2">
              <ActionButton
                variant="primary"
                onClick={ignite}
                className="flex flex-1 items-center justify-center gap-2 py-4 text-base"
              >
                <Flame size={20} aria-hidden />
                Zündung
              </ActionButton>

              {canDefer ? (
                <ActionButton
                  variant="warn"
                  onClick={deferExercise}
                  className="flex shrink-0 items-center gap-1.5 px-3 py-4"
                >
                  <FastForward size={18} aria-hidden />
                  Überspringen
                </ActionButton>
              ) : null}
            </div>
          ) : phase !== 'rest' ? (
            <div className="flex gap-2">
              <ActionButton
                variant="primary"
                onClick={submit}
                className="flex flex-1 items-center justify-center gap-2 py-4 text-base"
              >
                <Check size={20} aria-hidden />
                Fertig
              </ActionButton>

              {canDefer ? (
                <ActionButton
                  variant="warn"
                  onClick={deferExercise}
                  className="flex shrink-0 items-center gap-1.5 px-3 py-4"
                >
                  <FastForward size={18} aria-hidden />
                  Überspringen
                </ActionButton>
              ) : null}
            </div>
          ) : null}

          <p className="flex items-center justify-center gap-1.5 text-xs text-fg-muted">
            <Clock size={14} aria-hidden />
            <span className="tabular-nums">
              {/* Gleich gerundet wie in den Plandetails, sonst stehen dort zwei Zahlen. */}
              {Math.floor(elapsedSec / 60)} von {Math.round((elapsedSec + leftSec) / 60)} min
            </span>
          </p>

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
