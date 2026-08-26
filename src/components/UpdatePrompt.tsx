import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

import { rememberRegistration } from '@/lib/swUpdate'

const CHECK_INTERVAL_MS = 60 * 60 * 1000

export function UpdatePrompt() {
  const [applying, setApplying] = useState(false)

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      rememberRegistration(registration)
      if (!registration) return

      window.setInterval(() => void registration.update(), CHECK_INTERVAL_MS)
    },
  })

  // Nach der Rückkehr in die App prüfen, ob es eine neue Version gibt.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      void navigator.serviceWorker?.getRegistration().then((registration) => registration?.update())
    }

    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  if (!needRefresh) return null

  const apply = async () => {
    setApplying(true)
    try {
      await updateServiceWorker(true)
    } catch {
      // Ignorieren, der Reload unten greift ohnehin.
    }

    // Sicherheitsnetz: updateServiceWorker lädt nur nach einem controllerchange
    // neu. Bleibt das aus, erzwingen wir den Reload selbst.
    window.setTimeout(() => window.location.reload(), 1500)
  }

  return (
    <div className="pad-safe-bottom fixed inset-x-3 bottom-20 z-50">
      <div className="mx-auto flex max-w-lg items-center gap-3 rounded-card border border-line bg-surface-hi p-3 shadow-lg shadow-black/40">
        <p className="flex-1 text-sm text-fg">Neue Version verfügbar.</p>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          disabled={applying}
          className="rounded-lg px-3 py-2 text-sm font-medium text-fg-muted disabled:opacity-40"
        >
          Später
        </button>
        <button
          type="button"
          onClick={() => void apply()}
          disabled={applying}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-fg disabled:opacity-60"
        >
          {applying ? 'Lädt …' : 'Laden'}
        </button>
      </div>
    </div>
  )
}
