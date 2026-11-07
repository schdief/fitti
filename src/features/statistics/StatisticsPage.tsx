import { Activity, ChartColumn, Clock, Flame, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { PageHeader } from '@/components/PageHeader'
import { ActionButton, Card, SegmentedControl } from '@/components/ui'
import type { WorkoutSession } from '@/features/logbook/db'
import { useSessions } from '@/features/logbook/useSessions'
import {
  aggregateVolume,
  calculateStatistics,
  volumeBucketLabel,
  weekLabel,
} from '@/features/statistics/statistics'
import type { TrainingWeek, VolumePeriod } from '@/features/statistics/statistics'

const decimal = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const integer = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 })

function formatVolume(volumeKg: number): string {
  return volumeKg >= 10_000
    ? `${decimal.format(volumeKg / 1000)} t`
    : `${integer.format(volumeKg)} kg`
}

function Metric({
  title,
  value,
  hint,
  Icon,
  active = false,
}: {
  title: string
  value: string
  hint: string
  Icon: LucideIcon
  active?: boolean
}) {
  return (
    <Card className="min-w-0 p-4">
      <Icon size={20} className={`mb-3 ${active ? 'text-danger' : 'text-accent'}`} aria-hidden />
      <dl>
        <dt className="break-words text-xs leading-relaxed text-fg-muted">{title}</dt>
        <dd className={`mt-1 text-3xl font-semibold tracking-tight tabular-nums ${active ? 'text-danger' : ''}`}>{value}</dd>
      </dl>
      <p className={`mt-1 text-xs ${active ? 'font-medium text-danger' : 'text-fg-faint'}`}>{hint}</p>
    </Card>
  )
}

