import { PageHeader } from '@/components/PageHeader'
import { settingsSections } from '@/features/settings/sections'

export function SettingsPage() {
  return (
    <div className="min-h-dvh">
      <PageHeader title="Einstellungen" back />

      <div className="pad-safe-bottom mx-auto max-w-lg space-y-6 px-4 py-4">
        {settingsSections.map(({ id, title, description, Component }) => (
          <section key={id} aria-labelledby={`settings-${id}`}>
            <h2
              id={`settings-${id}`}
              className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-fg-faint"
            >
              {title}
            </h2>
            {description ? <p className="mb-2 px-1 text-xs text-fg-muted">{description}</p> : null}
            <Component />
          </section>
        ))}
      </div>
    </div>
  )
}
