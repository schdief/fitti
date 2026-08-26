/**
 * Erzeugt public/plans/index.json aus den einzelnen Plandateien.
 * Der Katalog lädt nur diesen Index, nicht alle Pläne.
 * Aufruf: npm run catalog
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { countExercises, countSets } from '../src/lib/plan/analysis.ts'
import { planSchema } from '../src/lib/plan/schema.ts'
import type { CatalogEntry } from '../src/lib/plan/schema.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const plansDir = resolve(root, 'public/plans')

const files = (await readdir(plansDir)).filter(
  (file) => file.endsWith('.json') && file !== 'index.json',
)

const entries: CatalogEntry[] = []

for (const file of files) {
  const raw: unknown = JSON.parse(await readFile(resolve(plansDir, file), 'utf8'))
  const result = planSchema.safeParse(raw)

  if (!result.success) {
    console.error(`✗  ${file} ist ungültig, wird übersprungen. Erst "npm run validate" beheben.`)
    process.exitCode = 1
    continue
  }

  const plan = result.data

  entries.push({
    id: plan.id,
    title: plan.title,
    description: plan.description,
    estimatedDurationMin: plan.estimatedDurationMin,
    level: plan.level,
    equipment: plan.equipment,
    targetMuscles: plan.targetMuscles,
    tags: plan.tags,
    exerciseCount: countExercises(plan),
    setCount: countSets(plan),
  })
}

entries.sort((a, b) => a.title.localeCompare(b.title, 'de'))

await writeFile(
  resolve(plansDir, 'index.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), plans: entries }, null, 2)}\n`,
  'utf8',
)

console.log(`✓  index.json mit ${entries.length} Plänen geschrieben`)

const figuresDir = resolve(root, 'public/figures')
const figures = (await readdir(figuresDir))
  .filter((file) => file.endsWith('.json') && file !== 'index.json')
  .map((file) => file.replace(/\.json$/, ''))
  .sort()

await writeFile(
  resolve(figuresDir, 'index.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), figures }, null, 2)}\n`,
  'utf8',
)

console.log(`✓  figures/index.json mit ${figures.length} Figuren geschrieben`)
