import { useEffect, useState } from 'react'

import { ActionButton } from '@/components/ui'
import { clearPendingExport, pendingExport } from '@/features/health/healthExport'
import type { PendingExport } from '@/features/health/healthExport'
import { labLog } from '@/features/lab/labLog'
import { markExported } from '@/features/logbook/db'
import { useSessions } from '@/features/logbook/useSessions'
import { useSettings } from '@/features/settings/settingsStore'

/** Warten, bis der Wechsel wirklich stattgefunden hat. */
const MIN_AGE_MS = 1500
/** Danach ist ein offener Auftrag nicht mehr aussagekräftig. */
const MAX_AGE_MS = 30 * 60_000

/**
 * Aus einer installierten Home-Screen-App heraus gibt es keinen Rückweg per
 * x-callback – iOS öffnet dafür Safari. Deshalb fragen wir nach der Rückkehr
 * einmal nach, statt das Ergebnis stillschweigend anzunehmen.
 */
export function HealthReturnPrompt() {
  const [pending, setPending] = useState<PendingExport | null>(null)
  const setHealth = useSettings((state) => state.setHealth)

  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== 'visible') return
      // Der Callback-Weg meldet sich selbst.
      if (window.location.hash.includes('health=')) return

      const entry = pendingExport()
      if (!entry) return

      const age = Date.now() - entry.at
      if (age < MIN_AGE_MS) return

      if (age > MAX_AGE_MS) {
        clearPendingExport()
        return
      }

      setPending(entry)
    }

    const timer = window.setTimeout(check, MIN_AGE_MS)
    document.addEventListener('visibilitychange', check)

    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])

  if (!pending) return null

  const answer = (success: boolean) => {
    clearPendingExport()
    setPending(null)

    labLog(success ? 'ok' : 'warn', `Kurzbefehl vom Nutzer als ${success ? 'erfolgreich' : 'fehlgeschlagen'} bestätigt`)

    setHealth({
      state: success ? 'connected' : 'error',
      lastCheckedAt: new Date().toISOString(),
      message: success ? null : 'Der Kurzbefehl hat nicht durchgelaufen.',
    })

    if (success && pending.sessionId) {
      void markExported(pending.sessionId).then(() => void useSessions.getState().load())
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/70" />
      <div className="pad-safe-bottom relative space-y-3 rounded-t-3xl border-t border-line bg-surface px-4 pb-4 pt-5">
        <h2 className="text-center text-lg font-semibold">Hat es geklappt?</h2>
        <p className="text-center text-sm text-fg-muted">
          {pending.mode === 'test'
            ? 'Der Kurzbefehl sollte ein einminütiges Testtraining in Health geschrieben haben.'
            : 'Der Kurzbefehl sollte das Training in Health geschrieben haben.'}
        </p>

        <ActionButton variant="primary" onClick={() => answer(true)} className="w-full py-3.5 text-base">
          Ja, steht in Health
        </ActionButton>
        <ActionButton variant="danger" onClick={() => answer(false)} className="w-full py-3">
          Nein, hat nicht geklappt
        </ActionButton>
      </div>
    </div>
  )
}
