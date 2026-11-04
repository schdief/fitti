import type { Figure, JointMap } from '@/lib/plan/schema'

type Point = [number, number]
type Tone = readonly [light: string, mid: string, dark: string]

const TONES = {
  skin: ['#f4cfb3', '#d7a184', '#9c6a53'],
  shirt: ['#86f2cf', '#30c497', '#14735a'],
  pants: ['#647d94', '#3b526a', '#1e2d3e'],
} as const satisfies Record<string, Tone>

/** Ferne Seite: dieselben Farben, abgedunkelt statt durchscheinend. */
function darker(hex: string, factor = 0.6): string {
  const value = Number.parseInt(hex.slice(1), 16)
  const channel = (shift: number) => Math.round(((value >> shift) & 255) * factor)
  return `rgb(${channel(16)} ${channel(8)} ${channel(0)})`
}

function farTone(tone: Tone): Tone {
  return [darker(tone[0]), darker(tone[1]), darker(tone[2])]
}

/** Ein Licht von oben links für den ganzen Körper, statt einer Richtung je Knochen. */
const LIGHT: Point = [-0.41, -0.91]

/** Querachse eines Glieds, zur Lichtseite hin. */
function towardLight(from: Point, to: Point): Point {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1
  const normal: Point = [-(to[1] - from[1]) / length, (to[0] - from[0]) / length]
  return normal[0] * LIGHT[0] + normal[1] * LIGHT[1] >= 0 ? normal : [-normal[0], -normal[1]]
}

/** Rundes Glied: Kontur ohne Naht, quer schattiert wie ein Zylinder. */
function Bone({ id, from, to, width, tone }: {
  id: string; from: Point; to: Point; width: number; tone: Tone
}) {
  const normal = towardLight(from, to)
  const center: Point = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2]
  const half = width / 2
  return (
    <>
      <defs>
        <linearGradient
          id={id}
          gradientUnits="userSpaceOnUse"
          x1={center[0] + normal[0] * half}
          y1={center[1] + normal[1] * half}
          x2={center[0] - normal[0] * half}
          y2={center[1] - normal[1] * half}
        >
          <stop stopColor={tone[0]} />
          <stop offset=".45" stopColor={tone[1]} />
          <stop offset="1" stopColor={tone[2]} />
        </linearGradient>
      </defs>
      <line
        x1={from[0]}
        y1={from[1]}
        x2={to[0]}
        y2={to[1]}
        stroke={`url(#${id})`}
        strokeWidth={width}
        strokeLinecap="round"
      />
    </>
  )
}

