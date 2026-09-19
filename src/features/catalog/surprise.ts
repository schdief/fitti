import type { PlanHistory } from '@/features/logbook/history'
import type { CatalogEntry } from '@/lib/plan/schema'

/** Ab hier gilt ein Plan als „lange her“ und bekommt volle Punktzahl. */
const MAX_DAYS = 45

/**
 * Wählt einen Plan aus, gewichtet nach Historie: was lange her ist oder selten
 * gemacht wurde, kommt häufiger dran. Bewusst zufällig und nicht deterministisch
 * – sonst wäre es keine Überraschung.
 */
export function pickSurprise(
  entries: CatalogEntry[],
  history: Map<string, PlanHistory>,
): CatalogEntry | undefined {
  if (entries.length === 0) return undefined
  if (entries.length === 1) return entries[0]

  const weights = entries.map((entry) => weightFor(history.get(entry.id)))
  const total = weights.reduce((sum, weight) => sum + weight, 0)

  let ticket = Math.random() * total
  for (let index = 0; index < entries.length; index += 1) {
    ticket -= weights[index]!
    if (ticket <= 0) return entries[index]
  }

  return entries[entries.length - 1]
}

function weightFor(history: PlanHistory | undefined): number {
  if (!history || history.count === 0) return MAX_DAYS

  const days = history.lastAt
    ? Math.floor((Date.now() - new Date(history.lastAt).getTime()) / 86_400_000)
    : MAX_DAYS

  // Je länger her, desto eher. Seltene Pläne bekommen zusätzlich Gewicht.
  const recency = Math.min(MAX_DAYS, Math.max(1, days))
  const rarity = MAX_DAYS / (history.count + 1)

  return recency + rarity
}
