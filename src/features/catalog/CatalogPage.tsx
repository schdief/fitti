import { Search, Settings, SlidersHorizontal, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui'
import { FilterChip, FilterSheet } from '@/features/catalog/FilterSheet'
import { PlanCard } from '@/features/catalog/PlanCard'
import {
  activeFilterCount,
  availableEquipment,
  DURATION_BUCKETS,
  filterPlans,
  filtersFromParams,
  filtersToParams,
  toggle,
} from '@/features/catalog/filters'
import type { CatalogFilters } from '@/features/catalog/filters'
import { useCatalog } from '@/features/catalog/useCatalog'
import { EQUIPMENT_LABELS, LEVEL_LABELS, MUSCLE_GROUPS } from '@/lib/plan/enums'

export function CatalogPage() {
  const { entries, error, loading } = useCatalog()
  const [searchParams, setSearchParams] = useSearchParams()
  const [sheetOpen, setSheetOpen] = useState(false)

  const filters = useMemo(() => filtersFromParams(searchParams), [searchParams])

  const update = (next: CatalogFilters) => {
    setSearchParams(filtersToParams(next), { replace: true })
  }

  const visible = useMemo(() => (entries ? filterPlans(entries, filters) : []), [entries, filters])
  const equipmentOptions = useMemo(() => (entries ? availableEquipment(entries) : []), [entries])
  const activeCount = activeFilterCount(filters)

  return (
    <>
      <PageHeader
        title="Trainingspläne"
        action={
          <Link
            to="/settings"
            aria-label="Einstellungen"
            className="-mr-2 flex size-10 items-center justify-center rounded-full text-fg-muted active:bg-surface"
          >
            <Settings size={22} aria-hidden />
          </Link>
        }
      />

      <div className="mx-auto max-w-lg px-4 py-4">
        <div className="flex gap-2">
          <label className="relative flex-1">
            <Search
              size={18}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-faint"
            />
            <span className="sr-only">Pläne durchsuchen</span>
            <input
              type="search"
              value={filters.query}
              onChange={(event) => update({ ...filters, query: event.target.value })}
              placeholder="Suchen"
              className="w-full rounded-card border border-line bg-surface py-2.5 pl-10 pr-3 text-fg placeholder:text-fg-faint"
            />
          </label>

          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="relative flex items-center gap-2 rounded-card border border-line bg-surface px-3 text-sm font-medium text-fg"
          >
            <SlidersHorizontal size={18} aria-hidden />
            Filter
            {activeCount > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-fg">
                {activeCount}
              </span>
            ) : null}
          </button>
        </div>

        {activeCount > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {filters.durations.map((id) => (
              <ActiveChip
                key={id}
                label={DURATION_BUCKETS.find((bucket) => bucket.id === id)?.label ?? id}
                onRemove={() => update({ ...filters, durations: toggle(filters.durations, id) })}
              />
            ))}
            {filters.groups.map((id) => (
              <ActiveChip
                key={id}
                label={MUSCLE_GROUPS.find((group) => group.id === id)?.label ?? id}
                onRemove={() => update({ ...filters, groups: toggle(filters.groups, id) })}
              />
            ))}
            {filters.levels.map((level) => (
              <ActiveChip
                key={level}
                label={LEVEL_LABELS[level]}
                onRemove={() => update({ ...filters, levels: toggle(filters.levels, level) })}
              />
            ))}
            {filters.equipment.map((item) => (
              <ActiveChip
                key={item}
                label={EQUIPMENT_LABELS[item]}
                onRemove={() => update({ ...filters, equipment: toggle(filters.equipment, item) })}
              />
            ))}
          </ul>
        ) : null}

        {loading ? <p className="mt-6 text-center text-sm text-fg-muted">Lädt …</p> : null}

        {error ? (
          <Card className="mt-4 p-6 text-center">
            <p className="text-sm text-danger">{error}</p>
          </Card>
        ) : null}

        {entries && visible.length === 0 ? (
          <Card className="mt-4 p-6 text-center">
            <h2 className="text-base font-semibold">Kein Plan passt</h2>
            <p className="mt-1 text-sm text-fg-muted">
              {activeCount > 0 || filters.query
                ? 'Filter lockern oder Suchbegriff ändern.'
                : 'Neue Pläne entstehen mit dem Copilot-Skill unter public/plans/.'}
            </p>
            {activeCount > 0 ? (
              <div className="mt-3 flex justify-center">
                <FilterChip
                  label="Filter zurücksetzen"
                  active={false}
                  onClick={() =>
                    update({ ...filters, durations: [], groups: [], levels: [], equipment: [] })
                  }
                />
              </div>
            ) : null}
          </Card>
        ) : null}

        {visible.length > 0 ? (
          <>
            <p className="mt-4 text-xs text-fg-faint">
              {visible.length === 1 ? '1 Plan' : `${visible.length} Pläne`}
            </p>
            <ul className="mt-2 space-y-3">
              {visible.map((entry) => (
                <li key={entry.id}>
                  <PlanCard entry={entry} />
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>

      <FilterSheet
        open={sheetOpen}
        filters={filters}
        equipmentOptions={equipmentOptions}
        resultCount={visible.length}
        onChange={update}
        onClose={() => setSheetOpen(false)}
      />
    </>
  )
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onRemove}
        className="flex items-center gap-1 rounded-full bg-accent/15 py-1 pl-3 pr-2 text-xs font-medium text-accent"
      >
        {label}
        <X size={13} aria-hidden />
        <span className="sr-only">Filter entfernen</span>
      </button>
    </li>
  )
}
