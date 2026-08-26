import {
  EQUIPMENT_LABELS,
  LEVEL_LABELS,
  MUSCLE_GROUPS,
  MUSCLE_LABELS,
  MUSCLE_SEARCH_TERMS,
} from '@/lib/plan/enums'
import type { Equipment, MuscleGroupId, PlanLevel } from '@/lib/plan/enums'
import type { CatalogEntry } from '@/lib/plan/schema'

export const DURATION_BUCKETS = [
  { id: 'short', label: 'bis 20 min', min: 0, max: 20 },
  { id: 'medium', label: '21–40 min', min: 21, max: 40 },
  { id: 'long', label: '41–60 min', min: 41, max: 60 },
  { id: 'xl', label: 'über 60 min', min: 61, max: Infinity },
] as const

export type DurationBucketId = (typeof DURATION_BUCKETS)[number]['id']

export interface CatalogFilters {
  query: string
  durations: DurationBucketId[]
  groups: MuscleGroupId[]
  levels: PlanLevel[]
  equipment: Equipment[]
}

export const emptyFilters: CatalogFilters = {
  query: '',
  durations: [],
  groups: [],
  levels: [],
  equipment: [],
}

function readList<T extends string>(params: URLSearchParams, key: string): T[] {
  const raw = params.get(key)
  return raw ? (raw.split(',').filter(Boolean) as T[]) : []
}

export function filtersFromParams(params: URLSearchParams): CatalogFilters {
  return {
    query: params.get('q') ?? '',
    durations: readList<DurationBucketId>(params, 'd'),
    groups: readList<MuscleGroupId>(params, 'm'),
    levels: readList<PlanLevel>(params, 'l'),
    equipment: readList<Equipment>(params, 'e'),
  }
}

export function filtersToParams(filters: CatalogFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.query.trim()) params.set('q', filters.query.trim())
  if (filters.durations.length) params.set('d', filters.durations.join(','))
  if (filters.groups.length) params.set('m', filters.groups.join(','))
  if (filters.levels.length) params.set('l', filters.levels.join(','))
  if (filters.equipment.length) params.set('e', filters.equipment.join(','))
  return params
}

export function activeFilterCount(filters: CatalogFilters): number {
  return (
    filters.durations.length +
    filters.groups.length +
    filters.levels.length +
    filters.equipment.length
  )
}

export function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value]
}

function musclesOfGroups(groups: MuscleGroupId[]): Set<string> {
  const muscles = new Set<string>()
  for (const group of MUSCLE_GROUPS) {
    if (!groups.includes(group.id)) continue
    for (const muscle of group.muscles) muscles.add(muscle)
  }
  return muscles
}

/** Klein schreiben und Umlaute abbauen, damit "gesass" auch "Gesäß" findet. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .replaceAll('ß', 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Alles, worin gesucht wird: Titel, Beschreibung, Tags, Muskeln, Equipment, Level. */
function searchIndex(entry: CatalogEntry): string {
  return normalize(
    [
      entry.title,
      entry.description ?? '',
      ...entry.tags,
      ...entry.targetMuscles.flatMap((muscle) => [
        MUSCLE_LABELS[muscle],
        ...MUSCLE_SEARCH_TERMS[muscle],
      ]),
      ...entry.equipment.map((item) => EQUIPMENT_LABELS[item]),
      LEVEL_LABELS[entry.level],
    ].join(' '),
  )
}

export function filterPlans(entries: CatalogEntry[], filters: CatalogFilters): CatalogEntry[] {
  const query = normalize(filters.query.trim())
  const wantedMuscles = musclesOfGroups(filters.groups)

  return entries.filter((entry) => {
    if (query && !searchIndex(entry).includes(query)) return false

    if (filters.durations.length > 0) {
      const matches = DURATION_BUCKETS.filter((bucket) => filters.durations.includes(bucket.id)).some(
        (bucket) =>
          entry.estimatedDurationMin >= bucket.min && entry.estimatedDurationMin <= bucket.max,
      )
      if (!matches) return false
    }

    // Mehrere Muskelgruppen sind eine Oder-Verknüpfung: der Plan muss mindestens
    // eine davon treffen. Das liefert brauchbarere Treffer als eine Und-Suche.
    if (wantedMuscles.size > 0) {
      if (!entry.targetMuscles.some((muscle) => wantedMuscles.has(muscle))) return false
    }

    if (filters.levels.length > 0 && !filters.levels.includes(entry.level)) return false

    if (filters.equipment.length > 0) {
      if (!filters.equipment.every((item) => entry.equipment.includes(item))) return false
    }

    return true
  })
}

/** Equipment-Werte, die im aktuellen Katalog überhaupt vorkommen. */
export function availableEquipment(entries: CatalogEntry[]): Equipment[] {
  const items = new Set<Equipment>()
  for (const entry of entries) {
    for (const item of entry.equipment) items.add(item)
  }
  return [...items].sort()
}
