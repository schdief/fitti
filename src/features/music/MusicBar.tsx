import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useSpotifyPlayer } from '@/features/music/useSpotifyPlayer'
import { useTicker } from '@/features/workout/useTicker'
import { readTokens } from '@/lib/spotify/auth'

function clock(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function ControlButton({
  label,
  onClick,
  children,
  primary = false,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
  primary?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex shrink-0 items-center justify-center rounded-full active:opacity-70 ${
        primary ? 'size-14 bg-accent text-accent-fg' : 'size-12 text-fg-muted'
      }`}
    >
      {children}
    </button>
  )
}

export function MusicBar() {
  const connected = readTokens() !== null
  const { snapshot, interpolatedProgress, play, pause, next, previous, seek } =
    useSpotifyPlayer(connected)

  const [scrubbing, setScrubbing] = useState<number | null>(null)
  const now = useTicker(connected && snapshot.isPlaying, 500)

  if (!connected) {
    return (
      <Link to="/settings" className="block text-center text-xs text-fg-faint">
        Spotify verbinden
      </Link>
    )
  }

  if (!snapshot.hasDevice) {
    return (
      <p className="text-center text-xs text-fg-faint">
        {snapshot.error ?? 'Spotify öffnen und einen Titel starten'}
      </p>
    )
  }

  const position = scrubbing ?? interpolatedProgress(now)
  const played = snapshot.durationMs > 0 ? Math.min(100, (position / snapshot.durationMs) * 100) : 0

  return (
    <div className="space-y-3">
      <p className="truncate text-center text-xs text-fg-muted">
        <span className="text-fg">{snapshot.title}</span>
        {snapshot.artist ? ` · ${snapshot.artist}` : ''}
      </p>

      <div className="flex items-center gap-2">
        <ControlButton label="Vorheriger Titel" onClick={() => void previous()}>
          <SkipBack size={24} aria-hidden />
        </ControlButton>

        <ControlButton
          label={snapshot.isPlaying ? 'Pause' : 'Abspielen'}
          primary
          onClick={() => void (snapshot.isPlaying ? pause() : play())}
        >
          {snapshot.isPlaying ? <Pause size={26} aria-hidden /> : <Play size={26} aria-hidden />}
        </ControlButton>

        <ControlButton label="Nächster Titel" onClick={() => void next()}>
          <SkipForward size={24} aria-hidden />
        </ControlButton>

        <span className="shrink-0 text-[11px] tabular-nums text-accent">{clock(position)}</span>

        <input
          type="range"
          aria-label="Position im Titel"
          min={0}
          max={Math.max(1, snapshot.durationMs)}
          value={Math.min(position, snapshot.durationMs)}
          onChange={(event) => setScrubbing(Number(event.target.value))}
          onPointerUp={() => {
            if (scrubbing !== null) void seek(scrubbing)
            setScrubbing(null)
          }}
          // Der abgespielte Teil wird grün eingefärbt, accent-color allein färbt
          // auf iOS nur den Griff.
          style={{
            background: `linear-gradient(to right, var(--color-accent) ${played}%, var(--color-surface-hi) ${played}%)`,
          }}
          className="h-1.5 min-w-0 flex-1 appearance-none rounded-full accent-accent"
        />

        <span className="shrink-0 text-[11px] tabular-nums text-fg-faint">
          {clock(snapshot.durationMs)}
        </span>
      </div>
    </div>
  )
}
