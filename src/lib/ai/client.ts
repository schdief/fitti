import type { AiProvider } from '@/features/settings/settingsStore'

export interface AiConfig {
  provider: AiProvider
  apiKey: string
  model: string
}

export const AI_LABELS: Record<AiProvider, string> = {
  gemini: 'Google Gemini',
  openai: 'OpenAI ChatGPT',
}

/** Wo der Schlüssel erzeugt wird. Wird in der Anleitung verlinkt. */
export const AI_CONSOLE_URL: Record<AiProvider, string> = {
  gemini: 'https://aistudio.google.com/app/apikey',
  openai: 'https://platform.openai.com/api-keys',
}

export function hasAiKey(config: { apiKey: string }): boolean {
  return config.apiKey.trim().length > 0
}

export class AiError extends Error {
  readonly hint: string | undefined

  constructor(message: string, hint?: string) {
    super(message)
    this.name = 'AiError'
    this.hint = hint
  }
}

/**
 * Schickt den Text an den gewählten Anbieter und gibt die Antwort zurück.
 *
 * Der Aufruf geht direkt aus dem Browser an die API. Das spart einen eigenen
 * Server, bedeutet aber, dass der Schlüssel das Gerät verlässt und im
 * Browserspeicher liegt – deshalb die Warnung in den Einstellungen.
 */
export async function requestAnalysis(
  prompt: string,
  config: AiConfig,
  signal?: AbortSignal,
): Promise<string> {
  const key = config.apiKey.trim()
  if (key.length === 0) throw new AiError('Kein API-Schlüssel hinterlegt.')

  return config.provider === 'gemini'
    ? askGemini(prompt, key, config.model, signal)
    : askOpenAi(prompt, key, config.model, signal)
}

async function askGemini(
  prompt: string,
  key: string,
  model: string,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      // Schlüssel im Kopf statt in der Adresse: so landet er nicht in Protokollen.
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      signal,
    },
  )

  const payload = (await readJson(response)) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
    error?: { message?: string }
  }

  if (!response.ok) throw translate(response.status, payload.error?.message)

  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('')
  if (!text) throw new AiError('Gemini hat keine Antwort geliefert.')

  return text.trim()
}

async function askOpenAi(
  prompt: string,
  key: string,
  model: string,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal,
  })

  const payload = (await readJson(response)) as {
    choices?: { message?: { content?: string } }[]
    error?: { message?: string }
  }

  if (!response.ok) throw translate(response.status, payload.error?.message)

  const text = payload.choices?.[0]?.message?.content
  if (!text) throw new AiError('ChatGPT hat keine Antwort geliefert.')

  return text.trim()
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

/** Übersetzt die häufigen Fehler in etwas, mit dem man etwas anfangen kann. */
function translate(status: number, message: string | undefined): AiError {
  if (status === 401 || status === 403) {
    return new AiError(
      'Der Schlüssel wurde abgelehnt.',
      'Prüfe, ob du ihn vollständig kopiert hast und ob er noch gültig ist.',
    )
  }

  if (status === 429) {
    return new AiError(
      'Zu viele Anfragen oder Kontingent aufgebraucht.',
      'Beim kostenlosen Kontingent hilft oft schon ein paar Minuten warten.',
    )
  }

  if (status === 404) {
    return new AiError(
      'Dieses Modell gibt es nicht.',
      'Trag in den Einstellungen ein anderes Modell ein.',
    )
  }

  return new AiError(message ?? `Anfrage fehlgeschlagen (${status}).`)
}
