import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const plan = 'ruecken-gesaess-maschinen-40'

test.beforeEach(async ({ page }, info) => {
  // Desktop WebKit device emulation has no physical notch. Exercise that space
  // explicitly without pretending this reproduces standalone iOS compositor bugs.
  if (info.project.name === 'iphone-webkit') {
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        const style = document.createElement('style')
        style.textContent = '.pad-safe-top { padding-top: 59px !important; } .pad-safe-bottom { padding-bottom: 46px !important; }'
        document.head.append(style)
      }, { once: true })
    })
  }
})

async function fitsWidth(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
}

test('catalogue, logbook, settings and detail fit; navigation stays at the bottom', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  for (const route of ['#/', '#/logbook', '#/settings', `#/plan/${plan}`]) {
    await page.goto(route)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await fitsWidth(page)
    await page.screenshot({ path: test.info().outputPath(`${route === '#/' ? 'catalogue' : route.split('/')[1]}.png`) })
    if (route === '#/' || route === '#/logbook') {
      const bottom = await page.getByRole('navigation').evaluate((nav) => nav.getBoundingClientRect().bottom)
      expect(Math.abs(bottom - (page.viewportSize()?.height ?? 0))).toBeLessThan(2)
    }
  }
  await expect(page.locator('[data-human-body]')).toHaveCount(6)
  // The SVG renderer needs unique gradient/marker IDs even for duplicate exercises.
  expect(await page.locator('svg [id]').evaluateAll((elements) => {
    const ids = elements.map((e) => e.id)
    return ids.length === new Set(ids).size
  })).toBe(true)
  await page.screenshot({ path: test.info().outputPath('plan.png'), fullPage: true })
  expect(errors).toEqual([])
})

test('workout fits with music, preserves input in rest and completes without errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addInitScript(() => {
    localStorage.setItem('fitti.spotify.tokens', JSON.stringify({ accessToken: 'test-only', refreshToken: null, expiresAt: Date.now() + 3600000 }))
  })
  await page.route('https://api.spotify.com/**', (route) => route.fulfill({
    json: { device: { name: 'Testgerät' }, is_playing: true, progress_ms: 90000, item: { name: 'Ein sehr langer Musiktitel für den Layouttest', duration_ms: 240000, artists: [{ name: 'Testinterpret' }] } },
  }))
  await page.goto(`#/plan/${plan}`)
  await expect(page.getByRole('button', { name: 'Los geht’s' })).toBeVisible()
  // Fixture in this test's isolated IndexedDB, never in the user's browser.
  await page.evaluate(async () => {
    const modulePath = '/fitti/src/features/logbook/db.ts'
    const { saveSession } = await import(modulePath)
    const data = await fetch('/fitti/plans/ruecken-gesaess-maschinen-40.json').then((r) => r.json())
    await saveSession({
      sessionId: 'layout-history', planId: data.id, planTitle: data.title,
      startedAt: '2026-09-18T10:00:00Z', endedAt: '2026-09-18T10:40:00Z',
      durationSec: 2400, completed: true,
      results: data.blocks.flatMap((block: { exercises: { exerciseId: string; name: string; sets: { reps: number; targetWeightKg?: number }[] }[] }) =>
        block.exercises.flatMap((exercise) => exercise.sets.map((set, setIndex) => ({
          exerciseId: exercise.exerciseId, exerciseName: exercise.name, setIndex,
          reps: set.reps, durationSec: null, weightKg: set.targetWeightKg ?? null, at: '2026-09-18T10:10:00Z',
        })))),
    })
  })
  await page.reload()
  await page.getByRole('button', { name: 'Los geht’s' }).click()
  await page.getByRole('button', { name: 'Zündung' }).click()
  await expect(page.getByLabel('Musiksteuerung')).toBeVisible()
  await fitsWidth(page)
  await page.screenshot({ path: test.info().outputPath('work.png'), fullPage: true })
  const workHeight = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
  expect(workHeight, 'workout should fit vertically').toBeLessThanOrEqual(1)
  if ((page.viewportSize()?.height ?? 0) >= 740) {
    expect(await page.locator('main').evaluate((main) => main.scrollHeight - main.clientHeight), 'exercise content fits on standard phones').toBeLessThanOrEqual(1)
  }

  // Move from unweighted Back Extensions to the next exercise.
  await page.getByRole('button', { name: 'Überspringen', exact: true }).click()
  await expect(page.getByRole('button', { name: 'kg erhöhen', exact: true })).toBeVisible()
  await expect(page.getByText(/Letztes Mal/)).toBeVisible()
  const stackedInputs = await page.locator('main').evaluate((main) => {
    const image = main.querySelector('.workout-active-figure')!.getBoundingClientRect()
    const outputs = [...main.querySelectorAll('output')].map((element) => element.getBoundingClientRect())
    return outputs.length === 2 && outputs[0].top >= image.bottom && outputs[1].top > outputs[0].bottom
  })
  expect(stackedInputs, 'Wdh and kg stay stacked below the exercise image').toBe(true)
  await fitsWidth(page)
  expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight), 'weighted workout with advice should fit').toBeLessThanOrEqual(1)
  await page.getByRole('button', { name: 'Fertig', exact: true }).click()
  await page.getByRole('button', { name: 'kg erhöhen', exact: true }).click()
  const weight = await page.getByRole('status').last().textContent()
  expect(await page.locator('.next-preview').evaluate((preview) => {
    const text = preview.firstElementChild!.getBoundingClientRect()
    const image = preview.querySelector('.figure-stage')!.getBoundingClientRect()
    return image.top >= text.bottom
  }), 'rest preview image is below its text').toBe(true)
  const next = await page.getByRole('button', { name: 'Weiter', exact: true }).boundingBox()
  const skip = await page.getByRole('button', { name: 'Überspringen', exact: true }).boundingBox()
  expect(skip!.y).toBeGreaterThanOrEqual(next!.y + next!.height)
  await page.screenshot({ path: test.info().outputPath('rest.png'), fullPage: true })
  await fitsWidth(page)
  expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight), 'rest should fit vertically').toBeLessThanOrEqual(1)
  await page.getByRole('button', { name: 'Weiter', exact: true }).click()
  await expect(page.getByRole('status').last()).toHaveText(weight!)
  for (let i = 0; i < 17; i++) {
    await page.getByRole('button', { name: 'Fertig', exact: true }).click()
    if (i < 16) await page.getByRole('button', { name: 'Weiter', exact: true }).click()
  }
  await expect(page.getByRole('heading', { name: 'Geschafft', exact: true })).toBeVisible()
  await fitsWidth(page)
  expect(errors).toEqual([])
})

test('reduced motion leaves animated exercises still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`#/plan/${plan}`)
  const figure = page.locator('[data-human-body]').first()
  await expect(figure).toBeVisible()
  const before = await figure.innerHTML()
  await page.waitForTimeout(250)
  expect(await figure.innerHTML()).toBe(before)
})

test('visible figures move, offscreen figures stop', async ({ page }) => {
  await page.goto(`#/plan/${plan}`)
  const figure = page.locator('[data-human-body]').last()
  await figure.scrollIntoViewIfNeeded()
  const before = await figure.innerHTML()
  await expect.poll(() => figure.innerHTML()).not.toBe(before)
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(figure).not.toBeInViewport()
  // Allow IntersectionObserver to deliver its visibility change.
  await page.waitForTimeout(100)
  const paused = await figure.innerHTML()
  await page.waitForTimeout(250)
  expect(await figure.innerHTML()).toBe(paused)
})