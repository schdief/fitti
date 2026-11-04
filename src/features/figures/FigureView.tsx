import { useId } from 'react'
import type { Figure } from '@/lib/plan/schema'
import type { PropType } from '@/lib/plan/enums'
import { HumanBody } from '@/features/figures/HumanBody'
import { lerpPose, resolvePose } from '@/features/figures/pose'

export { lerpPose, resolvePose } from '@/features/figures/pose'

const GROUND_Y = 90

/** Geräte im Stil der Figur: gedecktes Schiefer, runde Kanten, ein Licht von oben. */
const STUDIO = {
  frame: '#2b3a47',
  pad: '#3f5466',
  padLight: '#62798c',
  metal: '#9aadbd',
  plate: '#253340',
} as const

type Point = [number, number]

interface PropBox {
  type: PropType
  x?: number
  y?: number
  w?: number
  h?: number
  rot?: number
}

/** Dreht einen Punkt um den Mittelpunkt einer Requisite, wie es SVG beim Zeichnen tut. */
function turnAround(point: Point, center: Point, degrees: number): Point {
  const radians = (degrees * Math.PI) / 180
  const dx = point[0] - center[0]
  const dy = point[1] - center[1]
  return [
    center[0] + dx * Math.cos(radians) - dy * Math.sin(radians),
    center[1] + dx * Math.sin(radians) + dy * Math.cos(radians),
  ]
}

function FixedProp({ type, x = 50, y = 80, w = 20, h = 4, rot = 0 }: PropBox) {
  const center: Point = [x + w / 2, y + h / 2]
  const transform = rot ? `rotate(${rot} ${center[0]} ${center[1]})` : undefined
  const highlight = (
    <rect x={x + 0.8} y={y + 0.45} width={Math.max(0, w - 1.6)} height={Math.min(1, h * 0.25)} rx={0.5} fill={STUDIO.padLight} opacity={0.75} />
  )

  switch (type) {
    case 'bench':
    case 'chair': {
      // Beine stehen senkrecht auf dem Boden, auch unter einem schrägen Polster.
      const feet = [0.18, 0.82].map((at) => turnAround([x + w * at, y + h], center, rot))
      const footXs = feet.map(([footX]) => footX)
      return (
        <g>
          {feet.map(([footX, footY]) => (
            <line key={footX} x1={footX} y1={footY} x2={footX} y2={GROUND_Y - 1.2} stroke={STUDIO.frame} strokeWidth={2.4} strokeLinecap="round" />
          ))}
          {rot ? (
            // Eine Schrägbank steht auf einem durchgehenden Fuß.
            <rect x={Math.min(...footXs) - 3} y={GROUND_Y - 2.2} width={Math.max(...footXs) - Math.min(...footXs) + 6} height={2.2} rx={1.1} fill={STUDIO.frame} />
          ) : (
            footXs.map((footX) => (
              <rect key={footX} x={footX - 3} y={GROUND_Y - 2.2} width={6} height={2.2} rx={1.1} fill={STUDIO.frame} />
            ))
          )}
          <g transform={transform}>
            {type === 'chair' ? (
              <line x1={x + 1} y1={y} x2={x + 1} y2={y - w * 0.8} stroke={STUDIO.frame} strokeWidth={2.4} strokeLinecap="round" />
            ) : null}
            <rect x={x} y={y} width={w} height={h} rx={Math.min(h / 2, 2.2)} fill={STUDIO.pad} />
            {highlight}
          </g>
        </g>
      )
    }
    case 'wall':
      // Immer 2,6 breit; gedreht wird um die eigene Mitte, nicht um die von w.
      return (
        <rect
          x={x}
          y={y}
          width={2.6}
          height={h}
          rx={1.3}
          fill={STUDIO.frame}
          transform={rot ? `rotate(${rot} ${x + 1.3} ${y + h / 2})` : undefined}
        />
      )
    case 'pullup-bar':
      return <rect x={x} y={y} width={w} height={2} rx={1} fill={STUDIO.metal} transform={transform} />
    case 'cable':
      return (
        <line x1={x} y1={y} x2={x + w} y2={y + h} stroke={STUDIO.metal} strokeWidth={1} strokeDasharray="2.4 1.8" strokeLinecap="round" transform={transform} />
      )
    case 'box':
      return (
        <g transform={transform}>
          <rect x={x} y={y} width={w} height={h} rx={Math.min(w, h) / 2.4} fill={STUDIO.frame} />
          {w > 4 && h > 2 ? highlight : null}
        </g>
      )
    case 'plate': {
      if (h > w * 1.5) {
        // Deutlich höher als breit: ein Gewichtsblock aus Steckgewichten.
        const count = Math.max(3, Math.round(h / 2.8))
        const pitch = h / count
        return (
          <g transform={transform}>
            {Array.from({ length: count }, (_, index) => (
              <rect
                key={index}
                x={x}
                y={y + index * pitch}
                width={w}
                height={pitch - 0.55}
                rx={0.6}
                fill={index === 0 ? STUDIO.padLight : STUDIO.pad}
              />
            ))}
            <circle cx={x + w * 0.78} cy={y + pitch * 3.5} r={0.65} fill={STUDIO.metal} />
          </g>
        )
      }
      const radius = Math.min(w, h) / 2
      return (
        <g>
          <circle cx={center[0]} cy={center[1]} r={radius} fill={STUDIO.plate} />
          <circle cx={center[0]} cy={center[1]} r={radius * 0.28} fill={STUDIO.metal} />
        </g>
      )
    }
    default:
      return (
        <g transform={transform}>
          <rect x={x} y={y} width={w} height={h} rx={Math.min(w, h) / 2} fill={STUDIO.pad} />
          {highlight}
        </g>
      )
  }
}

