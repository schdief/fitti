import type { WorkoutSession } from '@/features/logbook/db'
import type { SessionAnalysis } from '@/features/workout/advice'
import type { Plan } from '@/lib/plan/schema'

/**
 * Baut einen Text, den man einem Sprachmodell zum Bewerten geben kann. Enthält
 * den Plan, alle Sätze und die Veränderung gegenüber dem letzten Mal – ohne
 * diese Bezugsgrößen wäre jede Rückmeldung geraten.
 */
export function buildCoachPrompt(
  session: WorkoutSession,
  plan: Plan | null,
  analysis: SessionAnalysis,
): string {
  const lines: string[] = []

  lines.push(
    'Du bist ein erfahrener Kraftsport-Coach. Bewerte das folgende Training und sage mir',
    'konkret, bei welchen Übungen ich beim nächsten Mal mehr Gewicht nehmen sollte, wo ich',
    'das Gewicht halten und wo ich reduzieren sollte. Begründe kurz und nenne Zahlen.',
    '',
    `Plan: ${session.planTitle}`,
  )

  if (plan?.description) lines.push(`Beschreibung: ${plan.description}`)
  if (plan) {
    lines.push(
      `Level: ${plan.level} · Zielmuskeln: ${plan.targetMuscles.join(', ')}`,
      `Equipment: ${plan.equipment.join(', ')}`,
    )
  }

  lines.push(
    `Datum: ${new Date(session.startedAt).toLocaleString('de-DE')}`,
    `Dauer: ${Math.round(session.durationSec / 60)} Minuten`,
    `Sätze erfasst: ${session.results.length}`,
    session.completed ? 'Training vollständig abgeschlossen.' : 'Training vorzeitig beendet.',
    '',
    'Sätze (Übung, Satznummer, Wiederholungen, Gewicht):',
  )

  for (const result of session.results) {
    const parts = [
      result.exerciseName,
      `Satz ${result.setIndex + 1}`,
      result.reps != null ? `${result.reps} Wdh` : null,
      result.durationSec != null ? `${result.durationSec} s` : null,
      result.weightKg != null ? `${result.weightKg} kg` : 'ohne Zusatzgewicht',
    ].filter(Boolean)

    lines.push(`- ${parts.join(' · ')}`)
  }

  if (plan) {
    lines.push('', 'Vorgaben laut Plan:')
    for (const block of plan.blocks) {
      for (const exercise of block.exercises) {
        const targets = exercise.sets
          .map((set) =>
            [
              exercise.mode === 'time' ? `${set.durationSec} s` : `${set.reps} Wdh`,
              set.targetWeightKg != null ? `${set.targetWeightKg} kg` : null,
            ]
              .filter(Boolean)
              .join(' '),
          )
          .join(' / ')

        lines.push(`- ${exercise.name}: ${targets}`)
      }
    }
  }

  lines.push('', `Gesamtvolumen dieses Trainings: ${Math.round(analysis.totalVolume)}`)

  if (analysis.hasComparison && analysis.previousVolume != null) {
    lines.push(`Gesamtvolumen letztes Mal: ${Math.round(analysis.previousVolume)}`)

    if (analysis.better.length > 0) {
      lines.push(
        'Besser als letztes Mal: ' +
          analysis.better
            .map((entry) => `${entry.exerciseName} ${formatDelta(entry.deltaPercent)}`)
            .join(', '),
      )
    }

    if (analysis.worse.length > 0) {
      lines.push(
        'Schwächer als letztes Mal: ' +
          analysis.worse
            .map((entry) => `${entry.exerciseName} ${formatDelta(entry.deltaPercent)}`)
            .join(', '),
      )
    }
  } else {
    lines.push('Es gibt noch kein früheres Training dieses Plans zum Vergleich.')
  }

  return lines.join('\n')
}

export function formatDelta(percent: number): string {
  const rounded = Math.round(percent)
  return `${rounded > 0 ? '+' : ''}${rounded} %`
}
