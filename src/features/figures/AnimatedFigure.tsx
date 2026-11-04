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
 *
 * Mit `fill` bestimmt das Layout die Größe der Bühne statt eines festen
 * Quadrats; die Figur sitzt dann zentriert im verfügbaren Platz.
 */
export function AnimatedFigure({
  exerciseId,
  timing,
  className = '',
  fill = false,
}: {
  exerciseId: string
  timing: MovementTiming
  className?: string
  fill?: boolean
}) {
  const { figure, loading } = useFigure(exerciseId)
  const [mix, setMix] = useState(0)
  const container = useRef<HTMLDivElement>(null)

  const animated = figure?.poses.mid !== undefined

  useEffect(() => {
    if (!animated) {
      setMix(0)
      return
    }

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let visible = false
    let frame = 0
    let elapsed = 0
    let previousTime = 0
    setMix(0)

    const loop = (now: number) => {
      if (previousTime) elapsed += Math.min(now - previousTime, 100)
      previousTime = now
      const next = mixAt(elapsed / 1000, timing)
      setMix((previous) => (Math.abs(previous - next) > 0.004 ? next : previous))
      frame = requestAnimationFrame(loop)
    }
    const update = () => {
      cancelAnimationFrame(frame)
      previousTime = 0
      if (motion.matches) setMix(0)
      if (visible && !document.hidden && !motion.matches) frame = requestAnimationFrame(loop)
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false
      update()
    })
    if (container.current) observer.observe(container.current)
    document.addEventListener('visibilitychange', update)
    motion.addEventListener('change', update)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      document.removeEventListener('visibilitychange', update)
      motion.removeEventListener('change', update)
    }
  }, [animated, exerciseId, timing])

  const shape = fill ? 'relative' : 'aspect-square'

  if (loading) {
    return <div className={`${shape} animate-pulse rounded-xl bg-surface-hi ${className}`} />
  }

  if (!figure) {
    return (
      <div
        className={`flex ${shape} items-center justify-center rounded-xl bg-surface-hi text-fg-faint ${className}`}
      >
        ?
      </div>
    )
  }

  return (
    <div ref={container} className={`figure-stage ${shape} overflow-hidden rounded-2xl ${className}`}>
      <FigureView
        figure={figure}
        pose="start"
        mix={animated ? mix : undefined}
        fit={fill ? 'content' : 'square'}
        className={fill ? 'absolute inset-0 block size-full' : 'block size-full'}
      />
    </div>
  )
}
