import { useState } from 'react'

import { ActionButton, Card, ChipSelect } from '@/components/ui'
import { labLog } from '@/features/lab/labLog'
import {
  audioSessionTypes,
  cancelSpeech,
  DUCKING_LEAD_IN_SEC,
  getAudioContext,
  scheduleBeep,
  setAudioSessionType,
  speak,
  supportsAudioSession,
  supportsSpeech,
  unlockAudio,
} from '@/lib/audio'
import type { AudioSessionType } from '@/lib/audio'

export function AudioSpike() {
  const [sessionType, setSessionType] = useState<AudioSessionType>('transient')
  const [unlocked, setUnlocked] = useState(false)

  const applySessionType = (type: AudioSessionType) => {
    setSessionType(type)
    const applied = setAudioSessionType(type)
    labLog(applied ? 'ok' : 'warn', applied ? `audioSession.type = ${type}` : 'audioSession nicht unterstützt')
  }

  const unlock = async () => {
    try {
      const ctx = await unlockAudio()
      setAudioSessionType(sessionType)
      setUnlocked(true)
      labLog('ok', `AudioContext ${ctx.state}, ${ctx.sampleRate} Hz, audioSession=${sessionType}`)
    } catch (cause) {
      labLog('error', `Audio-Freischaltung fehlgeschlagen: ${String(cause)}`)
    }
  }

  const beep = (durationMs: number) => {
    const ctx = getAudioContext()
    labLog('info', `Beep ${durationMs} ms mit ${DUCKING_LEAD_IN_SEC * 1000} ms Vorlauf`)
    scheduleBeep(ctx, {
      at: ctx.currentTime + DUCKING_LEAD_IN_SEC,
      frequency: 880,
      durationMs,
    })
  }

  const voice = (text: string) => {
    const started = speak(text, {
      onStart: () => labLog('info', `Sprachausgabe startet: „${text}“`),
      onEnd: () => labLog('ok', `Sprachausgabe fertig: „${text}“`),
      onError: (reason) => labLog('error', `Sprachausgabe-Fehler: ${reason}`),
    })
    if (!started) labLog('error', 'speechSynthesis nicht verfügbar')
  }

  return (
    <Card className="space-y-3 p-4">
      <div>
        <h3 className="text-[15px] font-semibold">1 · Audio neben Spotify</h3>
        <p className="mt-1 text-xs text-fg-muted">
          Musik in Spotify starten, dann hier testen. Beobachten: Läuft die Musik weiter, wird sie
          nur leiser (Ducking) oder stoppt sie ganz?
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-surface-hi px-3 py-2">
          <dt className="text-fg-faint">audioSession</dt>
          <dd className={supportsAudioSession ? 'text-accent' : 'text-warn'}>
            {supportsAudioSession ? 'unterstützt' : 'fehlt'}
          </dd>
        </div>
        <div className="rounded-lg bg-surface-hi px-3 py-2">
          <dt className="text-fg-faint">speechSynthesis</dt>
          <dd className={supportsSpeech ? 'text-accent' : 'text-warn'}>
            {supportsSpeech ? 'unterstützt' : 'fehlt'}
          </dd>
        </div>
      </dl>

      <ChipSelect
        label="audioSession-Typ"
        value={sessionType}
        options={audioSessionTypes}
        onChange={applySessionType}
      />

      <div className="flex flex-wrap gap-2">
        <ActionButton variant="primary" onClick={() => void unlock()}>
          Audio freischalten
        </ActionButton>
        <ActionButton onClick={() => beep(700)} disabled={!unlocked}>
          Beep 0,7 s
        </ActionButton>
        <ActionButton onClick={() => beep(1500)} disabled={!unlocked}>
          Beep 1,5 s
        </ActionButton>
        <ActionButton onClick={() => voice('Pause')} disabled={!supportsSpeech}>
          „Pause“
        </ActionButton>
        <ActionButton onClick={() => voice('Weitermachen')} disabled={!supportsSpeech}>
          „Weitermachen“
        </ActionButton>
        <ActionButton variant="danger" onClick={cancelSpeech}>
          Stopp
        </ActionButton>
      </div>
    </Card>
  )
}
