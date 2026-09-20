import { CalendarDays, Dumbbell } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Katalog', Icon: Dumbbell },
  { to: '/logbook', label: 'Logbuch', Icon: CalendarDays },
] as const

export function TabLayout() {
  return (
    <div className="tab-shell">
      <main className="min-h-0 overflow-y-auto overscroll-y-contain">
        <Outlet />
      </main>

      <nav aria-label="Hauptnavigation" className="pad-safe-bottom z-40 border-t border-line bg-surface">
        <ul className="mx-auto flex max-w-lg">
          {tabs.map(({ to, label, Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end
                className={({ isActive }) =>
                  [
                    'relative flex min-h-16 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors',
                    isActive ? 'text-accent' : 'text-fg-faint',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive ? <span className="absolute inset-x-1/3 top-0 h-0.5 rounded-full bg-accent" aria-hidden /> : null}
                    <Icon size={22} strokeWidth={isActive ? 2.4 : 1.9} aria-hidden />
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
