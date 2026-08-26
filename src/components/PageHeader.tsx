import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

export function PageHeader({
  title,
  subtitle,
  action,
  back = false,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  back?: boolean
}) {
  const navigate = useNavigate()

  return (
    <header className="pad-safe-top sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
        {back ? (
          <button
            type="button"
            aria-label="Zurück"
            onClick={() => navigate(-1)}
            className="-ml-2 flex size-10 items-center justify-center rounded-full text-fg-muted active:bg-surface"
          >
            <ChevronLeft size={24} aria-hidden />
          </button>
        ) : null}

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[22px] font-semibold tracking-tight">{title}</h1>
          {subtitle ? <p className="truncate text-xs text-fg-muted">{subtitle}</p> : null}
        </div>

        {action}
      </div>
    </header>
  )
}
