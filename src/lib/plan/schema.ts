import { z } from 'zod'

import {
  BLOCK_TYPES,
  EQUIPMENT,
  EXERCISE_MODES,
  FIGURE_VIEWS,
  JOINTS,
  LEVELS,
  MUSCLES,
  PROP_TYPES,
} from './enums.ts'

export const PLAN_SCHEMA_VERSION = 1

const idSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Nur Kleinbuchstaben, Ziffern und Bindestriche')
  .min(3)
  .max(60)

const muscleSchema = z.enum(MUSCLES)
const equipmentSchema = z.enum(EQUIPMENT)

export const setSchema = z
  .object({
    reps: z.int().min(1).max(500).optional(),
    durationSec: z.int().min(1).max(3600).optional(),
    /** Vorgabe in Kilogramm. `null` bedeutet: Gewicht wird erfasst, aber nicht vorgegeben. */
    targetWeightKg: z.number().min(0).max(500).nullable().optional(),
    restSec: z.int().min(0).max(900),
    note: z.string().max(120).optional(),
  })
  .strict()

export const exerciseSchema = z
  .object({
    exerciseId: idSchema,
    name: z.string().min(2).max(60),
    mode: z.enum(EXERCISE_MODES),
    usesWeight: z.boolean(),
    primaryMuscles: z.array(muscleSchema).min(1).max(4),
    secondaryMuscles: z.array(muscleSchema).max(6).default([]),
    equipment: z.array(equipmentSchema).default([]),
    /** Bewegungstempo als exzentrisch-pause-konzentrisch, z. B. "2-0-1". */
    tempo: z
      .string()
      .regex(/^\d-\d-\d$/)
      .optional(),
    cues: z.array(z.string().max(90)).max(4).default([]),
    sets: z.array(setSchema).min(1).max(20),
  })
  .strict()
  .superRefine((exercise, ctx) => {
    exercise.sets.forEach((set, index) => {
      if (exercise.mode === 'reps' && set.reps === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['sets', index, 'reps'],
          message: 'Bei mode "reps" ist reps Pflicht',
        })
      }
      if (exercise.mode === 'time' && set.durationSec === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['sets', index, 'durationSec'],
          message: 'Bei mode "time" ist durationSec Pflicht',
        })
      }
      if (!exercise.usesWeight && set.targetWeightKg != null) {
        ctx.addIssue({
          code: 'custom',
          path: ['sets', index, 'targetWeightKg'],
          message: 'targetWeightKg nur setzen, wenn usesWeight true ist',
        })
      }
    })
  })

export const blockSchema = z
  .object({
    type: z.enum(BLOCK_TYPES),
    title: z.string().min(2).max(60),
    /** Anzahl der Durchgänge über alle Übungen des Blocks. */
    rounds: z.int().min(1).max(10).default(1),
    restBetweenRoundsSec: z.int().min(0).max(900).default(0),
    exercises: z.array(exerciseSchema).min(1).max(20),
  })
  .strict()

export const planSchema = z
  .object({
    schemaVersion: z.literal(PLAN_SCHEMA_VERSION),
    id: idSchema,
    title: z.string().min(3).max(60),
    description: z.string().max(300).optional(),
    estimatedDurationMin: z.int().min(5).max(180),
    level: z.enum(LEVELS),
    equipment: z.array(equipmentSchema).min(1),
    targetMuscles: z.array(muscleSchema).min(1).max(8),
    tags: z.array(z.string().max(30)).max(8).default([]),
    /** MET-Wert für die Kalorienschätzung beim Health-Export. */
    metValue: z.number().min(1).max(15).default(4.5),
    blocks: z.array(blockSchema).min(1).max(12),
  })
  .strict()

export type PlanSet = z.infer<typeof setSchema>
export type PlanExercise = z.infer<typeof exerciseSchema>
export type PlanBlock = z.infer<typeof blockSchema>
export type Plan = z.infer<typeof planSchema>

export const catalogEntrySchema = z
  .object({
    id: idSchema,
    title: z.string(),
    description: z.string().optional(),
    estimatedDurationMin: z.int(),
    level: z.enum(LEVELS),
    equipment: z.array(equipmentSchema),
    targetMuscles: z.array(muscleSchema),
    tags: z.array(z.string()),
    exerciseCount: z.int(),
    setCount: z.int(),
  })
  .strict()

export const catalogSchema = z
  .object({
    generatedAt: z.string(),
    plans: z.array(catalogEntrySchema),
  })
  .strict()

export type CatalogEntry = z.infer<typeof catalogEntrySchema>
export type Catalog = z.infer<typeof catalogSchema>

const pointSchema = z.tuple([z.number().min(-20).max(120), z.number().min(-20).max(120)])

/** Vollständige Pose: jedes Gelenk muss gesetzt sein. */
const fullJointMapSchema = z.record(z.enum(JOINTS), pointSchema)
/** Abweichungen gegenüber der Ausgangsposition, nur die bewegten Gelenke. */
const partialJointMapSchema = z.partialRecord(z.enum(JOINTS), pointSchema)

export const propSchema = z
  .object({
    type: z.enum(PROP_TYPES),
    x: z.number().min(-20).max(120).optional(),
    y: z.number().min(-20).max(120).optional(),
    w: z.number().min(1).max(140).optional(),
    h: z.number().min(1).max(140).optional(),
    rot: z.number().min(-180).max(180).default(0),
    /** Requisite folgt einem Gelenk, etwa eine Hantel in der Hand. */
    attachTo: z.enum(JOINTS).optional(),
  })
  .strict()

export const figureSchema = z
  .object({
    id: idSchema,
    view: z.enum(FIGURE_VIEWS),
    facing: z.enum(['left', 'right']).default('right'),
    props: z.array(propSchema).max(8).default([]),
    poses: z
      .object({
        /** Vollständige Ausgangsposition, alle Gelenke. */
        start: fullJointMapSchema,
        /** Nur die Gelenke, die sich gegenüber start bewegen. Bei Halteübungen weglassen. */
        mid: partialJointMapSchema.optional(),
      })
      .strict(),
    /** Bewegungspfeil von start nach mid für dieses Gelenk. */
    arrowJoint: z.enum(JOINTS).optional(),
    emphasis: z.array(muscleSchema).max(4).default([]),
  })
  .strict()
  .superRefine((figure, ctx) => {
    if (figure.arrowJoint && !figure.poses.mid?.[figure.arrowJoint]) {
      ctx.addIssue({
        code: 'custom',
        path: ['arrowJoint'],
        message: 'arrowJoint muss sich in poses.mid bewegen',
      })
    }
  })

export type Figure = z.infer<typeof figureSchema>
export type JointMap = z.infer<typeof fullJointMapSchema>
