import { useEffect, useRef, useState } from 'react'

import { ActionButton, Card, ChipSelect, NumberStepper, Toggle } from '@/components/ui'
import { labLog } from '@/features/lab/labLog'
import {
  DUCKING_LEAD_IN_SEC,
  getAudioContext,
  scheduleBeep,
  speak,
  startKeepAlive,
  stopKeepAlive,
  unlockAudio,
} from '@/lib/audio'
import type { KeepAliveMode } from '@/lib/audio'
import { isWakeLockActive, releaseWakeLock, requestWakeLock, supportsWakeLock } from '@/lib/wakeLock'

const keepAliveModes: readonly KeepAliveMode[] = ['off', 'webaudio', 'element']

export function TimerSpike() {
  const [durationSec, setDurationSec] = useState(30)
  const [useWakeLock, setUseWakeLock] = useState(false)
  const [keepAlive, setKeepAlive] = useState<KeepAliveMode>('off')
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [remainingMs, setRemainingMs] = useState(0)

  const timeoutRef = useRef<number | null>(null)
  const intervalRef = useRef<number | null>(null)
  const hiddenAtRef = useRef<{ wall: number; audio: number } | null>(null)

  /**
   * Beim Verstecken Wanduhr und Audio-Uhr merken, beim Zurückkommen vergleichen.
   * Läuft die Audio-Uhr langsamer, war der AudioContext eingefroren – dann kann
   * auch ein geplanter Ton nicht gespielt worden sein.
   */
  useEffect(() => {
    const onVisibilityChange = () => {
      const ctx = getAudioContext()

      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = { wall: Date.now(), audio: ctx.currentTime }
        labLog('info', 'Seite versteckt, Uhren notiert')
        return
      }

      const before = hiddenAtRef.current
      hiddenAtRef.current = null

      if (!before) {
        labLog('info', 'Seite sichtbar')
        return
      }

      const wallSec = (Date.now() - before.wall) / 1000
      const audioSec = ctx.currentTime - before.audio
      const frozen = wallSec - audioSec

      labLog(
        frozen > 1 ? 'warn' : 'ok',
        `Zurück nach ${wallSec.toFixed(1)} s Wanduhr, Audio-Uhr lief ${audioSec.toFixed(1)} s ` +
          `(${frozen.toFixed(1)} s eingefroren, Context: ${ctx.state})`,
      )
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  useEffect(
    () => () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
      if (intervalRef.current) window.clearInterval(intervalRef.current)
      stopKeepAlive()
      void releaseWakeLock()
    },
    [],
  )

  const stop = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    if (intervalRef.current) window.clearInterval(intervalRef.current)
    timeoutRef.current = null
    intervalRef.current = null
    setEndsAt(null)
    setRemainingMs(0)
    stopKeepAlive()
    void releaseWakeLock()
  }

  const start = async () => {
    stop()

    const ctx = await unlockAudio()
    const startedAt = Date.now()
    const target = startedAt + durationSec * 1000
    setEndsAt(target)
    setRemainingMs(durationSec * 1000)

    startKeepAlive(keepAlive)

    if (useWakeLock) {
      const granted = await requestWakeLock(() => labLog('warn', 'Wake Lock wurde freigegeben'))
      labLog(granted ? 'ok' : 'warn', granted ? 'Wake Lock aktiv' : 'Wake Lock abgelehnt')
    }

    // Weg A: auf der Audio-Uhr geplant. Sollte gedrosseltes JS überleben.
    scheduleBeep(ctx, {
      at: ctx.currentTime + durationSec - DUCKING_LEAD_IN_SEC,
      frequency: 660,
      durationMs: 900,
      onEnded: () =>
        labLog(
          'ok',
          `Web-Audio-Ton beendet, Abweichung ${Date.now() - target} ms (Sound sollte hörbar gewesen sein)`,
        ),
    })

    // Weg B: klassisches setTimeout. Zum Vergleich, wie stark iOS drosselt.
    timeoutRef.current = window.setTimeout(() => {
      labLog('info', `setTimeout gefeuert, Abweichung ${Date.now() - target} ms`)
      speak('Weitermachen', { onEnd: () => labLog('ok', 'Ansage beendet') })
      stop()
    }, durationSec * 1000)

    intervalRef.current = window.setInterval(() => {
      setRemainingMs(Math.max(0, target - Date.now()))
    }, 250)

    labLog('info', `Timer ${durationSec} s, Keep-Alive ${keepAlive}, Wake Lock ${useWakeLock}`)
  }

  const running = endsAt !== null

  return (
    <Card className="space-y-3 p-4">
      <div>
        <h3 className="text-[15px] font-semibold">2 · Timer bei gesperrtem Display</h3>
        <p className="mt-1 text-xs text-fg-muted">
          Starten, Display sperren, warten. Keep-Alive spielt währenddessen ein kaum hörbares
          Rauschen – die Frage ist, ob iOS die Seite dadurch am Leben lässt.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-fg-muted">Dauer</span>
        <NumberStepper
          label="Dauer"
          value={durationSec}
          onChange={(value) => setDurationSec(value ?? 30)}
          step={10}
          min={10}
          max={300}
          suffix="s"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-fg-muted">
          Wake Lock {supportsWakeLock ? '' : '(nicht unterstützt)'}
        </span>
        <Toggle label="Wake Lock" checked={useWakeLock} onChange={setUseWakeLock} />
      </div>

      <div className="space-y-2">
        <span className="text-sm text-fg-muted">Keep-Alive</span>
        <ChipSelect
          label="Keep-Alive"
          value={keepAlive}
          options={keepAliveModes}
          onChange={setKeepAlive}
        />
      </div>

      {running ? (
        <p className="text-center text-3xl font-semibold tabular-nums">
          {Math.ceil(remainingMs / 1000)} s
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <ActionButton variant="primary" onClick={() => void start()} disabled={running}>
          Timer starten
        </ActionButton>
        <ActionButton variant="danger" onClick={stop} disabled={!running}>
          Abbrechen
        </ActionButton>
        <ActionButton onClick={() => labLog('info', `Wake Lock aktiv: ${isWakeLockActive()}`)}>
          Wake-Lock-Status
        </ActionButton>
      </div>
    </Card>
  )
}
