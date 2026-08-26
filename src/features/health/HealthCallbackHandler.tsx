import { useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { clearPendingExport, pendingExport } from '@/features/health/healthExport'
import { labLog } from '@/features/lab/labLog'
import { markExported } from '@/features/logbook/db'
import { useSessions } from '@/features/logbook/useSessions'
import { useSettings } from '@/features/settings/settingsStore'

/**
 * Wertet den Rücksprung aus der Kurzbefehle-App aus. Sitzt außerhalb der Routen,
 * damit jede Zielroute funktioniert.
 */
export function HealthCallbackHandler() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const setHealth = useSettings((state) => state.setHealth)

  const result = searchParams.get('health')

  useEffect(() => {
    if (!result) return

    const pending = pendingExport()
    clearPendingExport()

    const roundtrip = pending ? `${Date.now() - pending.at} ms` : 'unbekannt'
    const success = result === 'ok'

    labLog(
      success ? 'ok' : 'error',
      `Kurzbefehl zurück: ${result} (${pending?.mode ?? 'ohne Auftrag'}, ${roundtrip})`,
    )

    setHealth({
      state: success ? 'connected' : 'error',
      lastCheckedAt: new Date().toISOString(),
      message: success ? null : 'Der Kurzbefehl meldete einen Fehler.',
    })

    if (success && pending?.sessionId) {
      void markExported(pending.sessionId).then(() => void useSessions.getState().load())
    }

    const next = new URLSearchParams(searchParams)
    next.delete('health')
    setSearchParams(next, { replace: true })
  }, [result, searchParams, setSearchParams, setHealth, navigate, location.pathname])

  return null
}
