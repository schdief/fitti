import { expect, test } from '@playwright/test'

test('catalogue history stays visible and refreshes saved partial sessions', async ({ page }) => {
  await page.goto('#/')
  const history = page.getByLabel('Trainingshistorie')
  await expect(history).toContainText('Noch kein Training gespeichert')

  await page.evaluate(async () => {
    const path = '/fitti/src/features/logbook/db.ts'
    const { saveSession } = await import(path)
    await saveSession({
      sessionId: 'partial-fixture', planId: 'ruecken-gesaess-maschinen-40', planTitle: 'Test',
      startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), durationSec: 180, completed: false,
      results: [{ exerciseId: 'back-extension', exerciseName: 'Back Extensions', setIndex: 0, reps: 12, weightKg: null, durationSec: null, at: new Date().toISOString() }],
    })
  })
  // Same React app/store, not a reload that would hide a stale-cache regression.
  await page.getByRole('link', { name: 'Logbuch', exact: true }).click()
  await page.getByRole('link', { name: 'Katalog', exact: true }).click()
  await expect(history).toContainText('1 × trainiert · zuletzt heute')
  await expect(history).toContainText('Davon 1 × vorzeitig beendet')
  await history.scrollIntoViewIfNeeded()
  await expect(history).toBeInViewport()
  await page.reload()
  await expect(history).toContainText('1 × trainiert · zuletzt heute')

  await page.evaluate(async () => {
    const path = '/fitti/src/features/logbook/db.ts'
    const { saveSession } = await import(path)
    await saveSession({
      sessionId: 'full-fixture', planId: 'ruecken-gesaess-maschinen-40', planTitle: 'Test',
      startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), durationSec: 2580, completed: true,
      results: [{ exerciseId: 'back-extension', exerciseName: 'Back Extensions', setIndex: 0, reps: 12, weightKg: null, durationSec: null, at: new Date().toISOString() }],
    })
    window.dispatchEvent(new Event('focus'))
  })
  await expect(history).toContainText('2 × trainiert · zuletzt heute')
  const card = page.getByRole('link').filter({ has: history })
  await expect(card).toContainText('43 min')
  await expect(history).toContainText('Davon 1 × vorzeitig beendet')
  await page.screenshot({ path: test.info().outputPath('catalogue-history.png') })
})