/** Weiche geschlossene Kurve durch die Punkte (Catmull-Rom). */
function smoothClosed(points: Point[]): string {
  const at = (index: number) => points[(index + points.length) % points.length]!
  let d = `M ${at(0)[0]} ${at(0)[1]}`
  for (let index = 0; index < points.length; index += 1) {
    const [p0, p1, p2, p3] = [at(index - 1), at(index), at(index + 1), at(index + 2)]
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C ${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${p2[0]} ${p2[1]}`
  }
  return `${d} Z`
}

/**
 * Bekleidete Figur aus dem Gelenkgerüst der Übung: nahtlose, rund schattierte
 * Glieder unter einem gemeinsamen Licht, ohne Gesicht und Haare. Die ferne
 * Seite ist dunkler statt durchscheinend.
 */
export function HumanBody({ joints: j, figure, id }: { joints: JointMap; figure: Figure; id: string }) {
  const front = figure.view !== 'side'
  const side = figure.facing === 'left' ? -1 : 1
  const length = Math.hypot(j.neck[0] - j.hip[0], j.neck[1] - j.hip[1])
  const depth = front ? Math.max(6, Math.abs(j.shoulderR[0] - j.shoulderL[0]) / 2 + 1) : 5.6
  const angle = Math.atan2(j.neck[1] - j.hip[1], j.neck[0] - j.hip[0]) * 180 / Math.PI + 90

  // Rumpf in eigenen Koordinaten: Hüfte im Ursprung, Nacken bei -length, vorn bei +x.
  const f = front ? 1 : side
  const outline: Point[] = front
    ? [
        [0.55 * depth, -length + 0.4], [1.02 * depth, -0.8 * length], [0.78 * depth, -0.4 * length],
        [0.86 * depth, 0], [0, 0.32 * depth], [-0.86 * depth, 0], [-0.78 * depth, -0.4 * length],
        [-1.02 * depth, -0.8 * length], [-0.55 * depth, -length + 0.4], [0, -length - 0.2 * depth],
      ]
    : [
        [0.42 * depth * f, -length + 0.6], [1.02 * depth * f, -0.7 * length], [0.8 * depth * f, -0.36 * length],
        [0.86 * depth * f, -0.02 * length], [0.05 * depth * f, 0.3 * depth], [-0.95 * depth * f, -0.02 * length],
        [-0.74 * depth * f, -0.4 * length], [-0.98 * depth * f, -0.74 * length], [-0.48 * depth * f, -length + 0.4],
        [0, -length - 0.18 * depth],
      ]
  const torsoPath = smoothClosed(outline)
  const radians = (angle * Math.PI) / 180
  const torsoNormal = towardLight(j.hip, j.neck)
  const lightOnPlus = torsoNormal[0] * Math.cos(radians) + torsoNormal[1] * Math.sin(radians) >= 0
  const headAngle = Math.atan2(j.head[1] - j.neck[1], j.head[0] - j.neck[0]) * 180 / Math.PI + 90

  const leg = (s: 'L' | 'R', far: boolean) => {
    const pants = far ? farTone(TONES.pants) : TONES.pants
    const mirror = front ? (s === 'L' ? -1 : 1) : side
    return (
      <g>
        <Bone id={`${id}-shin${s}`} from={j[`knee${s}`]} to={j[`foot${s}`]} width={5.8} tone={pants} />
        <Bone id={`${id}-thigh${s}`} from={j.hip} to={j[`knee${s}`]} width={7.4} tone={pants} />
        <g transform={`translate(${j[`foot${s}`][0]} ${j[`foot${s}`][1]}) scale(${mirror} 1)`}>
          <path
            d="M -2.4 -2.3 Q -0.6 -3.5 1.7 -2.3 L 4.9 -0.7 Q 6.5 0.1 6.1 1.5 L -2.6 1.5 Q -3.5 -0.1 -2.4 -2.3 Z"
            fill={far ? '#9aa7b1' : '#e8eef2'}
          />
          <path d="M -2.6 1.5 L 6.1 1.5" stroke={far ? '#1f8c69' : '#2fe3a0'} strokeWidth=".9" strokeLinecap="round" />
        </g>
      </g>
    )
  }

  const arm = (s: 'L' | 'R', far: boolean) => {
    const skin = far ? farTone(TONES.skin) : TONES.skin
    const shirt = far ? farTone(TONES.shirt) : TONES.shirt
    const shoulder = j[`shoulder${s}`]
    const elbow = j[`elbow${s}`]
    const sleeveEnd: Point = [shoulder[0] + (elbow[0] - shoulder[0]) * 0.42, shoulder[1] + (elbow[1] - shoulder[1]) * 0.42]
    return (
      <g>
        <Bone id={`${id}-fore${s}`} from={elbow} to={j[`hand${s}`]} width={4.2} tone={skin} />
        <Bone id={`${id}-upper${s}`} from={shoulder} to={elbow} width={5} tone={skin} />
        <Bone id={`${id}-sleeve${s}`} from={shoulder} to={sleeveEnd} width={6.4} tone={shirt} />
        <circle cx={j[`hand${s}`][0]} cy={j[`hand${s}`][1]} r={2.1} fill={skin[1]} />
      </g>
    )
  }

  return (
    <g data-human-body="true">
      {leg('L', !front)}
      {front ? null : arm('L', true)}
      {leg('R', false)}

      <Bone id={`${id}-neck`} from={j.neck} to={j.head} width={4.2} tone={TONES.skin} />

      <g transform={`translate(${j.hip[0]} ${j.hip[1]}) rotate(${angle})`}>
        <defs>
          <linearGradient
            id={`${id}-torso`}
            gradientUnits="userSpaceOnUse"
            x1={lightOnPlus ? depth : -depth}
            y1="0"
            x2={lightOnPlus ? -depth : depth}
            y2="0"
          >
            <stop stopColor={TONES.shirt[0]} />
            <stop offset=".5" stopColor={TONES.shirt[1]} />
            <stop offset="1" stopColor={TONES.shirt[2]} />
          </linearGradient>
          <linearGradient
            id={`${id}-hips`}
            gradientUnits="userSpaceOnUse"
            x1={lightOnPlus ? depth : -depth}
            y1="0"
            x2={lightOnPlus ? -depth : depth}
            y2="0"
          >
            <stop stopColor={TONES.pants[0]} />
            <stop offset=".5" stopColor={TONES.pants[1]} />
            <stop offset="1" stopColor={TONES.pants[2]} />
          </linearGradient>
          <clipPath id={`${id}-waist`}>
            <rect x={-depth * 2} y={-0.16 * length} width={depth * 4} height={length} />
          </clipPath>
        </defs>
        <path d={torsoPath} fill={`url(#${id}-torso)`} />
        <path d={torsoPath} fill={`url(#${id}-hips)`} clipPath={`url(#${id}-waist)`} />
      </g>

      {/* Glatzkopf mit Glanz zur Lichtseite; das Ohr zeigt, wohin die Figur schaut. */}
      <defs>
        <radialGradient id={`${id}-head`} cx={0.5 + LIGHT[0] * 0.24} cy={0.5 + LIGHT[1] * 0.24} r=".72">
          <stop stopColor={TONES.skin[0]} />
          <stop offset=".6" stopColor={TONES.skin[1]} />
          <stop offset="1" stopColor={TONES.skin[2]} />
        </radialGradient>
      </defs>
      <circle cx={j.head[0]} cy={j.head[1]} r={5} fill={`url(#${id}-head)`} />
      {front ? null : (
        <g transform={`translate(${j.head[0]} ${j.head[1]}) rotate(${headAngle}) scale(${side} 1)`}>
          <ellipse cx="-0.55" cy="0.95" rx="1" ry="1.4" fill={TONES.skin[2]} />
        </g>
      )}

      {front ? arm('L', false) : null}
      {arm('R', false)}
    </g>
  )
}
