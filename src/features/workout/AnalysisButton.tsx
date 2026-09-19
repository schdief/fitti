import { Copy, Share2, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { ActionButton } from '@/components/ui'
import { useSettings } from '@/features/settings/settingsStore'
import { AI_LABELS, AiError, hasAiKey, requestAnalysis } from '@/lib/ai/client'

type Phase = 'idle' | 'loading' | 'done' | 'error'

/**
 * Ein Knopf für beide Wege: Mit hinterlegtem Schlüssel fragt fitti den Anbieter
 * direkt und zeigt die Antwort. Ohne Schlüssel bleibt es beim Teilen, damit die
 * Funktion auch ohne Konto nutzbar ist.
 */
export function AnalysisButton({
  buildPrompt,
  className = '',
}: {
  buildPrompt: () => string
  className?: string
}) {
  const ai = useSettings((state) => state.connections.ai)
  const [phase, setPhase] = useState<Phase>('idle')
  const [answer, setAnswer] = useState('')
  const [problem, setProblem] = useState('')
  const [copied, setCopied] = useState(false)
  const abort = useRef<AbortController | null>(null)

  useEffect(() => () => abort.current?.abort(), [])

  const configured = hasAiKey(ai)

  const shareInstead = () => {
    const text = buildPrompt()

    if (navigator.share) {
      void navigator.share({ title: 'fitti Training', text }).catch(() => undefined)
      return
    }

    void navigator.clipboard
      ?.writeText(text)
      .then(() => setCopied(true))
      .catch(() => undefined)
  }

  const ask = async () => {
    setPhase('loading')
    setAnswer('')
    setProblem('')

    abort.current?.abort()
    const controller = new AbortController()
    abort.current = controller

    try {
      const text = await requestAnalysis(buildPrompt(), ai, controller.signal)
      setAnswer(text)
      setPhase('done')
    } catch (cause) {
      if (controller.signal.aborted) return
      const error = cause instanceof AiError ? cause : null
      setProblem([error?.message ?? String(cause), error?.hint].filter(Boolean).join(' '))
      setPhase('error')
    }
  }

  return (
    <>
      <ActionButton
        onClick={() => (configured ? void ask() : shareInstead())}
        className={`flex w-full items-center justify-center gap-2 py-3 ${className}`}
      >
        {configured ? <Sparkles size={18} aria-hidden /> : <Share2 size={18} aria-hidden />}
        {copied ? 'In die Zwischenablage kopiert' : 'Analyse anfordern'}
      </ActionButton>

      {phase === 'idle' ? null : (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <button
            type="button"
            aria-label="Schließen"
            onClick={() => setPhase('idle')}
            className="absolute inset-0 bg-black/70"
          />

          <div className="pad-safe-bottom relative flex max-h-[85dvh] flex-col rounded-t-3xl border-t border-line bg-surface">
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <h2 className="flex-1 text-sm font-semibold">
                Analyse von {AI_LABELS[ai.provider]}
              </h2>
              <button
                type="button"
                aria-label="Schließen"
                onClick={() => setPhase('idle')}
                className="-mr-1 flex size-9 items-center justify-center rounded-full text-fg-muted active:bg-surface-hi"
              >
                <X size={20} aria-hidden />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {phase === 'loading' ? (
                <p className="py-8 text-center text-sm text-fg-muted">
                  Die KI schaut sich dein Training an …
                </p>
              ) : null}

              {phase === 'error' ? (
                <div className="space-y-3">
                  <p className="text-sm text-danger">{problem}</p>
                  <ActionButton onClick={shareInstead} className="w-full py-3">
                    Stattdessen teilen
                  </ActionButton>
                </div>
              ) : null}

              {phase === 'done' ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{answer}</p>
              ) : null}
            </div>

            {phase === 'done' ? (
              <div className="flex gap-2 border-t border-line px-4 py-3">
                <ActionButton
                  onClick={() => void navigator.clipboard?.writeText(answer).catch(() => undefined)}
                  className="flex flex-1 items-center justify-center gap-2 py-3"
                >
                  <Copy size={16} aria-hidden />
                  Kopieren
                </ActionButton>
                <ActionButton
                  variant="primary"
                  onClick={() => setPhase('idle')}
                  className="flex-1 py-3"
                >
                  Fertig
                </ActionButton>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  )
}
