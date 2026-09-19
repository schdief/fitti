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
 * Zeigt die Viewportwerte, mit denen das Layout rechnet, und deutet sie. Dient
 * der Suche nach der schwebenden unteren Leiste auf dem iPhone.
 */
export function ViewportSpike() {
  const [readings, setReadings] = useState<Reading[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const update = () => setReadings(read())
    update()

    const timer = window.setInterval(update, 500)
    return () => window.clearInterval(timer)
  }, [])

  const copy = () => {
    const text = [
      `userAgent: ${navigator.userAgent}`,
      ...readings.map((reading) => `${reading.label}: ${reading.value}`),
    ].join('\n')

    void navigator.clipboard
      ?.writeText(text)
      .then(() => setCopied(true))
      .catch(() => undefined)
  }

  const verdict = interpret()

  return (
    <section>
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-faint">Viewport</h2>
        <button type="button" onClick={copy} className="text-xs text-accent">
          {copied ? 'Kopiert' : 'Kopieren'}
        </button>
      </div>

      {verdict ? (
        <Card className="mb-2 border-warn/40 p-3 text-xs text-warn">{verdict}</Card>
      ) : null}

      <Card className="divide-y divide-line">
        {readings.map((reading) => (
          <div key={reading.label} className="flex items-center justify-between gap-3 px-4 py-2">
            <span className="text-xs text-fg-muted">{reading.label}</span>
            <span className="text-xs tabular-nums">{reading.value}</span>
          </div>
        ))}
      </Card>

      <p className="mt-2 px-1 text-[11px] text-fg-faint">
        Die Werte aktualisieren sich laufend. „Kopieren“ legt sie samt Gerätekennung in die
        Zwischenablage.
      </p>
    </section>
  )
}

/** Deutet die Werte, damit niemand Zahlen abtippen muss. */
function interpret(): string | null {
  const lost = window.screen.height - window.innerHeight

  if (lost > 5) {
    return `Die Seite ist ${lost} px kürzer als der Bildschirm. Der Streifen unter der Leiste gehört nicht zur Seite – iOS füllt ihn selbst. Ursache liegt außerhalb des Layouts.`
  }

  if (lost < -5) {
    return `Die Seite ist ${-lost} px länger als der Bildschirm.`
  }

  return null
}
