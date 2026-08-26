import { useEffect, useRef, useState } from 'react'

import { ActionButton, Card, NumberStepper, Toggle } from '@/components/ui'
import { labLog } from '@/features/lab/labLog'
import { getAudioContext, scheduleBeep, speak, unlockAudio } from '@/lib/audio'
import { isWakeLockActive, releaseWakeLock, requestWakeLock, supportsWakeLock } from '@/lib/wakeLock'

export function TimerSpike() {
  const [durationSec, setDurationSec] = useState(30)
  const [useWakeLock, setUseWakeLock] = useState(false)
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [remainingMs, setRemainingMs] = useState(0)

  const timeoutRef = useRef<number | null>(null)
  const intervalRef = useRef<number | null>(null)

  // Zustandswechsel der Seite protokollieren – das ist der eigentliche Erkenntnisgewinn.
  useEffect(() => {
    const log = (event: string) => () =>
      labLog('info', `Seitenereignis: ${event} (visibility=${document.visibilityState})`)

    const handlers: [string, EventListener][] = [
      ['visibilitychange', log('visibilitychange')],
      ['pagehide', log('pagehide')],
      ['pageshow', log('pageshow')],
      ['freeze', log('freeze')],
      ['resume', log('resume')],
    ]

    for (const [event, handler] of handlers) document.addEventListener(event, handler)
    return () => {
      for (const [event, handler] of handlers) document.removeEventListener(event, handler)
    }
  }, [])

  useEffect(
    () => () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
      if (intervalRef.current) window.clearInterval(intervalRef.current)
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
    void releaseWakeLock()
  }

  const start = async () => {
    stop()

    const ctx = await unlockAudio()
    const startedAt = Date.now()
    const target = startedAt + durationSec * 1000
    setEndsAt(target)
    setRemainingMs(durationSec * 1000)

    if (useWakeLock) {
      const granted = await requestWakeLock(() => labLog('warn', 'Wake Lock wurde freigegeben'))
      labLog(granted ? 'ok' : 'warn', granted ? 'Wake Lock aktiv' : 'Wake Lock abgelehnt')
    }

    // Weg A: auf der Audio-Uhr geplant. Sollte gedrosseltes JS überleben.
    scheduleBeep(getAudioContext(), {
      at: ctx.currentTime + durationSec,
      frequency: 660,
      durationMs: 250,
      onEnded: () =>
        labLog(
          'ok',
          `Web-Audio-Beep beendet, Abweichung ${Date.now() - target} ms (Sound sollte hörbar gewesen sein)`,
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

    labLog('info', `Timer über ${durationSec} s gestartet. Jetzt Display sperren.`)
  }

  const running = endsAt !== null

  return (
    <Card className="space-y-3 p-4">
      <div>
        <h3 className="text-[15px] font-semibold">2 · Timer bei gesperrtem Display</h3>
        <p className="mt-1 text-xs text-fg-muted">
          Starten, sofort das Display sperren und warten. Danach zurückkommen und prüfen, ob der Ton
          pünktlich kam und wie stark setTimeout abgewichen ist.
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
