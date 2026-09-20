import type { Figure, JointMap } from '../../lib/plan/schema.ts'
import type { Joint } from '../../lib/plan/enums.ts'

/** Parent before child. Static contact points are kept in world coordinates. */
const CHAIN: readonly (readonly [Joint, Joint])[] = [
  ['hip', 'neck'], ['neck', 'head'],
  ['neck', 'shoulderL'], ['shoulderL', 'elbowL'], ['elbowL', 'handL'],
  ['neck', 'shoulderR'], ['shoulderR', 'elbowR'], ['elbowR', 'handR'],
  ['hip', 'kneeL'], ['kneeL', 'footL'],
  ['hip', 'kneeR'], ['kneeR', 'footR'],
]

export function resolvePose(figure: Figure, pose: 'start' | 'mid'): JointMap {
  return pose === 'start' || !figure.poses.mid
    ? figure.poses.start
    : { ...figure.poses.start, ...figure.poses.mid }
}

/**
 * Interpolates projected bone angles, not joint coordinates. A raised arm
 * follows an arc instead of collapsing through the shoulder. Projected lengths
 * may vary (e.g. front-view fly); unchanged feet/support points stay anchored.
 * This is 2D articulation, not a biomechanical/3D reconstruction.
 */
export function lerpPose(figure: Figure, mix: number): JointMap {
  const start = figure.poses.start
  if (!figure.poses.mid || mix <= 0) return start
  const end = resolvePose(figure, 'mid')
  if (mix >= 1) return end
  const joints: JointMap = { ...start }
  joints.hip = [
    start.hip[0] + (end.hip[0] - start.hip[0]) * mix,
    start.hip[1] + (end.hip[1] - start.hip[1]) * mix,
  ]

  for (const [parent, child] of CHAIN) {
    const from = start[child]
    const to = end[child]
    if (from[0] === to[0] && from[1] === to[1]) {
      joints[child] = from
      continue
    }
    const ax = from[0] - start[parent][0]
    const ay = from[1] - start[parent][1]
    const bx = to[0] - end[parent][0]
    const by = to[1] - end[parent][1]
    const angle = Math.atan2(ay, ax)
    const delta = Math.atan2(Math.sin(Math.atan2(by, bx) - angle), Math.cos(Math.atan2(by, bx) - angle))
    const length = Math.hypot(ax, ay) * (1 - mix) + Math.hypot(bx, by) * mix
    joints[child] = [
      joints[parent][0] + Math.cos(angle + delta * mix) * length,
      joints[parent][1] + Math.sin(angle + delta * mix) * length,
    ]
  }
  return joints
}