/**
 * Seilzug von einer festen Umlenkrolle zum Gelenk, mit Griff in der Hand. Das
 * Seil bleibt so mit Gewicht und Hand verbunden, wie lang es auch wird.
 */
function Tether({ anchor, at }: { anchor: Point; at: Point }) {
  const angle = Math.atan2(at[1] - anchor[1], at[0] - anchor[0]) * 180 / Math.PI
  return (
    <g>
      <line x1={anchor[0]} y1={anchor[1]} x2={at[0]} y2={at[1]} stroke={STUDIO.metal} strokeWidth={0.7} strokeLinecap="round" />
      <circle cx={anchor[0]} cy={anchor[1]} r={2.3} fill={STUDIO.frame} stroke={STUDIO.metal} strokeWidth={0.6} />
      <circle cx={anchor[0]} cy={anchor[1]} r={0.7} fill={STUDIO.metal} />
      <g transform={`translate(${at[0]} ${at[1]}) rotate(${angle})`}>
        <rect x={-0.9} y={-3.3} width={1.8} height={6.6} rx={0.9} fill={STUDIO.plate} />
      </g>
    </g>
  )
}

/** Ein Seil mit fester Rolle und Gelenk spannt sich zwischen beiden. */
function isTether(prop: Figure['props'][number]): boolean {
  return prop.type === 'cable' && prop.attachTo !== undefined && prop.x !== undefined && prop.y !== undefined
}

function HeldProp({ type, at }: { type: PropType; at: [number, number] }) {
  const [x, y] = at

  switch (type) {
    case 'dumbbell':
      return (
        <g>
          <rect x={x - 0.9} y={y - 4.5} width={1.8} height={9} rx={0.9} fill={STUDIO.metal} />
          <rect x={x - 3} y={y - 5.6} width={6} height={2.6} rx={1.2} fill={STUDIO.plate} />
          <rect x={x - 3} y={y + 3} width={6} height={2.6} rx={1.2} fill={STUDIO.plate} />
        </g>
      )
    case 'kettlebell':
      return (
        <g>
          <path d={`M ${x - 2.2} ${y + 1} a 2.2 2.6 0 1 1 4.4 0`} fill="none" stroke={STUDIO.metal} strokeWidth={1.2} />
          <circle cx={x} cy={y + 4} r={3.4} fill={STUDIO.plate} />
        </g>
      )
    case 'barbell':
      return (
        <g>
          <rect x={x - 16} y={y - 0.8} width={32} height={1.6} rx={0.8} fill={STUDIO.metal} />
          <rect x={x - 15.2} y={y - 3.8} width={3} height={7.6} rx={1.2} fill={STUDIO.plate} />
          <rect x={x + 12.2} y={y - 3.8} width={3} height={7.6} rx={1.2} fill={STUDIO.plate} />
        </g>
      )
    case 'plate':
      return (
        <g>
          <circle cx={x} cy={y} r={3.6} fill={STUDIO.pad} />
          <circle cx={x - 0.8} cy={y - 0.9} r={1.6} fill={STUDIO.padLight} opacity={0.6} />
        </g>
      )
    case 'ball':
      return <circle cx={x} cy={y} r={3.6} fill={STUDIO.pad} />
    case 'band':
      return <path d={`M ${x} ${y} q 6 6 0 12`} fill="none" stroke="#2fe3a0" strokeWidth={1.3} strokeDasharray="2 1.6" />
    default:
      return <circle cx={x} cy={y} r={2.4} fill={STUDIO.metal} />
  }
}

