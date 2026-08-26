import { useCallback, useEffect, useRef, useState } from 'react'

import { spotify } from '@/lib/spotify/api'
import type { PlaybackState } from '@/lib/spotify/api'
import { readTokens } from '@/lib/spotify/auth'

const POLL_INTERVAL_MS = 5000

export interface PlayerSnapshot {
  connected: boolean
  hasDevice: boolean
  isPlaying: boolean
  progressMs: number
  durationMs: number
  title: string
  artist: string
  deviceName: string | null
  error: string | null
}

const idle: PlayerSnapshot = {
  connected: false,
  hasDevice: false,
  isPlaying: false,
  progressMs: 0,
  durationMs: 0,
  title: '',
  artist: '',
  deviceName: null,
  error: null,
}

/**
 * Spotify liefert den Fortschritt nur beim Abruf. Zwischen den Abfragen wird er
 * lokal hochgezählt, damit der Balken flüssig läuft, ohne das Rate Limit zu reißen.
 */
export function useSpotifyPlayer(enabled: boolean) {
  const [snapshot, setSnapshot] = useState<PlayerSnapshot>(idle)
  const anchor = useRef({ progressMs: 0, at: Date.now(), isPlaying: false })

  const apply = useCallback((state: PlaybackState | null) => {
    if (!state) {
      setSnapshot({ ...idle, connected: true, error: null })
      return
    }

    anchor.current = {
      progressMs: state.progress_ms ?? 0,
      at: Date.now(),
      isPlaying: state.is_playing,
    }

    setSnapshot({
      connected: true,
      hasDevice: state.device !== null,
      isPlaying: state.is_playing,
      progressMs: state.progress_ms ?? 0,
      durationMs: state.item?.duration_ms ?? 0,
      title: state.item?.name ?? '',
      artist: state.item?.artists.map((entry) => entry.name).join(', ') ?? '',
      deviceName: state.device?.name ?? null,
      error: null,
    })
  }, [])

  const refresh = useCallback(async () => {
    if (!readTokens()) {
      setSnapshot(idle)
      return
    }

    try {
      apply(await spotify.playbackState())
    } catch (cause) {
      setSnapshot((previous) => ({
        ...previous,
        connected: true,
        error: cause instanceof Error ? cause.message : 'Fehler',
      }))
    }
  }, [apply])

  useEffect(() => {
    if (!enabled) return

    void refresh()
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, POLL_INTERVAL_MS)

    return () => window.clearInterval(id)
  }, [enabled, refresh])

  /** Aktuelle Position inklusive lokaler Hochrechnung. */
  const interpolatedProgress = (now: number) =>
    anchor.current.isPlaying
      ? Math.min(snapshot.durationMs, anchor.current.progressMs + (now - anchor.current.at))
      : anchor.current.progressMs

  const run = async (action: () => Promise<unknown>, optimistic?: Partial<PlayerSnapshot>) => {
    if (optimistic) setSnapshot((previous) => ({ ...previous, ...optimistic }))

    try {
      await action()
    } catch (cause) {
      setSnapshot((previous) => ({
        ...previous,
        error: cause instanceof Error ? cause.message : 'Fehler',
      }))
    }

    // Spotify braucht einen Moment, bis der neue Zustand abrufbar ist.
    window.setTimeout(() => void refresh(), 600)
  }

  return {
    snapshot,
    interpolatedProgress,
    refresh,
    play: () => run(spotify.play, { isPlaying: true }),
    pause: () => run(spotify.pause, { isPlaying: false }),
    next: () => run(spotify.next),
    previous: () => run(spotify.previous),
    seek: (positionMs: number) => {
      anchor.current = { ...anchor.current, progressMs: positionMs, at: Date.now() }
      setSnapshot((previous) => ({ ...previous, progressMs: positionMs }))
      return run(() => spotify.seek(positionMs))
    },
  }
}
