import { Trash2 } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/PageHeader'
import { ActionButton, Card } from '@/components/ui'
import { sendHealthWorkout } from '@/features/health/healthExport'
import { describeResult, sessionVolume, useSessions } from '@/features/logbook/useSessions'
import { useSettings } from '@/features/settings/settingsStore'
import type { SetResult, WorkoutSession } from '@/features/logbook/db'

/** Jüngstes älteres Ergebnis derselben Übung und Satznummer. */
function findPrevious(
  sessions: WorkoutSession[],
  current: WorkoutSession,
  result: SetResult,
): SetResult | null {
  for (const session of sessions) {
    if (session.startedAt >= current.startedAt) continue
    const hit = session.results.find(
      (entry) => entry.exerciseId === result.exerciseId && entry.setIndex === result.setIndex,
    )
    if (hit) return hit
  }
  return null
}

function Delta({ current, previous }: { current: SetResult; previous: SetResult | null }) {
  if (!previous) return null

  const weightDelta = (current.weightKg ?? 0) - (previous.weightKg ?? 0)
  const countDelta =
    (current.reps ?? current.durationSec ?? 0) - (previous.reps ?? previous.durationSec ?? 0)

  const value = weightDelta !== 0 ? weightDelta : countDelta
  if (value === 0) return <span className="text-xs text-fg-faint">=</span>

  const unit = weightDelta !== 0 ? 'kg' : current.durationSec != null ? 's' : 'Wdh'

  return (
    <span className={`text-xs font-medium ${value > 0 ? 'text-accent' : 'text-warn'}`}>
      {value > 0 ? '+' : ''}
      {Math.round(value * 100) / 100} {unit}
    </span>
  )
}

export function SessionDetailPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { sessions, loaded, load, remove } = useSessions()
  const health = useSettings((state) => state.connections.health)
  const bodyWeightKg = useSettings((state) => state.profile.bodyWeightKg)

  useEffect(() => {
    if (!loaded) void load()
  }, [loaded, load])

  const session = sessions.find((entry) => entry.sessionId === sessionId)

  const byExercise = useMemo(() => {
    if (!session) return []
    const map = new Map<string, { name: string; results: SetResult[] }>()

    for (const result of session.results) {
      const existing = map.get(result.exerciseId)
      if (existing) existing.results.push(result)
      else map.set(result.exerciseId, { name: result.exerciseName, results: [result] })
    }

    return [...map.entries()]
  }, [session])

  if (!loaded) {
    return (
      <>
        <PageHeader title="Training" back />
        <p className="mt-8 text-center text-sm text-fg-muted">Lädt …</p>
      </>
    )
  }

  if (!session) {
    return (
      <>
        <PageHeader title="Training" back />
        <div className="mx-auto max-w-lg px-4 py-4">
          <Card className="p-6 text-center text-sm text-fg-muted">Eintrag nicht gefunden.</Card>
        </div>
      </>
    )
  }

  const started = new Date(session.startedAt)
  const volume = Math.round(sessionVolume(session))

  const onDelete = async () => {
    if (!window.confirm('Diesen Eintrag löschen?')) return
    await remove(session.sessionId)
    navigate('/logbook', { replace: true })
  }

  return (
    <div className="min-h-dvh">
      <PageHeader
        title={session.planTitle}
        subtitle={started.toLocaleString('de-DE', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
        })}
        back
        action={
          <button
            type="button"
            aria-label="Eintrag löschen"
            onClick={() => void onDelete()}
            className="-mr-2 flex size-10 items-center justify-center rounded-full text-danger active:bg-surface"
          >
            <Trash2 size={20} aria-hidden />
          </button>
        }
      />

      <div className="pad-safe-bottom mx-auto max-w-lg space-y-4 px-4 py-4">
        {!session.completed ? (
          <p className="rounded-card bg-warn/10 px-3 py-2 text-xs text-warn">
            Dieses Training wurde vorzeitig beendet.
          </p>
        ) : null}

        <Card className="grid grid-cols-3 divide-x divide-line text-center">
          <div className="py-3">
            <p className="text-lg font-semibold tabular-nums">
              {Math.round(session.durationSec / 60)}
            </p>
            <p className="text-[11px] text-fg-faint">Minuten</p>
          </div>
          <div className="py-3">
            <p className="text-lg font-semibold tabular-nums">{session.results.length}</p>
            <p className="text-[11px] text-fg-faint">Sätze</p>
          </div>
          <div className="py-3">
            <p className="text-lg font-semibold tabular-nums">{volume}</p>
            <p className="text-[11px] text-fg-faint">kg Volumen</p>
          </div>
        </Card>

        {byExercise.map(([exerciseId, group]) => (
          <section key={exerciseId}>
            <h2 className="mb-2 px-1 text-sm font-semibold">{group.name}</h2>
            <Card className="divide-y divide-line">
              {group.results.map((result, index) => (
                <div
                  key={`${result.setIndex}-${index}`}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <span className="w-14 shrink-0 text-xs text-fg-faint">Satz {index + 1}</span>
                  <span className="flex-1 text-[15px] tabular-nums">{describeResult(result)}</span>
                  <Delta current={result} previous={findPrevious(sessions, session, result)} />
                </div>
              ))}
            </Card>
          </section>
        ))}
        {health.state === 'connected' ? (
          <ListRowLike>
            {session.exportedToHealth ? (
              <span className="text-sm text-fg-muted">Bereits an Apple Health übergeben.</span>
            ) : (
              <ActionButton
                onClick={() =>
                  sendHealthWorkout(
                    session,
                    health.shortcutName,
                    bodyWeightKg,
                    `/logbook/${session.sessionId}`,
                  )
                }
                className="w-full py-3"
              >
                An Apple Health senden
              </ActionButton>
            )}
          </ListRowLike>
        ) : null}
      </div>
    </div>
  )
}

function ListRowLike({ children }: { children: React.ReactNode }) {
  return <div className="pt-2">{children}</div>
}
