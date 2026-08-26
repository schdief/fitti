import { useEffect, useRef, useState } from 'react'

import { PageHeader } from '@/components/PageHeader'
import { ActionButton, Card, SegmentedControl } from '@/components/ui'
import { FigureContent, figureBounds, FigureView, resolvePose } from '@/features/figures/FigureView'
import { loadFigure, loadFigureIndex } from '@/features/figures/useFigure'
import { JOINTS } from '@/lib/plan/enums'
import type { Joint } from '@/lib/plan/enums'
import type { Figure } from '@/lib/plan/schema'

type EditablePose = 'start' | 'mid'

export function FigureLabPage() {
  const [ids, setIds] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [draft, setDraft] = useState<Figure | null>(null)
  const [editing, setEditing] = useState<EditablePose>('start')
  const [dragging, setDragging] = useState<Joint | null>(null)
  const [copied, setCopied] = useState(false)

  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    void loadFigureIndex().then((list) => {
      setIds(list)
      setSelected((current) => current ?? list[0] ?? null)
    })
  }, [])

  useEffect(() => {
    if (!selected) return
    void loadFigure(selected).then((figure) => {
      setDraft(figure ? structuredClone(figure) : null)
      setEditing('start')
    })
  }, [selected])

  const hasMid = draft?.poses.mid !== undefined
  const box = draft ? figureBounds(draft) : null

  const toViewBox = (clientX: number, clientY: number): [number, number] => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || !box) return [50, 50]
    return [
      Math.round(box.x + ((clientX - rect.left) / rect.width) * box.size),
      Math.round(box.y + ((clientY - rect.top) / rect.height) * box.size),
    ]
  }

  const moveJoint = (joint: Joint, point: [number, number]) => {
    setCopied(false)
    setDraft((previous) => {
      if (!previous) return previous

      if (editing === 'start') {
        return {
          ...previous,
          poses: { ...previous.poses, start: { ...previous.poses.start, [joint]: point } },
        }
      }

      return {
        ...previous,
        poses: { ...previous.poses, mid: { ...(previous.poses.mid ?? {}), [joint]: point } },
      }
    })
  }

  const releaseJoint = (joint: Joint) => {
    setCopied(false)
    setDraft((previous) => {
      if (!previous?.poses.mid) return previous
      const { [joint]: _removed, ...rest } = previous.poses.mid
      return { ...previous, poses: { ...previous.poses, mid: rest } }
    })
  }

  const toggleMid = () => {
    setCopied(false)
    setDraft((previous) => {
      if (!previous) return previous
      if (previous.poses.mid) {
        setEditing('start')
        return { ...previous, poses: { start: previous.poses.start } }
      }
      return { ...previous, poses: { ...previous.poses, mid: {} } }
    })
  }

  const copyJson = () => {
    if (!draft) return
    void navigator.clipboard?.writeText(`${JSON.stringify(draft, null, 2)}\n`).catch(() => undefined)
    setCopied(true)
  }

  const editedJoints = editing === 'mid' ? new Set(Object.keys(draft?.poses.mid ?? {})) : new Set<string>()
  const positions = draft ? resolvePose(draft, editing) : null

  return (
    <div className="min-h-dvh">
      <PageHeader title="Figuren-Labor" subtitle="Posen prüfen und nachjustieren" back />

      <div className="pad-safe-bottom mx-auto max-w-lg space-y-4 px-4 py-4">
        <select
          value={selected ?? ''}
          onChange={(event) => setSelected(event.target.value)}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-fg"
          aria-label="Übung"
        >
          {ids.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>

        {!draft ? (
          <Card className="p-6 text-center text-sm text-fg-muted">
            Figur konnte nicht geladen werden.
          </Card>
        ) : (
          <>
            <Card className="p-3">
              <div className="grid grid-cols-2 gap-3">
                <figure>
                  <FigureView figure={draft} pose="start" showArrow className="w-full" />
                  <figcaption className="mt-1 text-center text-xs text-fg-muted">Ausgang</figcaption>
                </figure>
                <figure>
                  {hasMid ? (
                    <FigureView figure={draft} pose="mid" className="w-full" />
                  ) : (
                    <div className="flex aspect-square items-center justify-center text-xs text-fg-faint">
                      Halteübung
                    </div>
                  )}
                  <figcaption className="mt-1 text-center text-xs text-fg-muted">
                    {hasMid ? 'Mitte' : 'ohne Mid-Pose'}
                  </figcaption>
                </figure>
              </div>
            </Card>

            <div className="flex items-center justify-between gap-3">
              <SegmentedControl
                label="Bearbeitete Pose"
                value={editing}
                onChange={setEditing}
                options={[
                  { value: 'start', label: 'Ausgang' },
                  { value: 'mid', label: 'Mitte' },
                ]}
              />
              <ActionButton onClick={toggleMid}>
                {hasMid ? 'Mid entfernen' : 'Mid anlegen'}
              </ActionButton>
            </div>

            {editing === 'mid' && !hasMid ? (
              <p className="text-xs text-warn">
                Diese Figur hat keine Mid-Pose. Lege sie an, um Gelenke zu bewegen.
              </p>
            ) : (
              <Card className="p-2">
                <svg
                  ref={svgRef}
                  viewBox={box ? `${box.x} ${box.y} ${box.size} ${box.size}` : '0 0 100 100'}
                  className="w-full touch-none select-none"
                  onPointerMove={(event) => {
                    if (!dragging) return
                    event.preventDefault()
                    moveJoint(dragging, toViewBox(event.clientX, event.clientY))
                  }}
                  onPointerUp={() => setDragging(null)}
                  onPointerLeave={() => setDragging(null)}
                >
                  <g className="pointer-events-none">
                    <FigureContent figure={draft} pose={editing} />
                  </g>

                  {positions
                    ? JOINTS.map((joint) => {
                        const point = positions[joint]
                        if (!point) return null
                        const overridden = editedJoints.has(joint)

                        return (
                          <circle
                            key={joint}
                            cx={point[0]}
                            cy={point[1]}
                            r={(box?.size ?? 100) * (dragging === joint ? 0.045 : 0.035)}
                            className={
                              overridden
                                ? 'fill-accent/40 stroke-accent'
                                : 'fill-surface-hi/60 stroke-fg-muted'
                            }
                            strokeWidth={(box?.size ?? 100) * 0.01}
                            onPointerDown={(event) => {
                              event.currentTarget.releasePointerCapture?.(event.pointerId)
                              setDragging(joint)
                            }}
                            onDoubleClick={() => editing === 'mid' && releaseJoint(joint)}
                          />
                        )
                      })
                    : null}
                </svg>
                <p className="px-1 pb-1 text-center text-xs text-fg-faint">
                  Gelenk ziehen zum Verschieben
                  {editing === 'mid' ? ' · Doppeltippen setzt es auf die Ausgangspose zurück' : ''}
                </p>
              </Card>
            )}

            <div className="flex flex-wrap gap-2">
              <ActionButton variant="primary" onClick={copyJson}>
                {copied ? 'Kopiert' : 'JSON kopieren'}
              </ActionButton>
              <ActionButton
                onClick={() => {
                  if (!selected) return
                  void loadFigure(selected).then((figure) => {
                    setDraft(figure ? structuredClone(figure) : null)
                    setCopied(false)
                  })
                }}
              >
                Verwerfen
              </ActionButton>
            </div>

            <p className="text-xs text-fg-muted">
              Kopiertes JSON nach <code className="text-fg">public/figures/{draft.id}.json</code>{' '}
              einfügen, dann <code className="text-fg">npm run validate</code>.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
