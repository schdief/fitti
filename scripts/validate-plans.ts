/**
 * Prüft alle Trainingspläne und Figuren gegen das Schema und die Querverweise.
 * Aufruf: npm run validate
 */
import { readdir, readFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  collectEquipment,
  collectExerciseIds,
  collectPrimaryMuscles,
  estimatePlanSeconds,
} from '../src/lib/plan/analysis.ts'
import { figureSchema, planSchema } from '../src/lib/plan/schema.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const plansDir = resolve(root, 'public/plans')
const figuresDir = resolve(root, 'public/figures')

const errors: string[] = []
const warnings: string[] = []

function fail(file: string, message: string): void {
  errors.push(`${file}: ${message}`)
}

function warn(file: string, message: string): void {
  warnings.push(`${file}: ${message}`)
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function jsonFilesIn(dir: string): Promise<string[]> {
  const entries = await readdir(dir).catch(() => [])
  return entries.filter((entry) => entry.endsWith('.json') && entry !== 'index.json')
}

const figureFiles = await jsonFilesIn(figuresDir)
const knownFigures = new Set(figureFiles.map((file) => basename(file, '.json')))

for (const file of figureFiles) {
  const result = figureSchema.safeParse(await readJson(resolve(figuresDir, file)))

  if (!result.success) {
    for (const issue of result.error.issues) {
      fail(`figures/${file}`, `${issue.path.join('.') || '(root)'} – ${issue.message}`)
    }
    continue
  }

  if (result.data.id !== basename(file, '.json')) {
    fail(`figures/${file}`, `id "${result.data.id}" passt nicht zum Dateinamen`)
  }
}

const planFiles = await jsonFilesIn(plansDir)

if (planFiles.length === 0) warn('plans', 'Keine Pläne gefunden')

for (const file of planFiles) {
  const result = planSchema.safeParse(await readJson(resolve(plansDir, file)))

  if (!result.success) {
    for (const issue of result.error.issues) {
      fail(`plans/${file}`, `${issue.path.join('.') || '(root)'} – ${issue.message}`)
    }
    continue
  }

  const plan = result.data

  if (plan.id !== basename(file, '.json')) {
    fail(`plans/${file}`, `id "${plan.id}" passt nicht zum Dateinamen`)
  }

  for (const exerciseId of collectExerciseIds(plan)) {
    if (!knownFigures.has(exerciseId)) {
      fail(`plans/${file}`, `Für "${exerciseId}" fehlt public/figures/${exerciseId}.json`)
    }
  }

  for (const muscle of collectPrimaryMuscles(plan)) {
    if (!plan.targetMuscles.includes(muscle as never)) {
      warn(`plans/${file}`, `targetMuscles enthält "${muscle}" nicht`)
    }
  }

  for (const item of collectEquipment(plan)) {
    if (!plan.equipment.includes(item as never)) {
      warn(`plans/${file}`, `equipment enthält "${item}" nicht`)
    }
  }

  const estimatedMin = Math.round(estimatePlanSeconds(plan) / 60)
  const deviation = Math.abs(estimatedMin - plan.estimatedDurationMin) / plan.estimatedDurationMin

  if (deviation > 0.25) {
    warn(
      `plans/${file}`,
      `estimatedDurationMin ist ${plan.estimatedDurationMin}, gerechnet sind es ${estimatedMin}`,
    )
  }
}

for (const message of warnings) console.warn(`⚠︎  ${message}`)
for (const message of errors) console.error(`✗  ${message}`)

if (errors.length > 0) {
  console.error(`\n${errors.length} Fehler in ${planFiles.length} Plänen, ${figureFiles.length} Figuren.`)
  process.exit(1)
}

console.log(
  `✓  ${planFiles.length} Pläne und ${figureFiles.length} Figuren in Ordnung` +
    (warnings.length > 0 ? `, ${warnings.length} Hinweise` : ''),
)
