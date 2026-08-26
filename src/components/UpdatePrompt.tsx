import { useRegisterSW } from 'virtual:pwa-register/react'

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="pad-safe-bottom fixed inset-x-3 bottom-20 z-50">
      <div className="mx-auto flex max-w-lg items-center gap-3 rounded-card border border-line bg-surface-hi p-3 shadow-lg shadow-black/40">
        <p className="flex-1 text-sm text-fg">Neue Version verfügbar.</p>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="rounded-lg px-3 py-2 text-sm font-medium text-fg-muted"
        >
          Später
        </button>
        <button
          type="button"
          onClick={() => void updateServiceWorker(true)}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-fg"
        >
          Laden
        </button>
      </div>
    </div>
  )
}
