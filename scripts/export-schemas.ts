/**
 * Exportiert die Zod-Schemata als JSON Schema für den Copilot-Skill.
 * Aufruf: npm run schema
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { z } from 'zod'

import {
  BLOCK_TYPES,
  EQUIPMENT,
  EQUIPMENT_LABELS,
  JOINTS,
  LEVELS,
  MUSCLES,
  MUSCLE_LABELS,
  PROP_TYPES,
} from '../src/lib/plan/enums.ts'
import { figureSchema, planSchema } from '../src/lib/plan/schema.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const referenceDir = resolve(root, '.github/skills/trainingsplan-erstellen/reference')

await mkdir(referenceDir, { recursive: true })

const targets = [
  { file: 'plan.schema.json', schema: planSchema },
  { file: 'figure.schema.json', schema: figureSchema },
] as const

for (const { file, schema } of targets) {
  const jsonSchema = z.toJSONSchema(schema, { io: 'input' })
  await writeFile(resolve(referenceDir, file), `${JSON.stringify(jsonSchema, null, 2)}\n`, 'utf8')
  console.log(`✓  ${file}`)
}

const vocabulary = [
  '# Erlaubte Werte',
  '',
  'Diese Listen sind abschließend. Werte, die hier nicht stehen, lässt die Validierung nicht zu.',
  '',
  '## Muskeln (`primaryMuscles`, `secondaryMuscles`, `targetMuscles`, `emphasis`)',
  '',
  '| Wert | Bedeutung |',
  '| --- | --- |',
  ...MUSCLES.map((muscle) => `| \`${muscle}\` | ${MUSCLE_LABELS[muscle]} |`),
  '',
  '## Equipment (`equipment`)',
  '',
  '| Wert | Bedeutung |',
  '| --- | --- |',
  ...EQUIPMENT.map((item) => `| \`${item}\` | ${EQUIPMENT_LABELS[item]} |`),
  '',
  '## Weitere Aufzählungen',
  '',
  `- \`level\`: ${LEVELS.map((value) => `\`${value}\``).join(', ')}`,
  `- \`blocks[].type\`: ${BLOCK_TYPES.map((value) => `\`${value}\``).join(', ')}`,
  '- `mode`: `reps`, `time`',
  `- Gelenke: ${JOINTS.map((value) => `\`${value}\``).join(', ')}`,
  `- Requisiten: ${PROP_TYPES.map((value) => `\`${value}\``).join(', ')}`,
  '',
].join('\n')

await writeFile(resolve(referenceDir, 'vocabulary.md'), vocabulary, 'utf8')
console.log('✓  vocabulary.md')
