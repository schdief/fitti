import { useEffect, useState } from 'react'

import { Card } from '@/components/ui'

interface Reading {
  label: string
  value: string
}

function read(): Reading[] {
  const root = document.documentElement

  // Sichere Bereiche lassen sich nur über ein Hilfselement auslesen.
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;visibility:hidden;padding-bottom:env(safe-area-inset-bottom);padding-top:env(safe-area-inset-top)'
  document.body.appendChild(probe)
  const probeStyle = getComputedStyle(probe)
  const insetBottom = probeStyle.paddingBottom
  const insetTop = probeStyle.paddingTop
  probe.remove()

  return [
    { label: 'window.innerHeight', value: `${window.innerHeight}` },
    { label: 'visualViewport.height', value: `${Math.round(window.visualViewport?.height ?? 0)}` },
    { label: 'screen.height', value: `${window.screen.height}` },
    { label: '100dvh', value: measure('100dvh') },
    { label: '--app-height', value: root.style.getPropertyValue('--app-height') || 'nicht gesetzt' },
    { label: 'safe-area unten', value: insetBottom },
    { label: 'safe-area oben', value: insetTop },
    {
      label: 'Standalone',
      value: window.matchMedia('(display-mode: standalone)').matches ? 'ja' : 'nein',
    },
  ]
}

function measure(value: string): string {
  const probe = document.createElement('div')
  probe.style.cssText = `position:fixed;visibility:hidden;height:${value}`
  document.body.appendChild(probe)
  const height = Math.round(probe.getBoundingClientRect().height)
  probe.remove()
  return `${height}px`
}

/**
 * Zeigt die Viewportwerte, mit denen das Layout rechnet. Dient der Suche nach
 * der schwebenden unteren Leiste auf dem iPhone.
 */
export function ViewportSpike() {
  const [readings, setReadings] = useState<Reading[]>([])

  useEffect(() => {
    const update = () => setReadings(read())
    update()

    const timer = window.setInterval(update, 500)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-fg-faint">
        Viewport
      </h2>

      <Card className="divide-y divide-line">
        {readings.map((reading) => (
          <div key={reading.label} className="flex items-center justify-between gap-3 px-4 py-2">
            <span className="text-xs text-fg-muted">{reading.label}</span>
            <span className="text-xs tabular-nums">{reading.value}</span>
          </div>
        ))}
      </Card>

      <p className="mt-2 px-1 text-[11px] text-fg-faint">
        Die Werte aktualisieren sich laufend. Weichen „--app-height“ und „innerHeight“ voneinander
        ab, rechnet das Layout mit einer falschen Höhe.
      </p>
    </section>
  )
}
