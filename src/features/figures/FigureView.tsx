import { useId } from 'react'
import type { Figure } from '@/lib/plan/schema'
import type { PropType } from '@/lib/plan/enums'
import { HumanBody } from '@/features/figures/HumanBody'
import { lerpPose, resolvePose } from '@/features/figures/pose'

export { lerpPose, resolvePose } from '@/features/figures/pose'

const GROUND_Y = 90

export interface FigureBox {
  x: number
  y: number
  size: number
}

/**
 * Quadratischer Ausschnitt um alles, was gezeichnet wird – über beide Posen
 * hinweg, damit Ausgang und Mitte denselben Maßstab haben. So muss beim
 * Erstellen der Posen niemand auf die Bildkomposition achten.
 */
const boundsCache = new WeakMap<Figure, FigureBox>()

export function figureBounds(figure: Figure): FigureBox {
  const cached = boundsCache.get(figure)
  if (cached) return cached
  const xs: number[] = []
  const ys: number[] = []

  // Include the arcs as well as endpoints, without recalculating each frame.
  for (let sample = 0; sample <= 16; sample += 1) {
    for (const point of Object.values(lerpPose(figure, sample / 16))) {
      xs.push(point[0])
      ys.push(point[1])
    }
  }

  for (const prop of figure.props) {
    if (prop.attachTo || prop.x === undefined || prop.y === undefined) continue
    xs.push(prop.x, prop.x + (prop.w ?? 0))
    ys.push(prop.y, prop.y + (prop.h ?? 0))
  }

  // Kopfkreis und Bodenlinie gehören dazu.
  const padding = 9
  const minX = Math.min(...xs) - padding
  const maxX = Math.max(...xs) + padding
  const minY = Math.min(...ys) - padding
  const maxY = Math.max(...ys, GROUND_Y) + padding * 0.4

  const size = Math.max(maxX - minX, maxY - minY)

  const bounds = {
    x: minX - (size - (maxX - minX)) / 2,
    y: minY - (size - (maxY - minY)) / 2,
    size,
  }
  boundsCache.set(figure, bounds)
  return bounds
}

function FixedProp({ type, x = 50, y = 80, w = 20, h = 4, rot = 0 }: {
  type: PropType
  x?: number
  y?: number
  w?: number
  h?: number
  rot?: number
}) {
  const transform = rot ? `rotate(${rot} ${x + w / 2} ${y + h / 2})` : undefined
  // Geräte und Auflagen sollen erkennbar sein, aber nicht mit der Figur konkurrieren.
  const solid = 'fill-fg-faint'
  const opacity = 0.85

  switch (type) {
    case 'mat':
      return (
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx={1.5}
          className={solid}
          opacity={opacity}
          transform={transform}
        />
      )
    case 'bench':
      return (
        <g transform={transform} className={`${solid} stroke-fg-faint`} opacity={opacity}>
          <rect x={x} y={y} width={w} height={h} rx={1.5} fill="#3b5263" stroke="#6c8493" strokeWidth=".6" />
          <line x1={x + 1} y1={y + 1} x2={x + w - 1} y2={y + 1} stroke="#93a8b5" strokeWidth=".5" />
          <line x1={x + w * 0.15} y1={y + h} x2={x + w * 0.15} y2={GROUND_Y} strokeWidth={2} />
          <line x1={x + w * 0.85} y1={y + h} x2={x + w * 0.85} y2={GROUND_Y} strokeWidth={2} />
        </g>
      )
    case 'box':
      return (
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx={1}
          className={solid}
          opacity={opacity}
          transform={transform}
        />
      )
    case 'chair':
      return (
        <g transform={transform} className={`${solid} stroke-fg-faint`} opacity={opacity}>
          <rect x={x} y={y} width={w} height={2.5} />
          <line x1={x} y1={y} x2={x} y2={y - w * 0.8} strokeWidth={2} />
          <line x1={x + 1} y1={y + 2.5} x2={x + 1} y2={GROUND_Y} strokeWidth={2} />
          <line x1={x + w - 1} y1={y + 2.5} x2={x + w - 1} y2={GROUND_Y} strokeWidth={2} />
        </g>
      )
    case 'wall':
      return (
        <rect
          x={x}
          y={y}
          width={2.5}
          height={h}
          className={solid}
          opacity={opacity}
          transform={transform}
        />
      )
    case 'pullup-bar':
      return (
        <rect
          x={x}
          y={y}
          width={w}
          height={2}
          rx={1}
          className={solid}
          opacity={opacity}
          transform={transform}
        />
      )
    case 'cable':
      return (
        <line
          x1={x}
          y1={y}
          x2={x + w}
          y2={y + h}
          className="stroke-fg-faint"
          opacity={opacity}
          strokeWidth={1.2}
          strokeDasharray="3 2"
          transform={transform}
        />
      )
    default:
      return (
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx={1}
          className={solid}
          opacity={opacity}
          transform={transform}
        />
      )
  }
}

