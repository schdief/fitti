import type { Figure, JointMap } from '@/lib/plan/schema'

type Point = [number, number]

/** A tapered, rounded volume, oriented along a bone. */
function Segment({ from, to, width, endWidth, fill }: {
  from: Point; to: Point; width: number; endWidth: number; fill: string
}) {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1])
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0]) * 180 / Math.PI
  return (
    <g transform={`translate(${from[0]} ${from[1]}) rotate(${angle})`}>
      <path
        d={`M 0 ${-width} Q ${length * .55} ${-width * 1.08} ${length} ${-endWidth} Q ${length + endWidth} 0 ${length} ${endWidth} Q ${length * .55} ${width * 1.08} 0 ${width} Q ${-width} 0 0 ${-width} Z`}
        fill={fill}
        stroke="#0b1720"
        strokeWidth="0.45"
      />
    </g>
  )
}

/** Clothed, shaded human silhouette driven by the existing exercise rig. */
export function HumanBody({ joints: j, figure, id }: { joints: JointMap; figure: Figure; id: string }) {
  const front = figure.view !== 'side'
  const back = figure.view === 'back'
  const torsoLength = Math.hypot(j.neck[0] - j.hip[0], j.neck[1] - j.hip[1])
  const width = front ? Math.max(6, Math.abs(j.shoulderR[0] - j.shoulderL[0]) / 2) : 5.2
  const angle = Math.atan2(j.neck[1] - j.hip[1], j.neck[0] - j.hip[0]) * 180 / Math.PI + 90
  const skin = `url(#${id}-skin)`
  const shirt = `url(#${id}-shirt)`
  const pants = `url(#${id}-pants)`
  const side = figure.facing === 'left' ? -1 : 1

  const arm = (s: 'L' | 'R') => (
    <g>
      <Segment from={j[`shoulder${s}`]} to={j[`elbow${s}`]} width={2.5} endWidth={1.8} fill={skin} />
      <Segment from={j[`elbow${s}`]} to={j[`hand${s}`]} width={1.9} endWidth={1.15} fill={skin} />
      <circle cx={j[`shoulder${s}`][0]} cy={j[`shoulder${s}`][1]} r="2.7" fill={shirt} />
      <ellipse cx={j[`hand${s}`][0]} cy={j[`hand${s}`][1]} rx="1.65" ry="1.8" fill={skin} />
    </g>
  )
  const leg = (s: 'L' | 'R') => (
    <g>
      <Segment from={j.hip} to={j[`knee${s}`]} width={3.8} endWidth={2.4} fill={pants} />
      <Segment from={j[`knee${s}`]} to={j[`foot${s}`]} width={2.5} endWidth={1.4} fill={pants} />
      <g transform={`translate(${j[`foot${s}`][0]} ${j[`foot${s}`][1]}) scale(${front ? (s === 'L' ? -1 : 1) : side} 1)`}>
        <path d="M -1.5 -2.5 Q 1 -3 2.5 -1 L 5.2 0 Q 6 2 4.6 2 L -2 2 Z" fill="#e1e8eb" stroke="#344653" strokeWidth=".5" />
        <path d="M -1.5 1.4 L 4.9 1.4" stroke="#2fe3a0" strokeWidth=".8" />
      </g>
    </g>
  )

  return (
    <g data-human-body="true">
      <defs>
        <linearGradient id={`${id}-skin`} x1="0" y1="0" x2="1" y2=".3">
          <stop stopColor="#e9bea0" /><stop offset=".5" stopColor="#c78e70" /><stop offset="1" stopColor="#895d4d" />
        </linearGradient>
        <linearGradient id={`${id}-shirt`}>
          <stop stopColor="#70e8c3" /><stop offset=".5" stopColor="#29ad8a" /><stop offset="1" stopColor="#166859" />
        </linearGradient>
        <linearGradient id={`${id}-pants`}>
          <stop stopColor="#526a83" /><stop offset=".5" stopColor="#31465d" /><stop offset="1" stopColor="#1b293d" />
        </linearGradient>
      </defs>

      <g opacity={front ? 1 : .66}>{leg('L')}{front ? null : arm('L')}</g>
      {leg('R')}

      <Segment from={j.neck} to={j.head} width={1.9} endWidth={1.7} fill={skin} />
      <g transform={`translate(${j.hip[0]} ${j.hip[1]}) rotate(${angle})`}>
        <path
          d={`M ${-width * .64} 2 Q ${-width * .95} ${-torsoLength * .35} ${-width} ${-torsoLength + 5} Q ${-width} ${-torsoLength + 2} -2 ${-torsoLength + 1} Q 0 ${-torsoLength + 4} 2 ${-torsoLength + 1} Q ${width} ${-torsoLength + 2} ${width} ${-torsoLength + 5} Q ${width * .95} ${-torsoLength * .35} ${width * .64} 2 Z`}
          fill={shirt} stroke="#174d47" strokeWidth=".6"
        />
        <path d={`M ${-width * .6} -1 Q 0 1 ${width * .6} -1 L ${width * .7} 3 Q 0 5 ${-width * .7} 3 Z`} fill={pants} />
        <path d={`M ${-width * .62} ${-torsoLength + 6} Q ${-width * .5} ${-torsoLength * .4} ${-width * .38} -3`} fill="none" stroke="#b5ffe4" strokeWidth=".6" opacity=".45" />
        <path d={`M 0 ${-torsoLength * .48} L ${width * .55} ${-torsoLength * .43}`} stroke="#155e50" strokeWidth=".6" opacity=".55" />
      </g>

      <g transform={`translate(${j.head[0]} ${j.head[1]}) rotate(${Math.atan2(j.head[1] - j.neck[1], j.head[0] - j.neck[0]) * 180 / Math.PI + 90})`}>
        <ellipse rx="3.8" ry="4.8" fill={skin} stroke="#8b6251" strokeWidth=".45" />
        <path d="M -3.8 -1 Q -4.6 -5.8 0 -5.5 Q 4.4 -5.4 3.8 -1 L 2 -2.8 Q 0 -1.5 -3 -2.1 Z" fill="#26313c" />
        {back ? (
          <path d="M -3.8 -1 Q -4.6 -5.8 0 -5.5 Q 4.4 -5.4 3.8 -1 L 2.5 2.5 Q 0 3 -2.5 2.5 Z" fill="#26313c" />
        ) : front ? (
          <path d="M -1.7 -.1 h .5 M 1.2 -.1 h .5 M -.8 2.5 q .8 .4 1.6 0" stroke="#63463c" strokeWidth=".6" fill="none" />
        ) : (
          <g transform={`scale(${side} 1)`}>
            <path d="M 3 -.5 l 1.4 1.5 -1.4 .4" fill="#c78e70" />
            <circle cx="2.1" cy="-.5" r=".38" fill="#343036" />
            <ellipse cx="-1.8" cy=".7" rx=".7" ry="1" fill="#b47c61" />
          </g>
        )}
      </g>
      {front ? arm('L') : null}
      {arm('R')}
    </g>
  )
}