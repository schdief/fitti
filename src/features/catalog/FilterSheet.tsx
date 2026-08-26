import { X } from 'lucide-react'
import type { ReactNode } from 'react'

import { ActionButton } from '@/components/ui'
import { DURATION_BUCKETS, toggle } from '@/features/catalog/filters'
import type { CatalogFilters } from '@/features/catalog/filters'
import { EQUIPMENT_LABELS, LEVELS, LEVEL_LABELS, MUSCLE_GROUPS } from '@/lib/plan/enums'
import type { Equipment } from '@/lib/plan/enums'

export function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-accent text-accent-fg' : 'bg-surface-hi text-fg-muted'
      }`}
    >
      {label}
    </button>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-faint">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  )
}

export function FilterSheet({
  open,
  filters,
  equipmentOptions,
  resultCount,
  onChange,
  onClose,
}: {
  open: boolean
  filters: CatalogFilters
  equipmentOptions: Equipment[]
  resultCount: number
  onChange: (next: CatalogFilters) => void
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Filter schließen"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />

      <div className="pad-safe-bottom relative max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t border-line bg-surface">
        <div className="sticky top-0 flex items-center gap-2 border-b border-line bg-surface px-4 py-3">
          <h2 className="flex-1 text-lg font-semibold">Filter</h2>
          <button
            type="button"
            onClick={() => onChange({ ...filters, durations: [], groups: [], levels: [], equipment: [] })}
            className="text-sm text-fg-muted"
          >
            Zurücksetzen
          </button>
          <button
            type="button"
            aria-label="Schließen"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full text-fg-muted active:bg-surface-hi"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="space-y-5 px-4 py-4">
          <Group title="Dauer">
            {DURATION_BUCKETS.map((bucket) => (
              <FilterChip
                key={bucket.id}
                label={bucket.label}
                active={filters.durations.includes(bucket.id)}
                onClick={() => onChange({ ...filters, durations: toggle(filters.durations, bucket.id) })}
              />
            ))}
          </Group>

          <Group title="Muskelgruppen">
            {MUSCLE_GROUPS.map((group) => (
              <FilterChip
                key={group.id}
                label={group.label}
                active={filters.groups.includes(group.id)}
                onClick={() => onChange({ ...filters, groups: toggle(filters.groups, group.id) })}
              />
            ))}
          </Group>

          <Group title="Level">
            {LEVELS.map((level) => (
              <FilterChip
                key={level}
                label={LEVEL_LABELS[level]}
                active={filters.levels.includes(level)}
                onClick={() => onChange({ ...filters, levels: toggle(filters.levels, level) })}
              />
            ))}
          </Group>

          {equipmentOptions.length > 0 ? (
            <Group title="Equipment – nur Pläne, die damit auskommen">
              {equipmentOptions.map((item) => (
                <FilterChip
                  key={item}
                  label={EQUIPMENT_LABELS[item]}
                  active={filters.equipment.includes(item)}
                  onClick={() => onChange({ ...filters, equipment: toggle(filters.equipment, item) })}
                />
              ))}
            </Group>
          ) : null}
        </div>

        <div className="sticky bottom-0 border-t border-line bg-surface px-4 py-3">
          <ActionButton variant="primary" onClick={onClose} className="w-full">
            {resultCount === 1 ? '1 Plan anzeigen' : `${resultCount} Pläne anzeigen`}
          </ActionButton>
        </div>
      </div>
    </div>
  )
}
