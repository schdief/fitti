import { getAccessToken } from '@/lib/spotify/auth'

const API_BASE = 'https://api.spotify.com/v1'

export class SpotifyError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'SpotifyError'
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T | null> {
  const token = await getAccessToken()
  if (!token) throw new SpotifyError('Nicht angemeldet.', 401)

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (response.status === 204) return null
  if (response.status === 429) {
    throw new SpotifyError(`Rate Limit, erneut in ${response.headers.get('Retry-After') ?? '?'}s`, 429)
  }

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null)
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: { message?: string } }).error.message ?? response.statusText)
        : response.statusText
    throw new SpotifyError(message, response.status)
  }

  const text = await response.text()
  return text ? (JSON.parse(text) as T) : null
}

export interface SpotifyProfile {
  display_name: string | null
  product: 'premium' | 'free' | 'open'
  id: string
}

export interface PlaybackState {
  is_playing: boolean
  progress_ms: number | null
  device: { id: string | null; name: string; type: string; volume_percent: number | null } | null
  item: {
    id: string | null
    name: string
    duration_ms: number
    artists: { name: string }[]
  } | null
}

export interface SpotifyDevice {
  id: string | null
  name: string
  type: string
  is_active: boolean
}

export const spotify = {
  me: () => request<SpotifyProfile>('/me'),
  playbackState: () => request<PlaybackState>('/me/player'),
  devices: () => request<{ devices: SpotifyDevice[] }>('/me/player/devices'),
  play: () => request<null>('/me/player/play', { method: 'PUT' }),
  pause: () => request<null>('/me/player/pause', { method: 'PUT' }),
  next: () => request<null>('/me/player/next', { method: 'POST' }),
  previous: () => request<null>('/me/player/previous', { method: 'POST' }),
  seek: (positionMs: number) =>
    request<null>(`/me/player/seek?position_ms=${Math.max(0, Math.round(positionMs))}`, {
      method: 'PUT',
    }),
  transfer: (deviceId: string, play = false) =>
    request<null>('/me/player', {
      method: 'PUT',
      body: JSON.stringify({ device_ids: [deviceId], play }),
    }),
}