export interface FigureBox {
  x: number
  y: number
  size: number
}

/** Enger Rahmen um die Zeichnung, nicht quadratisch. */
export interface FigureFrame {
  x: number
  y: number
  w: number
  h: number
}

const frameCache = new WeakMap<Figure, FigureFrame>()

/**
 * Alles, was gezeichnet wird – über beide Posen und die Bögen dazwischen,
 * damit Ausgang und Mitte denselben Maßstab haben.
 */
export function figureFrame(figure: Figure): FigureFrame {
  const cached = frameCache.get(figure)
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
    if (prop.x === undefined || prop.y === undefined) continue
    // Von einem Seilzug zählt die feste Rolle, das andere Ende hängt am Gelenk.
    xs.push(prop.x)
    ys.push(prop.y)
    if (prop.attachTo) continue
    xs.push(prop.x + (prop.w ?? 0))
    ys.push(prop.y + (prop.h ?? 0))
  }

  // Kopfkreis und Bodenlinie gehören dazu.
  const padding = 9
  const minX = Math.min(...xs) - padding
  const maxX = Math.max(...xs) + padding
  const minY = Math.min(...ys) - padding
  const maxY = Math.max(...ys, GROUND_Y) + padding * 0.4

  const frame = { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
  frameCache.set(figure, frame)
  return frame
}

/**
 * Quadratischer Ausschnitt um den Rahmen. So muss beim Erstellen der Posen
 * niemand auf die Bildkomposition achten.
 */
const boundsCache = new WeakMap<Figure, FigureBox>()

export function figureBounds(figure: Figure): FigureBox {
  const cached = boundsCache.get(figure)
  if (cached) return cached
  const frame = figureFrame(figure)
  const size = Math.max(frame.w, frame.h)

  const bounds = {
    x: frame.x - (size - frame.w) / 2,
    y: frame.y - (size - frame.h) / 2,
    size,
  }
  boundsCache.set(figure, bounds)
  return bounds
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
        <radialGradient id={`${id}-shadow`}>
          <stop stopColor="#03080c" stopOpacity=".6" />
          <stop offset="1" stopColor="#03080c" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx={box.x + box.size / 2} cy={GROUND_Y + 0.6} rx={box.size * 0.42} ry={3.2} fill={`url(#${id}-shadow)`} />
      {/* Über den Ausschnitt hinaus: in breiten Bühnen reicht der Boden bis zum Rand. */}
      <line
        x1={box.x - box.size}
        y1={GROUND_Y}
        x2={box.x + box.size * 2}
        y2={GROUND_Y}
        className="stroke-line"
        strokeWidth={stroke * 0.35}
      />

      {figure.props
        .filter((prop) => !prop.attachTo)
        .map((prop, index) => (
          <FixedProp key={`fixed-${index}`} {...prop} />
        ))}

      {/* Vor dem Körper gezeichnet: die Hand liegt über dem Griff. */}
      {figure.props.filter(isTether).map((prop, index) => {
        const at = joints[prop.attachTo!]
        return at ? <Tether key={`tether-${index}`} anchor={[prop.x!, prop.y!]} at={at} /> : null
      })}

      <HumanBody joints={joints} figure={figure} id={id} />

      {figure.props
        .filter((prop) => prop.attachTo && !isTether(prop))
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
  fit = 'square',
  className = '',
}: {
  figure: Figure
  pose: 'start' | 'mid'
  mix?: number
  showArrow?: boolean
  /**
   * `content` rahmt nur die Zeichnung. In einer breiten, flachen Bühne wird
   * eine liegende Figur so deutlich größer als im quadratischen Ausschnitt.
   */
  fit?: 'square' | 'content'
  className?: string
}) {
  const box = figureBounds(figure)
  const frame = figureFrame(figure)
  const viewBox =
    fit === 'content'
      ? `${frame.x} ${frame.y} ${frame.w} ${frame.h}`
      : `${box.x} ${box.y} ${box.size} ${box.size}`

  return (
    <svg viewBox={viewBox} className={className} role="img" aria-label={figure.id}>
      <FigureContent figure={figure} pose={pose} mix={mix} showArrow={showArrow} />
    </svg>
  )
}
