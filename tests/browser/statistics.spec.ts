import { expect, test } from '@playwright/test'

test('statistics is the third tab, shows stored training and supports weekly hours', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-20T18:00:00Z'))
  await page.goto('#/')
  const navigation = page.getByRole('navigation', { name: 'Hauptnavigation' })
  await expect(navigation.getByRole('link')).toHaveCount(3)
  await navigation.getByRole('link', { name: 'Statistik', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Statistik', exact: true })).toBeVisible()
  await expect(page.getByText('Noch keine Trainings gespeichert.', { exact: false })).toBeVisible()
  const metrics = page.getByLabel('Trainingskennzahlen').locator('dd')
  await expect(metrics).toHaveText(['0', '0,0', '0,0', '0'])

  await page.evaluate(async () => {
    const path = '/fitti/src/features/logbook/db.ts'
    const { saveSession } = await import(path)
    for (const day of [7, 12, 17]) {
      const at = new Date(2026, 8, day, 12).toISOString()
      await saveSession({
        sessionId: `statistics-${day}`, planId: 'ruecken-gesaess-maschinen-40', planTitle: 'Test',
        startedAt: at, endedAt: at, durationSec: 3600, completed: day !== 17,
        results: [{ exerciseId: 'row', exerciseName: 'Rudern', setIndex: 0, reps: 12, durationSec: null, weightKg: 30, at }],
      })
    }
    window.dispatchEvent(new Event('focus'))
  })

  await expect(metrics).toHaveText(['3', '3,0', '1,5', '3'])
  await expect(page.getByRole('img', { name: /Trainingseinheiten der letzten/ })).toBeVisible()
  await page.getByRole('radio', { name: 'Stunden', exact: true }).click()
  await expect(page.getByRole('img', { name: /Trainingsstunden der letzten/ })).toBeVisible()
  await page.screenshot({ path: test.info().outputPath('statistics.png') })
  await page.getByText('Wochendetails', { exact: true }).click()
  await expect(page.getByRole('table')).toBeVisible()
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(12)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  const navBox = await navigation.boundingBox()
  expect(Math.abs(navBox!.y + navBox!.height - page.viewportSize()!.height)).toBeLessThan(2)
  await page.reload()
  await expect(metrics).toHaveText(['3', '3,0', '1,5', '3'])
})