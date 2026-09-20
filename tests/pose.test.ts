import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { figureSchema } from '../src/lib/plan/schema.ts'
import { lerpPose, resolvePose } from '../src/features/figures/pose.ts'

const directory = new URL('../public/figures/', import.meta.url)
for (const file of readdirSync(directory).filter((name) => name.endsWith('.json') && name !== 'index.json')) {
  const figure = figureSchema.parse(JSON.parse(readFileSync(new URL(file, directory), 'utf8')))
  test(`${figure.id}: endpoints, stable contacts and finite joints`, () => {
    assert.deepEqual(lerpPose(figure, 0), figure.poses.start)
    assert.deepEqual(lerpPose(figure, 1), resolvePose(figure, 'mid'))
    const end = resolvePose(figure, 'mid')
    for (let sample = 0; sample <= 40; sample++) {
      const joints = lerpPose(figure, sample / 40)
      for (const key of Object.keys(joints) as (keyof typeof joints)[]) {
        assert(joints[key].every(Number.isFinite))
        assert(joints[key].every((n) => Math.abs(n) < 200))
        if (key !== 'hip' && figure.poses.start[key].every((n, i) => n === end[key][i])) {
          assert.deepEqual(joints[key], figure.poses.start[key])
        }
      }
    }
  })
  if (figure.id === 'chest-supported-y-raise') {
    test('Y-raise arm follows an arc instead of shrinking through the shoulder', () => {
      const joints = lerpPose(figure, .5)
      const length = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1])
      const end = resolvePose(figure, 'mid')
      const expected = (length(figure.poses.start.elbowR, figure.poses.start.shoulderR) + length(end.elbowR, end.shoulderR)) / 2
      assert(Math.abs(length(joints.elbowR, joints.shoulderR) - expected) < .0001)
    })
  }
}