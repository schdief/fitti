export const audioSessionTypes = [
  'auto',
  'playback',
  'transient',
  'transient-solo',
  'ambient',
  'play-and-record',
] as const

export type AudioSessionType = (typeof audioSessionTypes)[number]

export const supportsAudioSession =
  typeof navigator !== 'undefined' && 'audioSession' in navigator

export function getAudioSessionType(): AudioSessionType | null {
  return navigator.audioSession?.type ?? null
}

export function setAudioSessionType(type: AudioSessionType): boolean {
  if (!navigator.audioSession) return false
  navigator.audioSession.type = type
  return true
}

let context: AudioContext | null = null

export function getAudioContext(): AudioContext {
  context ??= new AudioContext()
  return context
}

export function audioContextState(): AudioContextState | 'none' {
  return context?.state ?? 'none'
}

/**
 * Muss innerhalb einer Nutzergeste laufen, sonst bleibt der Context auf iOS suspended.
 * Der stumme Buffer ist der übliche Trick, um die Ausgabe freizuschalten.
 */
export async function unlockAudio(): Promise<AudioContext> {
  const ctx = getAudioContext()
  if (ctx.state !== 'running') await ctx.resume()

  const source = ctx.createBufferSource()
  source.buffer = ctx.createBuffer(1, 1, ctx.sampleRate)
  source.connect(ctx.destination)
  source.start()

  return ctx
}

export interface BeepOptions {
  /** Zeitpunkt auf der AudioContext-Zeitachse. Default: sofort. */
  at?: number
  frequency?: number
  durationMs?: number
  volume?: number
  onEnded?: () => void
}

/**
 * Töne werden auf der Audio-Uhr geplant, nicht per setTimeout. Das überlebt
 * gedrosseltes JavaScript im Hintergrund.
 */
export function scheduleBeep(ctx: AudioContext, options: BeepOptions = {}): void {
  const { at = ctx.currentTime, frequency = 880, durationMs = 180, volume = 0.5, onEnded } = options
  const duration = durationMs / 1000

  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, at)

  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.015)
  gain.gain.setValueAtTime(volume, at + duration - 0.04)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)

  oscillator.connect(gain)
  gain.connect(ctx.destination)

  if (onEnded) oscillator.addEventListener('ended', onEnded, { once: true })

  oscillator.start(at)
  oscillator.stop(at + duration + 0.05)
}

export const supportsSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window

export interface SpeakOptions {
  volume?: number
  rate?: number
  pitch?: number
  lang?: string
  onStart?: () => void
  onEnd?: () => void
  onError?: (reason: string) => void
}

export function speak(text: string, options: SpeakOptions = {}): boolean {
  if (!supportsSpeech) return false

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = options.lang ?? 'de-DE'
  utterance.volume = options.volume ?? 1
  utterance.rate = options.rate ?? 1
  utterance.pitch = options.pitch ?? 1

  if (options.onStart) utterance.addEventListener('start', options.onStart, { once: true })
  if (options.onEnd) utterance.addEventListener('end', options.onEnd, { once: true })
  if (options.onError) {
    utterance.addEventListener('error', (event) => options.onError?.(event.error), { once: true })
  }

  window.speechSynthesis.speak(utterance)
  return true
}

export function cancelSpeech(): void {
  if (supportsSpeech) window.speechSynthesis.cancel()
}