function WeeklyChart({ weeks }: { weeks: TrainingWeek[] }) {
  const [metric, setMetric] = useState<'count' | 'hours'>('count')
  const values = weeks.map((week) => metric === 'count' ? week.count : week.durationSec / 3600)
  const maximum = Math.max(1, Math.ceil(Math.max(...values)))
  const total = values.reduce((sum, value) => sum + value, 0)
  const label = metric === 'count' ? 'Trainingseinheiten' : 'Trainingsstunden'
  return (
    <Card className="space-y-4 p-4">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <ChartColumn size={18} className="text-accent" aria-hidden />
          Deine Trainingswochen
        </h2>
        <p className="mt-1 text-xs text-fg-muted">Letzte 12 Wochen · Montag bis Sonntag</p>
      </div>
      <SegmentedControl label="Diagramm anzeigen" value={metric} onChange={setMetric} options={[
        { value: 'count', label: 'Einheiten' }, { value: 'hours', label: 'Stunden' },
      ]} />
      <p className="text-sm text-fg-muted">
        <span className="font-semibold text-fg">{metric === 'count' ? integer.format(total) : decimal.format(total)}</span>
        {' '}{metric === 'count' ? (total === 1 ? 'Einheit' : 'Einheiten') : (total === 1 ? 'Stunde' : 'Stunden')} in diesem Zeitraum
      </p>

      <div role="img" aria-label={`${label} der letzten zwölf Wochen. Einzelwerte stehen unter Wochendetails.`}>
        <div aria-hidden="true">
          <p className="mb-2 text-right text-[11px] tabular-nums text-fg-faint">{maximum} {metric === 'hours' ? 'h' : (maximum === 1 ? 'Einheit' : 'Einheiten')}</p>
          <div className="relative">
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden>
              {[0, 1, 2].map((line) => <div key={line} className="border-t border-dashed border-line" />)}
            </div>
            <div className="relative grid h-40 grid-cols-12 items-end gap-1.5 border-b border-line">
              {weeks.map((week, index) => (
                <div key={week.startDay} className="flex h-full flex-col justify-end">
                  <div
                    className={`w-full rounded-t-md ${index === weeks.length - 1 ? 'bg-accent' : 'bg-accent/50'}`}
                    style={{ height: `${values[index] / maximum * 100}%`, minHeight: values[index] > 0 ? 3 : 0 }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-fg-faint">
            <span>{weekLabel(weeks[0].startDay)}</span>
            <span>{weekLabel(weeks[5].startDay)}</span>
            <span>Diese Woche</span>
          </div>
        </div>
      </div>
      <details className="border-t border-line pt-2">
        <summary className="cursor-pointer py-3 text-sm text-fg-muted">Wochendetails</summary>
        <table className="w-full text-left text-xs tabular-nums">
          <caption className="sr-only">Training pro Woche in Einheiten und Stunden</caption>
          <thead><tr className="text-fg-muted"><th scope="col" className="py-2 font-medium">Woche ab</th><th scope="col" className="text-right font-medium">Einheiten</th><th scope="col" className="text-right font-medium">Stunden</th></tr></thead>
          <tbody>{[...weeks].reverse().map((week) => (
            <tr key={week.startDay} className="border-t border-line">
              <th scope="row" className="py-2.5 font-normal">{weekLabel(week.startDay)}</th>
              <td className="text-right">{week.count}</td>
              <td className="text-right">{decimal.format(week.durationSec / 3600)}</td>
            </tr>
          ))}</tbody>
        </table>
      </details>
    </Card>
  )
}

function VolumeChart({ sessions, now }: { sessions: WorkoutSession[]; now: Date }) {
  const [period, setPeriod] = useState<VolumePeriod>('day')
  const buckets = useMemo(() => aggregateVolume(sessions, now, period), [sessions, now, period])
  const values = buckets.map((bucket) => bucket.volumeKg)
  const total = values.reduce((sum, value) => sum + value, 0)
  const maximum = Math.max(0, ...values)
  const peakIndex = values.indexOf(maximum)
  const periodLabel = { day: 'Tag', week: 'Woche', month: 'Monat', year: 'Jahr' }[period]
  const detailsLabel = `Volumendetails ${periodLabel}`
  const chartDescription = `kg Volumen pro ${periodLabel}. Einzelwerte stehen unter ${detailsLabel}.`
  const visibleLabels = new Set([0, Math.floor((buckets.length - 1) / 2), buckets.length - 1])

  return (
    <Card className="space-y-4 p-4">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <ChartColumn size={18} className="text-accent" aria-hidden />
          kg Volumen
        </h2>
        <p className="mt-1 text-xs text-fg-muted">
          {period === 'day' ? 'Letzte 14 Tage' : period === 'week' ? 'Letzte 12 Wochen · Montag bis Sonntag' : period === 'month' ? 'Letzte 12 Monate' : 'Seit dem Jahr deines ersten Trainings'}
        </p>
      </div>
      <SegmentedControl
        label="Zeitraum für kg-Volumen"
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'day', label: 'Tag' },
          { value: 'week', label: 'Woche' },
          { value: 'month', label: 'Monat' },
          { value: 'year', label: 'Jahr' },
        ]}
      />
      <p className="text-sm text-fg-muted">
        <span className="font-semibold text-fg">{formatVolume(total)}</span> in diesem Zeitraum
      </p>
      <div role="img" aria-label={chartDescription} className="min-w-0">
        <div className="mb-2 flex justify-between text-[11px] tabular-nums text-fg-faint">
          <span>0 kg</span>
          <span>{formatVolume(maximum)}{maximum > 0 ? ` · ${volumeBucketLabel(buckets[peakIndex]!.startDay, period)}` : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <div
            aria-hidden="true"
            className="relative grid h-36 items-end gap-1 border-b border-line"
            style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))`, minWidth: `${Math.max(buckets.length * 20, 300)}px` }}
          >
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden>
              {[0, 1, 2].map((line) => <div key={line} className="border-t border-dashed border-line" />)}
            </div>
            {buckets.map((bucket, index) => (
              <div key={bucket.startDay} className="relative flex h-full flex-col justify-end">
                <div
                  className={`w-full rounded-t-md ${index === peakIndex && maximum > 0 ? 'bg-accent' : 'bg-accent/50'}`}
                  style={{ height: maximum > 0 ? `${bucket.volumeKg / maximum * 100}%` : 0, minHeight: bucket.volumeKg > 0 ? 3 : 0 }}
                />
              </div>
            ))}
          </div>
          <div
            className="flex justify-between pt-2 text-[10px] text-fg-faint"
            style={{ minWidth: `${Math.max(buckets.length * 20, 300)}px` }}
          >
            {buckets.map((bucket, index) => (
              <span key={bucket.startDay} className="min-w-0">
                {visibleLabels.has(index) ? volumeBucketLabel(bucket.startDay, period) : ''}
              </span>
            ))}
          </div>
        </div>
      </div>
      <details className="border-t border-line pt-2">
        <summary className="cursor-pointer py-3 text-sm text-fg-muted">{detailsLabel}</summary>
        {buckets.length ? (
          <table className="w-full text-left text-xs tabular-nums">
            <caption className="sr-only">kg Volumen pro {periodLabel}</caption>
            <thead>
              <tr className="text-fg-muted">
                <th scope="col" className="py-2 font-medium">{periodLabel}</th>
                <th scope="col" className="text-right font-medium">kg Volumen</th>
              </tr>
            </thead>
            <tbody>{[...buckets].reverse().map((bucket) => (
              <tr key={bucket.startDay} className="border-t border-line">
                <th scope="row" className="py-2.5 font-normal">{volumeBucketLabel(bucket.startDay, period)}</th>
                <td className="text-right">{formatVolume(bucket.volumeKg)}</td>
              </tr>
            ))}</tbody>
          </table>
        ) : <p className="pb-3 text-xs text-fg-muted">Noch keine Trainingsdaten für diesen Zeitraum.</p>}
      </details>
    </Card>
  )
}

export function StatisticsPage() {
  const sessions = useSessions((state) => state.sessions)
  const loaded = useSessions((state) => state.loaded)
  const [now, setNow] = useState(() => new Date())
  const [error, setError] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    let timer = 0
    const refresh = () => {
      setNow(new Date())
      void useSessions.getState().load().then(
        () => { if (active) setError(false) },
        () => { if (active) setError(true) },
      )
      window.clearTimeout(timer)
      const tomorrow = new Date()
      tomorrow.setHours(24, 0, 1, 0)
      timer = window.setTimeout(refresh, tomorrow.getTime() - Date.now())
    }
    const onVisible = () => { if (!document.hidden) refresh() }
    refresh()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      window.clearTimeout(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [reload])

  const stats = useMemo(() => calculateStatistics(sessions, now), [sessions, now])

  return (
    <>
      <PageHeader title="Statistik" subtitle="Dein Training im Überblick" logo />
      <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-4">
        {error ? (
          <Card className="space-y-3 p-4">
            <p className="text-sm text-danger">Das Logbuch konnte nicht geladen werden.</p>
            <ActionButton onClick={() => setReload((value) => value + 1)}>Erneut versuchen</ActionButton>
          </Card>
        ) : !loaded ? (
          <p role="status" className="py-8 text-center text-sm text-fg-muted">Statistik lädt …</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3" aria-label="Trainingskennzahlen">
              <Metric Icon={Activity} title="Trainingseinheiten" value={integer.format(stats.count)} hint="bisher insgesamt" />
              <Metric Icon={Clock} title="Trainingsstunden" value={decimal.format(stats.totalHours)} hint="bisher insgesamt" />
              <Metric Icon={TrendingUp} title="Trainings pro Woche" value={decimal.format(stats.averagePerWeek)} hint="im Durchschnitt" />
              <Metric
                Icon={Flame}
                title="Längster Streak"
                value={integer.format(stats.longestStreak)}
                hint={stats.longestStreakIsCurrent
                  ? 'läuft gerade'
                  : stats.longestStreak === 1 ? 'Trainingseinheit' : 'Trainingseinheiten'}
                active={stats.longestStreakIsCurrent}
              />
            </div>

            {stats.count === 0 ? (
              <p className="rounded-card border border-dashed border-line p-4 text-center text-sm leading-relaxed text-fg-muted">
                Noch keine Trainings gespeichert. Nach deiner ersten Einheit siehst du hier deinen Fortschritt.
              </p>
            ) : null}

            <WeeklyChart weeks={stats.weeks} />
            <VolumeChart sessions={sessions} now={now} />

            <section className="space-y-2 px-1 text-xs leading-relaxed text-fg-muted" aria-label="So wird gerechnet">
              <h2 className="font-semibold text-fg">So wird gerechnet</h2>
              <p>Gezählt werden abgeschlossene Trainings und gespeicherte Teiltrainings mit mindestens einem Satz. Leere Abbrüche zählen nicht.</p>
              {stats.partialCount > 0 ? <p>Enthalten: {stats.partialCount} vorzeitig beendete {stats.partialCount === 1 ? 'Einheit' : 'Einheiten'}.</p> : null}
              <p>Der Wochenschnitt umfasst die Zeit seit deinem ersten Training, einschließlich trainingsfreier Wochen. Die ersten sieben Tage zählen als eine Woche.</p>
              <p>Ein Streak zählt Trainingseinheiten mit höchstens vier trainingsfreien Tagen dazwischen. Beispiel: Montag → Samstag zählt noch zusammen. Dein längster Streak bleibt auch nach einer längeren Pause erhalten.</p>
              <p>Das kg-Volumen summiert Wiederholungen × Trainingsgewicht pro Satz; fehlt ein Gewicht, zählt der Satz mit 0 kg. Tageswerte verwenden den lokalen Kalendertag, Wochen beginnen am Montag.</p>
            </section>
          </>
        )}
      </div>
    </>
  )
}