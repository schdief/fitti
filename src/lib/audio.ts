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
 *
 * Die Vorgabewerte sind bewusst lang und laut: Kurze, leise Töne gehen unter,
 * solange iOS die Lautstärke der anderen App noch herunterregelt.
 */
export function scheduleBeep(ctx: AudioContext, options: BeepOptions = {}): void {
  const { at = ctx.currentTime, frequency = 880, durationMs = 700, volume = 0.9, onEnded } = options
  const duration = durationMs / 1000

  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, at)

  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.05)
  gain.gain.setValueAtTime(volume, at + duration - 0.08)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)

  oscillator.connect(gain)
  gain.connect(ctx.destination)

  if (onEnded) oscillator.addEventListener('ended', onEnded, { once: true })

  oscillator.start(at)
  oscillator.stop(at + duration + 0.05)
}

/**
 * iOS regelt fremde Wiedergabe erst nach einigen hundert Millisekunden herunter.
 * Ohne diesen Vorlauf ist ein kurzer Ton vorbei, bevor er hörbar wird.
 */
export const DUCKING_LEAD_IN_SEC = 0.35

export type KeepAliveMode = 'off' | 'webaudio' | 'element'

let keepAliveSource: AudioBufferSourceNode | null = null
let keepAliveElement: HTMLAudioElement | null = null
let keepAliveUrl: string | null = null

function createNoiseBuffer(ctx: AudioContext, seconds = 2, level = 0.0015): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * level
  return buffer
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i))
}

/** Sehr leises Rauschen als WAV. Komplett stille Spuren stoppt iOS teilweise. */
function createQuietWavUrl(seconds = 2, sampleRate = 22_050, amplitude = 40): string {
  const samples = seconds * sampleRate
  const buffer = new ArrayBuffer(44 + samples * 2)
  const view = new DataView(buffer)

  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + samples * 2, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, samples * 2, true)

  for (let i = 0; i < samples; i += 1) {
    view.setInt16(44 + i * 2, Math.round((Math.random() * 2 - 1) * amplitude), true)
  }

  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }))
}

/**
 * Hält während einer Pause dauerhaft Audio am Laufen. Ziel: iOS soll die Seite
 * bei gesperrtem Display nicht einfrieren, damit der Cue am Ende noch kommt.
 */
export function startKeepAlive(mode: KeepAliveMode): void {
  stopKeepAlive()
  if (mode === 'off') return

  if (mode === 'webaudio') {
    const ctx = getAudioContext()
    const source = ctx.createBufferSource()
    source.buffer = createNoiseBuffer(ctx)
    source.loop = true
    source.connect(ctx.destination)
    source.start()
    keepAliveSource = source
    return
  }

  keepAliveUrl ??= createQuietWavUrl()
  const element = new Audio(keepAliveUrl)
  element.loop = true
  element.volume = 0.05
  element.setAttribute('playsinline', '')
  void element.play().catch(() => undefined)
  keepAliveElement = element
}

export function stopKeepAlive(): void {
  if (keepAliveSource) {
    keepAliveSource.stop()
    keepAliveSource.disconnect()
    keepAliveSource = null
  }

  if (keepAliveElement) {
    keepAliveElement.pause()
    keepAliveElement.src = ''
    keepAliveElement = null
  }
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
