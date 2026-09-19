import { useEffect, useRef, useState } from 'react'

import { FigureView } from '@/features/figures/FigureView'
import { useFigure } from '@/features/figures/useFigure'
import type { MovementTiming } from '@/lib/plan/schema'

/** Weiche Beschleunigung, damit die Bewegung nicht mechanisch wirkt. */
function smoothstep(value: number): number {
  return value * value * (3 - 2 * value)
}

function mixAt(elapsedSec: number, timing: MovementTiming): number {
  const { toMidSec, holdMidSec, toStartSec, holdStartSec } = timing
  const cycle = toMidSec + holdMidSec + toStartSec + holdStartSec
  const position = elapsedSec % cycle

  if (position < toMidSec) return smoothstep(position / toMidSec)
  if (position < toMidSec + holdMidSec) return 1

  const backStart = toMidSec + holdMidSec
  if (position < backStart + toStartSec) {
    return 1 - smoothstep((position - backStart) / toStartSec)
  }

  return 0
}

/**
 * Spielt die Bewegung zwischen Ausgangs- und Mittelposition in der Taktung des
 * Plans ab. Halteübungen ohne Mittelposition bleiben stehen.
 */
export function AnimatedFigure({
  exerciseId,
  timing,
  className = '',
}: {
  exerciseId: string
  timing: MovementTiming
  className?: string
}) {
  const { figure, loading } = useFigure(exerciseId)
  const [mix, setMix] = useState(0)
  const startedAt = useRef(0)

  const animated = figure?.poses.mid !== undefined

  useEffect(() => {
    if (!animated) {
      setMix(0)
      return
    }

    let frame = 0
    startedAt.current = 0

    const loop = (now: number) => {
      if (startedAt.current === 0) startedAt.current = now

      const next = mixAt((now - startedAt.current) / 1000, timing)
      // Kleine Sprünge nicht rendern, das spart Arbeit ohne sichtbaren Unterschied.
      setMix((previous) => (Math.abs(previous - next) > 0.004 ? next : previous))

      frame = requestAnimationFrame(loop)
    }

    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [animated, timing])

  if (loading) {
    return <div className={`aspect-square animate-pulse rounded-xl bg-surface-hi ${className}`} />
  }

  if (!figure) {
    return (
      <div
        className={`flex aspect-square items-center justify-center rounded-xl bg-surface-hi text-fg-faint ${className}`}
      >
        ?
      </div>
    )
  }

  return (
    <FigureView
      figure={figure}
      pose="start"
      mix={animated ? mix : undefined}
      className={`rounded-xl bg-surface-hi ${className}`}
    />
  )
}
