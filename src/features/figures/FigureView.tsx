import type { Figure, JointMap } from '@/lib/plan/schema'
import type { Joint, PropType } from '@/lib/plan/enums'

const BONES: readonly (readonly [Joint, Joint])[] = [
  ['neck', 'shoulderL'],
  ['shoulderL', 'elbowL'],
  ['elbowL', 'handL'],
  ['hip', 'kneeL'],
  ['kneeL', 'footL'],
  ['neck', 'shoulderR'],
  ['shoulderR', 'elbowR'],
  ['elbowR', 'handR'],
  ['neck', 'hip'],
  ['hip', 'kneeR'],
  ['kneeR', 'footR'],
]

const LEFT_JOINTS = new Set<Joint>(['shoulderL', 'elbowL', 'handL', 'kneeL', 'footL'])

const GROUND_Y = 90

/** Die Mid-Pose erbt alle Gelenke, die sie nicht selbst überschreibt. */
export function resolvePose(figure: Figure, pose: 'start' | 'mid'): JointMap {
  if (pose === 'start' || !figure.poses.mid) return figure.poses.start
  return { ...figure.poses.start, ...figure.poses.mid }
}

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
export function figureBounds(figure: Figure): FigureBox {
  const xs: number[] = []
  const ys: number[] = []

  for (const pose of ['start', 'mid'] as const) {
    for (const point of Object.values(resolvePose(figure, pose))) {
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

  return {
    x: minX - (size - (maxX - minX)) / 2,
    y: minY - (size - (maxY - minY)) / 2,
    size,
  }
}

function isLeft([from, to]: readonly [Joint, Joint]): boolean {
  return LEFT_JOINTS.has(from) || LEFT_JOINTS.has(to)
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

  switch (type) {
    case 'mat':
      return (
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx={1.5}
          className="fill-fg-faint"
          opacity={0.4}
          transform={transform}
        />
      )
    case 'bench':
      return (
        <g transform={transform} className="fill-line stroke-line">
          <rect x={x} y={y} width={w} height={h} rx={1} />
          <line x1={x + w * 0.15} y1={y + h} x2={x + w * 0.15} y2={GROUND_Y} strokeWidth={2} />
          <line x1={x + w * 0.85} y1={y + h} x2={x + w * 0.85} y2={GROUND_Y} strokeWidth={2} />
        </g>
      )
    case 'box':
      return <rect x={x} y={y} width={w} height={h} rx={1} className="fill-line" transform={transform} />
    case 'chair':
      return (
        <g transform={transform} className="fill-line stroke-line">
          <rect x={x} y={y} width={w} height={2.5} />
          <line x1={x} y1={y} x2={x} y2={y - w * 0.8} strokeWidth={2} />
          <line x1={x + 1} y1={y + 2.5} x2={x + 1} y2={GROUND_Y} strokeWidth={2} />
          <line x1={x + w - 1} y1={y + 2.5} x2={x + w - 1} y2={GROUND_Y} strokeWidth={2} />
        </g>
      )
    case 'wall':
      return <rect x={x} y={y} width={2.5} height={h} className="fill-line" transform={transform} />
    case 'pullup-bar':
      return <rect x={x} y={y} width={w} height={2} rx={1} className="fill-line" transform={transform} />
    case 'cable':
      return (
        <line
          x1={x}
          y1={y}
          x2={x + w}
          y2={y + h}
          className="stroke-line"
          strokeWidth={1.2}
          strokeDasharray="3 2"
          transform={transform}
        />
      )
    default:
      return <rect x={x} y={y} width={w} height={h} rx={1} className="fill-line" transform={transform} />
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
  showArrow = false,
}: {
  figure: Figure
  pose: 'start' | 'mid'
  showArrow?: boolean
}) {
  const joints = resolvePose(figure, pose)
  const box = figureBounds(figure)
  const stroke = box.size * 0.032
  const headRadius = box.size * 0.055
  const arrowFrom = figure.arrowJoint ? figure.poses.start[figure.arrowJoint] : undefined
  const arrowTo = figure.arrowJoint ? figure.poses.mid?.[figure.arrowJoint] : undefined
  const arrowId = `arrow-${figure.id}-${pose}`

  return (
    <>
      <defs>
        <marker id={arrowId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" className="fill-accent" />
        </marker>
      </defs>

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

      <g strokeLinecap="round" fill="none">
        {BONES.map(([from, to]) => {
          const a = joints[from]
          const b = joints[to]
          if (!a || !b) return null
          return (
            <line
              key={`${from}-${to}`}
              x1={a[0]}
              y1={a[1]}
              x2={b[0]}
              y2={b[1]}
              strokeWidth={stroke}
              className="stroke-fg"
              opacity={isLeft([from, to]) ? 0.45 : 1}
            />
          )
        })}
      </g>

      {joints.head && joints.neck ? (
        <>
          <line
            x1={joints.neck[0]}
            y1={joints.neck[1]}
            x2={joints.head[0]}
            y2={joints.head[1]}
            strokeWidth={stroke}
            strokeLinecap="round"
            className="stroke-fg"
          />
          <circle cx={joints.head[0]} cy={joints.head[1]} r={headRadius} className="fill-fg" />
        </>
      ) : null}

      {figure.props
        .filter((prop) => prop.attachTo)
        .map((prop, index) => {
          const at = joints[prop.attachTo!]
          return at ? <HeldProp key={`held-${index}`} type={prop.type} at={at} /> : null
        })}

      {showArrow && arrowFrom && arrowTo ? (
        <line
          x1={arrowFrom[0]}
          y1={arrowFrom[1]}
          x2={arrowTo[0]}
          y2={arrowTo[1]}
          className="stroke-accent"
          strokeWidth={stroke * 0.5}
          strokeDasharray={`${stroke} ${stroke * 0.7}`}
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
  showArrow = false,
  className = '',
}: {
  figure: Figure
  pose: 'start' | 'mid'
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
      <FigureContent figure={figure} pose={pose} showArrow={showArrow} />
    </svg>
  )
}
