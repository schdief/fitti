import { Component } from 'react'
import type { ReactNode } from 'react'

/**
 * Fängt Fehler beim Rendern ab. Ohne diese Klasse wirft React die gesamte
 * Oberfläche weg und der Bildschirm bleibt schwarz – im Training besonders
 * ärgerlich, weil unklar bleibt, ob die Sätze noch gespeichert sind.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { message: string | null }
> {
  state = { message: null as string | null }

  static getDerivedStateFromError(error: unknown) {
    return { message: error instanceof Error ? error.message : String(error) }
  }

  render() {
    if (this.state.message === null) return this.props.children

    return (
      <div className="mx-auto flex min-h-app max-w-lg flex-col justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-semibold">Da ist etwas schiefgelaufen</h1>
        <p className="text-sm text-fg-muted">
          Das laufende Training und das Logbuch sind gespeichert. Neu laden hilft meistens.
        </p>
        <p className="break-words rounded-card bg-surface p-3 text-left text-xs text-fg-faint">
          {this.state.message}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-card bg-accent px-4 py-3 text-base font-semibold text-accent-fg"
        >
          Neu laden
        </button>
      </div>
    )
  }
}
