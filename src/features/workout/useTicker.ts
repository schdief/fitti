import { useEffect, useState } from 'react'

/** Aktualisiert die Anzeige regelmäßig. Die Zeitrechnung selbst läuft über Zeitstempel. */
export function useTicker(active: boolean, intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!active) return

    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [active, intervalMs])

  return now
}
