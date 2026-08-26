// Rendert das Quell-SVG in die von Manifest und iOS benötigten PNG-Größen.
// Aufruf: npm run icons
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = await readFile(resolve(root, 'assets/icon.svg'))
const outDir = resolve(root, 'public/icons')

const targets = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'apple-touch-icon-180.png', size: 180 },
  { file: 'favicon.png', size: 64 },
]

await mkdir(outDir, { recursive: true })

for (const { file, size } of targets) {
  const png = await sharp(source).resize(size, size).png().toBuffer()
  await writeFile(resolve(outDir, file), png)
  console.log(`✓ ${file} (${size}px)`)
}

// Maskable: Motiv auf 60 % skalieren, damit es in jeder Maske innerhalb der Safe-Zone bleibt.
const maskableSize = 512
const inner = Math.round(maskableSize * 0.6)
const innerPng = await sharp(source)
  .resize(inner, inner)
  .flatten({ background: '#0b0f14' })
  .png()
  .toBuffer()

const maskable = await sharp({
  create: {
    width: maskableSize,
    height: maskableSize,
    channels: 4,
    background: '#0b0f14',
  },
})
  .composite([{ input: innerPng, gravity: 'centre' }])
  .png()
  .toBuffer()

await writeFile(resolve(outDir, 'icon-maskable-512.png'), maskable)
console.log('✓ icon-maskable-512.png (512px, maskable)')