function HeldProp({ type, at }: { type: PropType; at: [number, number] }) {
  const [x, y] = at

  switch (type) {
    case 'dumbbell':
      return (
        <g className="fill-accent">
          <rect x={x - 1} y={y - 4.5} width={2} height={9} rx={0.8} />
          <rect x={x - 3} y={y - 5.5} width={6} height={2.6} rx={1} />
          <rect x={x - 3} y={y + 2.9} width={6} height={2.6} rx={1} />
        </g>
      )
    case 'kettlebell':
      return (
        <g className="fill-accent">
          <circle cx={x} cy={y + 4} r={3.4} />
          <path
            d={`M ${x - 2.2} ${y + 1} a 2.2 2.6 0 1 1 4.4 0`}
            className="fill-none stroke-accent"
            strokeWidth={1.2}
          />
        </g>
      )
    case 'barbell':
      return (
        <g className="fill-accent">
          <rect x={x - 16} y={y - 0.9} width={32} height={1.8} rx={0.9} />
          <rect x={x - 15} y={y - 3.5} width={2.6} height={7} rx={1} />
          <rect x={x + 12.4} y={y - 3.5} width={2.6} height={7} rx={1} />
        </g>
      )
    case 'plate':
      return <circle cx={x} cy={y} r={3.4} className="fill-none stroke-accent" strokeWidth={1.6} />
    case 'ball':
      return <circle cx={x} cy={y} r={3.6} className="fill-accent" />
    case 'band':
      return (
        <path
          d={`M ${x} ${y} q 6 6 0 12`}
          className="fill-none stroke-accent"
          strokeWidth={1.4}
          strokeDasharray="2 1.6"
        />
      )
    default:
      return <circle cx={x} cy={y} r={2.4} className="fill-accent" />
  }
}

export function FigureContent({
  figure,
  pose,
  mix,
  showArrow = false,
}: {
  figure: Figure
  pose: 'start' | 'mid'
  /** Wenn gesetzt, wird zwischen den Posen interpoliert statt eine zu zeigen. */
  mix?: number
  showArrow?: boolean
}) {
  const id = useId().replace(/:/g, '')
  const joints = mix === undefined ? resolvePose(figure, pose) : lerpPose(figure, mix)
  const box = figureBounds(figure)
  const stroke = box.size * 0.032
  const arrowFrom = figure.arrowJoint ? figure.poses.start[figure.arrowJoint] : undefined
  const arrowTo = figure.arrowJoint ? figure.poses.mid?.[figure.arrowJoint] : undefined
  const arrowId = `arrow-${id}`
  const markerSize = box.size * 0.045

  // Bei sehr kurzen Wegen verdeckt die Spitze den Pfeil komplett.
  const arrowVisible =
    showArrow &&
    arrowFrom !== undefined &&
    arrowTo !== undefined &&
    Math.hypot(arrowTo[0] - arrowFrom[0], arrowTo[1] - arrowFrom[1]) > box.size * 0.1

  return (
    <>
      <defs>
        <marker
          id={arrowId}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerUnits="userSpaceOnUse"
          markerWidth={markerSize}
          markerHeight={markerSize}
          orient="auto"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" className="fill-accent" />
        </marker>
      </defs>

      <ellipse cx={box.x + box.size / 2} cy={GROUND_Y + 1.5} rx={box.size * .38} ry={2.5} fill="#060d14" opacity=".5" />
      <line
        x1={box.x}
        y1={GROUND_Y}
        x2={box.x + box.size}
        y2={GROUND_Y}
        className="stroke-line"
        strokeWidth={stroke * 0.35}
      />

      {figure.props
        .filter((prop) => !prop.attachTo)
        .map((prop, index) => (
          <FixedProp key={`fixed-${index}`} {...prop} />
        ))}

      <HumanBody joints={joints} figure={figure} id={id} />

      {figure.props
        .filter((prop) => prop.attachTo)
        .map((prop, index) => {
          const at = joints[prop.attachTo!]
          return at ? <HeldProp key={`held-${index}`} type={prop.type} at={at} /> : null
        })}

      {arrowVisible ? (
        <line
          x1={arrowFrom[0]}
          y1={arrowFrom[1]}
          x2={arrowTo[0]}
          y2={arrowTo[1]}
          className="stroke-accent"
          strokeWidth={stroke * 0.4}
          strokeDasharray={`${stroke * 0.8} ${stroke * 0.6}`}
          markerEnd={`url(#${arrowId})`}
          opacity={0.85}
        />
      ) : null}
    </>
  )
}

export function FigureView({
  figure,
  pose,
  mix,
  showArrow = false,
  className = '',
}: {
  figure: Figure
  pose: 'start' | 'mid'
  mix?: number
  showArrow?: boolean
  className?: string
}) {
  const box = figureBounds(figure)

  return (
    <svg
      viewBox={`${box.x} ${box.y} ${box.size} ${box.size}`}
      className={className}
      role="img"
      aria-label={figure.id}
    >
      <FigureContent figure={figure} pose={pose} mix={mix} showArrow={showArrow} />
    </svg>
  )
}
