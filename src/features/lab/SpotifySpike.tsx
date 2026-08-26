import { useState } from 'react'

import { ActionButton, Card, TextField } from '@/components/ui'
import { labLog } from '@/features/lab/labLog'
import { spotify } from '@/lib/spotify/api'
import type { PlaybackState } from '@/lib/spotify/api'
import { clearTokens, getClientId, readTokens, redirectUri, setClientId, startLogin } from '@/lib/spotify/auth'

export function SpotifySpike() {
  const [clientId, setClientIdState] = useState(getClientId())
  const [signedIn, setSignedIn] = useState(readTokens() !== null)
  const [state, setState] = useState<PlaybackState | null>(null)

  const guard = async (name: string, action: () => Promise<unknown>) => {
    try {
      const result = await action()
      labLog('ok', `${name}: ok${result === null ? ' (204)' : ''}`)
    } catch (cause) {
      labLog('error', `${name}: ${cause instanceof Error ? cause.message : String(cause)}`)
    }
  }

  const login = () => {
    if (!clientId.trim()) {
      labLog('error', 'Client-ID fehlt')
      return
    }
    setClientId(clientId)
    labLog('info', `Login startet, redirect_uri=${redirectUri()}`)
    void startLogin(clientId.trim(), '/lab')
  }

  const logout = () => {
    clearTokens()
    setSignedIn(false)
    setState(null)
    labLog('info', 'Tokens gelöscht')
  }

  const loadProfile = () =>
    guard('Profil', async () => {
      const profile = await spotify.me()
      if (profile) {
        labLog(
          profile.product === 'premium' ? 'ok' : 'warn',
          `Angemeldet als ${profile.display_name ?? profile.id}, Produkt: ${profile.product}`,
        )
      }
      setSignedIn(true)
      return profile
    })

  const loadPlayback = () =>
    guard('Player-Status', async () => {
      const playback = await spotify.playbackState()
      setState(playback)
      if (!playback) {
        labLog('warn', 'Kein aktives Gerät. In der Spotify-App kurz etwas abspielen.')
      } else {
        labLog(
          'info',
          `${playback.device?.name ?? 'unbekannt'} · ${playback.item?.name ?? 'kein Titel'} · ${
            playback.is_playing ? 'spielt' : 'pausiert'
          }`,
        )
      }
      return playback
    })

  const seekBy = (deltaMs: number) =>
    guard(`Seek ${deltaMs > 0 ? '+' : ''}${deltaMs / 1000}s`, async () => {
      const playback = state ?? (await spotify.playbackState())
      if (!playback?.item) throw new Error('Kein laufender Titel')
      const target = Math.min(
        playback.item.duration_ms - 1000,
        Math.max(0, (playback.progress_ms ?? 0) + deltaMs),
      )
      return spotify.seek(target)
    })

  return (
    <Card className="space-y-3 p-4 pt-0">
      <TextField
        label="4 · Spotify Client-ID"
        value={clientId}
        onChange={setClientIdState}
        placeholder="aus dem Spotify Developer Dashboard"
      />

      <button
        type="button"
        onClick={() => {
          labLog('info', `Redirect-URI: ${redirectUri()}`)
          void navigator.clipboard?.writeText(redirectUri()).catch(() => undefined)
        }}
        className="w-full rounded-lg bg-surface-hi px-3 py-2 text-left text-xs text-fg-muted"
      >
        Redirect-URI (im Dashboard eintragen, tippen zum Kopieren):
        <span className="mt-0.5 block break-all text-fg">{redirectUri()}</span>
      </button>

      <div className="flex flex-wrap gap-2">
        <ActionButton variant="primary" onClick={login}>
          {signedIn ? 'Neu anmelden' : 'Anmelden'}
        </ActionButton>
        <ActionButton onClick={() => void loadProfile()} disabled={!signedIn}>
          Profil
        </ActionButton>
        <ActionButton onClick={() => void loadPlayback()} disabled={!signedIn}>
          Player-Status
        </ActionButton>
        <ActionButton variant="danger" onClick={logout} disabled={!signedIn}>
          Abmelden
        </ActionButton>
      </div>

      {state?.item ? (
        <div className="rounded-lg bg-surface-hi px-3 py-2 text-xs">
          <p className="truncate text-fg">{state.item.name}</p>
          <p className="truncate text-fg-muted">
            {state.item.artists.map((artist) => artist.name).join(', ')}
          </p>
          <p className="mt-1 tabular-nums text-fg-faint">
            {formatMs(state.progress_ms ?? 0)} / {formatMs(state.item.duration_ms)} ·{' '}
            {state.device?.name ?? 'kein Gerät'}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <ActionButton onClick={() => void guard('Zurück', spotify.previous)} disabled={!signedIn}>
          ⏮
        </ActionButton>
        <ActionButton onClick={() => void guard('Play', spotify.play)} disabled={!signedIn}>
          ▶
        </ActionButton>
        <ActionButton onClick={() => void guard('Pause', spotify.pause)} disabled={!signedIn}>
          ⏸
        </ActionButton>
        <ActionButton onClick={() => void guard('Weiter', spotify.next)} disabled={!signedIn}>
          ⏭
        </ActionButton>
        <ActionButton onClick={() => void seekBy(-15_000)} disabled={!signedIn}>
          −15 s
        </ActionButton>
        <ActionButton onClick={() => void seekBy(15_000)} disabled={!signedIn}>
          +15 s
        </ActionButton>
      </div>
    </Card>
  )
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
