import { CalendarDays, Dumbbell } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Katalog', Icon: Dumbbell },
  { to: '/logbook', label: 'Logbuch', Icon: CalendarDays },
] as const

export function TabLayout() {
  return (
    <div className="flex min-h-app flex-col">
      <main className="flex-1">
        <Outlet />
      </main>

      {/*
        Klebend statt fest positioniert: Safari berechnet `position: fixed`
        erst nach der ersten Scrollbewegung neu, dadurch schwebte die Leiste
        beim Start über dem unteren Rand.
      */}
      <nav className="pad-safe-bottom sticky bottom-0 z-40 border-t border-line bg-bg/85 backdrop-blur-xl">
        <ul className="mx-auto flex max-w-lg">
          {tabs.map(({ to, label, Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end
                className={({ isActive }) =>
                  [
                    'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                    isActive ? 'text-accent' : 'text-fg-faint',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
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
