import { useEffect, useState } from 'react'

import { catalogSchema, planSchema } from '@/lib/plan/schema'
import type { CatalogEntry, Plan } from '@/lib/plan/schema'

let catalogCache: CatalogEntry[] | null = null
const planCache = new Map<string, Plan | null>()

export async function loadCatalog(): Promise<CatalogEntry[]> {
  if (catalogCache) return catalogCache

  const response = await fetch(`${import.meta.env.BASE_URL}plans/index.json`)
  if (!response.ok) throw new Error(`Katalog nicht ladbar (HTTP ${response.status})`)

  const parsed = catalogSchema.safeParse(await response.json())
  if (!parsed.success) throw new Error('Katalog-Index passt nicht zum Schema')

  catalogCache = parsed.data.plans
  return catalogCache
}

export async function loadPlan(planId: string): Promise<Plan | null> {
  if (planCache.has(planId)) return planCache.get(planId) ?? null

  try {
    const response = await fetch(`${import.meta.env.BASE_URL}plans/${planId}.json`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const parsed = planSchema.safeParse(await response.json())
    if (!parsed.success) {
      console.warn(`Plan "${planId}" ist ungültig`, parsed.error.issues)
      planCache.set(planId, null)
      return null
    }

    planCache.set(planId, parsed.data)
    return parsed.data
  } catch {
    planCache.set(planId, null)
    return null
  }
}

export function useCatalog() {
  const [entries, setEntries] = useState<CatalogEntry[] | null>(catalogCache)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (entries) return

    let cancelled = false

    void loadCatalog().then(
      (result) => !cancelled && setEntries(result),
      (cause: unknown) => !cancelled && setError(cause instanceof Error ? cause.message : 'Fehler'),
    )

    return () => {
      cancelled = true
    }
  }, [entries])

  return { entries, error, loading: entries === null && error === null }
}

export function usePlan(planId: string | undefined) {
  const [plan, setPlan] = useState<Plan | null>(planId ? (planCache.get(planId) ?? null) : null)
  const [loading, setLoading] = useState(planId !== undefined && !planCache.has(planId))

  useEffect(() => {
    if (!planId) return

    let cancelled = false
    setLoading(true)

    void loadPlan(planId).then((result) => {
      if (cancelled) return
      setPlan(result)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [planId])

  return { plan, loading }
}
