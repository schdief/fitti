import { Trash2 } from 'lucide-react'

import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui'
import { AudioSpike } from '@/features/lab/AudioSpike'
import { ShortcutSpike } from '@/features/lab/ShortcutSpike'
import { SpotifySpike } from '@/features/lab/SpotifySpike'
import { TimerSpike } from '@/features/lab/TimerSpike'
import { useLabLog } from '@/features/lab/labLog'
import type { LogLevel } from '@/features/lab/labLog'

const levelColor: Record<LogLevel, string> = {
  info: 'text-fg-muted',
  ok: 'text-accent',
  warn: 'text-warn',
  error: 'text-danger',
}

export function LabPage() {
  const entries = useLabLog((state) => state.entries)
  const clear = useLabLog((state) => state.clear)

  const copyLog = () => {
    const text = entries
      .map((entry) => `${new Date(entry.at).toISOString()} [${entry.level}] ${entry.message}`)
      .reverse()
      .join('\n')
    void navigator.clipboard?.writeText(text).catch(() => undefined)
  }

  return (
    <div className="min-h-dvh">
      <PageHeader
        title="Diagnose"
        subtitle="Spikes für Audio, Timer, Health und Spotify"
        back
        action={
          <button
            type="button"
            aria-label="Protokoll leeren"
            onClick={clear}
            className="-mr-2 flex size-10 items-center justify-center rounded-full text-fg-muted active:bg-surface"
          >
            <Trash2 size={20} aria-hidden />
          </button>
        }
      />

      <div className="pad-safe-bottom mx-auto max-w-lg space-y-4 px-4 py-4">
        <AudioSpike />
        <TimerSpike />
        <ShortcutSpike />
        <SpotifySpike />

        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-faint">
              Protokoll
            </h2>
            <button type="button" onClick={copyLog} className="text-xs text-accent">
              Kopieren
            </button>
          </div>

          <Card className="divide-y divide-line">
            {entries.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-fg-muted">Noch keine Einträge.</p>
            ) : (
              entries.map((entry) => (
                <p key={entry.id} className="px-4 py-2 text-xs">
                  <time className="mr-2 tabular-nums text-fg-faint">
                    {new Date(entry.at).toLocaleTimeString('de-DE')}
                  </time>
                  <span className={`break-words ${levelColor[entry.level]}`}>{entry.message}</span>
                </p>
              ))
            )}
          </Card>
        </section>
      </div>
    </div>
  )
}
