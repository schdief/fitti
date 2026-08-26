import { useEffect, useState } from 'react'

import { figureSchema } from '@/lib/plan/schema'
import type { Figure } from '@/lib/plan/schema'

const cache = new Map<string, Figure | null>()
const pending = new Map<string, Promise<Figure | null>>()

export async function loadFigure(exerciseId: string): Promise<Figure | null> {
  if (cache.has(exerciseId)) return cache.get(exerciseId) ?? null

  let request = pending.get(exerciseId)

  if (!request) {
    request = (async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}figures/${exerciseId}.json`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const parsed = figureSchema.safeParse(await response.json())
        const figure = parsed.success ? parsed.data : null

        if (!parsed.success) {
          console.warn(`Figur "${exerciseId}" ist ungültig`, parsed.error.issues)
        }

        cache.set(exerciseId, figure)
        return figure
      } catch {
        cache.set(exerciseId, null)
        return null
      } finally {
        pending.delete(exerciseId)
      }
    })()

    pending.set(exerciseId, request)
  }

  return request
}

export async function loadFigureIndex(): Promise<string[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}figures/index.json`)
  if (!response.ok) return []

  const data = (await response.json()) as { figures?: unknown }
  return Array.isArray(data.figures) ? (data.figures as string[]) : []
}

export function useFigure(exerciseId: string | null) {
  const [figure, setFigure] = useState<Figure | null>(null)
  const [loading, setLoading] = useState(exerciseId !== null)

  useEffect(() => {
    if (!exerciseId) {
      setFigure(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    void loadFigure(exerciseId).then((result) => {
      if (cancelled) return
      setFigure(result)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [exerciseId])

  return { figure, loading }
}
