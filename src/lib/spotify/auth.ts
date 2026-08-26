import { appOrigin } from '@/lib/appUrl'

const TOKENS_KEY = 'fitti.spotify.tokens'
const VERIFIER_KEY = 'fitti.spotify.verifier'
const STATE_KEY = 'fitti.spotify.state'
const RETURN_KEY = 'fitti.spotify.return'
const CLIENT_ID_KEY = 'fitti.spotify.clientId'

const AUTHORIZE_ENDPOINT = 'https://accounts.spotify.com/authorize'
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token'

export const SPOTIFY_SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
].join(' ')

export interface SpotifyTokens {
  accessToken: string
  refreshToken: string | null
  expiresAt: number
  scope: string
}

export type BootstrapOutcome =
  | { kind: 'none'; tokens: SpotifyTokens | null }
  | { kind: 'authorized'; tokens: SpotifyTokens }
  | { kind: 'failed'; reason: string; tokens: SpotifyTokens | null }

export function redirectUri(): string {
  return appOrigin()
}

export function getClientId(): string {
  return localStorage.getItem(CLIENT_ID_KEY) ?? ''
}

export function setClientId(clientId: string): void {
  localStorage.setItem(CLIENT_ID_KEY, clientId.trim())
}

export function readTokens(): SpotifyTokens | null {
  const raw = localStorage.getItem(TOKENS_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SpotifyTokens
  } catch {
    localStorage.removeItem(TOKENS_KEY)
    return null
  }
}

function writeTokens(tokens: SpotifyTokens): void {
  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens))
}

export function clearTokens(): void {
  localStorage.removeItem(TOKENS_KEY)
}

function base64Url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  for (const byte of view) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomString(byteLength: number): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(byteLength)))
}

async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64Url(digest)
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope: string
}

async function postToken(body: URLSearchParams): Promise<TokenResponse> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const detail =
      payload && typeof payload === 'object' && 'error_description' in payload
        ? String((payload as { error_description: unknown }).error_description)
        : `HTTP ${response.status}`
    throw new Error(detail)
  }

  return payload as TokenResponse
}

function toTokens(response: TokenResponse, previousRefreshToken: string | null): SpotifyTokens {
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token ?? previousRefreshToken,
    expiresAt: Date.now() + response.expires_in * 1000,
    scope: response.scope,
  }
}

/** Startet den PKCE-Flow. Verlässt die Seite. */
export async function startLogin(clientId: string, returnRoute = '/settings'): Promise<void> {
  const verifier = randomString(48)
  const state = randomString(12)

  setClientId(clientId)
  localStorage.setItem(VERIFIER_KEY, verifier)
  localStorage.setItem(STATE_KEY, state)
  localStorage.setItem(RETURN_KEY, returnRoute)

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri(),
    code_challenge_method: 'S256',
    code_challenge: await challengeFor(verifier),
    state,
    scope: SPOTIFY_SCOPES,
  })

  window.location.assign(`${AUTHORIZE_ENDPOINT}?${params.toString()}`)
}

let bootstrapPromise: Promise<BootstrapOutcome> | undefined

/**
 * Löst den Authorization Code genau einmal ein.
 *
 * Bewusst NICHT in einem useEffect: React StrictMode ruft Effekte doppelt auf,
 * der erste Lauf würde den einmaligen Code verbrauchen und sein Ergebnis verwerfen.
 * Die modul-globale Promise persistiert die Tokens deshalb in sich selbst.
 */
export function bootstrapSpotifyAuth(): Promise<BootstrapOutcome> {
  bootstrapPromise ??= (async (): Promise<BootstrapOutcome> => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')
    const state = params.get('state')

    if (!code && !error) return { kind: 'none', tokens: readTokens() }

    const verifier = localStorage.getItem(VERIFIER_KEY)
    const expectedState = localStorage.getItem(STATE_KEY)
    const returnRoute = localStorage.getItem(RETURN_KEY) ?? '/settings'
    const clientId = getClientId()

    localStorage.removeItem(VERIFIER_KEY)
    localStorage.removeItem(STATE_KEY)
    localStorage.removeItem(RETURN_KEY)

    // Query entfernen und auf die Zielroute setzen, bevor React startet.
    window.history.replaceState(null, '', `${window.location.pathname}#${returnRoute}`)

    if (error) return { kind: 'failed', reason: error, tokens: readTokens() }
    if (!verifier) {
      return {
        kind: 'failed',
        reason: 'Code-Verifier fehlt – der Rücksprung landete in einem anderen Browser-Kontext.',
        tokens: readTokens(),
      }
    }
    if (!expectedState || state !== expectedState) {
      return { kind: 'failed', reason: 'State stimmt nicht überein.', tokens: readTokens() }
    }
    if (!clientId) {
      return { kind: 'failed', reason: 'Keine Client-ID hinterlegt.', tokens: readTokens() }
    }

    try {
      const response = await postToken(
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: code!,
          redirect_uri: redirectUri(),
          client_id: clientId,
          code_verifier: verifier,
        }),
      )
      const tokens = toTokens(response, null)
      writeTokens(tokens)
      return { kind: 'authorized', tokens }
    } catch (cause) {
      return {
        kind: 'failed',
        reason: cause instanceof Error ? cause.message : 'Token-Anfrage fehlgeschlagen.',
        tokens: readTokens(),
      }
    }
  })()

  return bootstrapPromise
}

let refreshPromise: Promise<SpotifyTokens | null> | undefined

export async function getAccessToken(): Promise<string | null> {
  const tokens = readTokens()
  if (!tokens) return null
  if (Date.now() < tokens.expiresAt - 60_000) return tokens.accessToken
  if (!tokens.refreshToken) return null

  refreshPromise ??= (async () => {
    try {
      const response = await postToken(
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokens.refreshToken!,
          client_id: getClientId(),
        }),
      )
      const refreshed = toTokens(response, tokens.refreshToken)
      writeTokens(refreshed)
      return refreshed
    } catch {
      clearTokens()
      return null
    } finally {
      refreshPromise = undefined
    }
  })()

  return (await refreshPromise)?.accessToken ?? null
}
