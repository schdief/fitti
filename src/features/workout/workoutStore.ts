import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { SetResult } from '@/features/logbook/db'

export type WorkoutPhase = 'ready' | 'work' | 'input' | 'rest' | 'done'

interface ActiveWorkout {
  planId: string
  planTitle: string
  sessionId: string
  startedAt: number
  /** Reihenfolge laut Plan, unveränderlich. Grundlage für die Fortschrittsanzeige. */
  planOrder: string[]
  /** Schlüssel der Sätze in der aktuellen Abarbeitungsreihenfolge. */
  order: string[]
  /** Nach hinten geschobene Sätze, damit sie als übersprungen erkennbar bleiben. */
  deferred: string[]
  stepIndex: number
  phase: WorkoutPhase
  /** Zielzeitpunkt als Zeitstempel der Wanduhr, nicht als Restdauer. */
  endsAt: number | null
  plannedRestSec: number
  results: SetResult[]
  endedAt: number | null
}

interface WorkoutActions {
  start: (planId: string, planTitle: string, order: string[]) => void
  setOrder: (order: string[]) => void
  deferSteps: (keys: string[]) => void
  recallSteps: (keys: string[], fromIndex: number) => void
  beginWork: (durationSec: number | null) => void
  finishWork: () => void
  submitResult: (result: SetResult) => void
  startRest: (restSec: number) => void
  extendRest: (seconds: number) => void
  goToStep: (stepIndex: number) => void
  finish: () => void
  discard: () => void
}

const empty: ActiveWorkout | null = null

export const useWorkout = create<{ active: ActiveWorkout | null } & WorkoutActions>()(
  persist(
    (set) => ({
      active: empty,

      start: (planId, planTitle, order) =>
        set({
          active: {
            planId,
            planTitle,
            sessionId: crypto.randomUUID(),
            startedAt: Date.now(),
            planOrder: order,
            order,
            deferred: [],
            stepIndex: 0,
            phase: 'ready',
            endsAt: null,
            plannedRestSec: 0,
            results: [],
            endedAt: null,
          },
        }),

      setOrder: (order) =>
        set((state) =>
          state.active
            ? { active: { ...state.active, planOrder: order, order, deferred: [] } }
            : state,
        ),

      /**
       * Schiebt Sätze ans Ende der Warteschlange und merkt sie als übersprungen.
       *
       * Verschoben wird nur, was jetzt übersprungen wird. Früher wurden alle je
       * markierten Sätze erneut einsortiert – sobald hinten ausschließlich solche
       * standen, blieb nichts stehen und das Überspringen tat gar nichts mehr.
       */
      deferSteps: (keys) =>
        set((state) => {
          if (!state.active) return state

          const { order, stepIndex, deferred, planOrder } = state.active

          const done = order.slice(0, stepIndex)
          const upcoming = order.slice(stepIndex)
          const moved = upcoming.filter((key) => keys.includes(key))
          const stays = upcoming.filter((key) => !keys.includes(key))

          if (moved.length === 0 || stays.length === 0) return state

          // Innerhalb der Übung die Satzreihenfolge des Plans behalten.
          const planPosition = new Map(planOrder.map((key, index) => [key, index]))
          moved.sort((a, b) => (planPosition.get(a) ?? 0) - (planPosition.get(b) ?? 0))

          return {
            active: {
              ...state.active,
              order: [...done, ...stays, ...moved],
              deferred: [...new Set([...deferred, ...keys])],
            },
          }
        }),

      /**
       * Gegenstück zu deferSteps: holt verschobene Sätze wieder nach vorn und
       * nimmt die Markierung zurück.
       */
      recallSteps: (keys, fromIndex) =>
        set((state) => {
          if (!state.active) return state

          const { order, deferred } = state.active
          const head = order.slice(0, fromIndex)
          const tail = order.slice(fromIndex)
          const moved = tail.filter((key) => keys.includes(key))
          const stays = tail.filter((key) => !keys.includes(key))

          if (moved.length === 0) return state

          return {
            active: {
              ...state.active,
              order: [...head, ...moved, ...stays],
              deferred: deferred.filter((key) => !keys.includes(key)),
            },
          }
        }),

      beginWork: (durationSec) =>
        set((state) =>
          state.active
            ? {
                active: {
                  ...state.active,
                  phase: 'work',
                  endsAt: durationSec ? Date.now() + durationSec * 1000 : null,
                  // Die Trainingszeit läuft erst ab dem ersten Satz, nicht schon
                  // in der Startansicht.
                  startedAt:
                    state.active.phase === 'ready' ? Date.now() : state.active.startedAt,
                },
              }
            : state,
        ),

      finishWork: () =>
        set((state) =>
          state.active ? { active: { ...state.active, phase: 'input', endsAt: null } } : state,
        ),

      submitResult: (result) =>
        set((state) =>
          state.active
            ? { active: { ...state.active, results: [...state.active.results, result] } }
            : state,
        ),

      startRest: (restSec) =>
        set((state) =>
          state.active
            ? {
                active: {
                  ...state.active,
                  phase: 'rest',
                  endsAt: Date.now() + restSec * 1000,
                  plannedRestSec: restSec,
                },
              }
            : state,
        ),

      extendRest: (seconds) =>
        set((state) =>
          state.active?.endsAt
            ? {
                active: {
                  ...state.active,
                  endsAt: state.active.endsAt + seconds * 1000,
                  plannedRestSec: state.active.plannedRestSec + seconds,
                },
              }
            : state,
        ),

      goToStep: (stepIndex) =>
        set((state) =>
          state.active
            ? { active: { ...state.active, stepIndex, phase: 'work', endsAt: null } }
            : state,
        ),

      finish: () =>
        set((state) =>
          state.active
            ? { active: { ...state.active, phase: 'done', endsAt: null, endedAt: Date.now() } }
            : state,
        ),

      discard: () => set({ active: null }),
    }),
    {
      // Überlebt Neuladen und Absturz: das Training lässt sich fortsetzen.
      name: 'fitti.workout.active',
      partialize: ({ active }) => ({ active }),
    },
  ),
)
