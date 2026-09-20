import type { ReactNode } from 'react'

import type { ConnectionState } from '@/lib/types'

const badgeStyles: Record<ConnectionState, { label: string; className: string }> = {
  unconfigured: { label: 'Nicht verbunden', className: 'bg-surface-hi text-fg-muted' },
  connected: { label: 'Verbunden', className: 'bg-accent/15 text-accent' },
  'needs-check': { label: 'Prüfung nötig', className: 'bg-warn/15 text-warn' },
  error: { label: 'Fehler', className: 'bg-danger/15 text-danger' },
}

export function StatusBadge({ state, detail }: { state: ConnectionState; detail?: string }) {
  const { label, className } = badgeStyles[state]
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {detail ? `${label} · ${detail}` : label}
    </span>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-card border border-line bg-surface shadow-sm shadow-black/10 ${className}`}>{children}</div>
  )
}

export function ListRow({
  label,
  hint,
  control,
  onClick,
}: {
  label: string
  hint?: ReactNode
  control?: ReactNode
  onClick?: () => void
}) {
  const content = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] text-fg">{label}</span>
        {hint ? <span className="mt-1 block text-xs leading-relaxed text-fg-muted">{hint}</span> : null}
      </span>
      {control}
    </>
  )

  const className =
    'settings-row flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 text-left not-last:border-b not-last:border-line'

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${className} active:bg-surface-hi`}>
        {content}
      </button>
    )
  }
  return <div className={className}>{content}</div>
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative flex h-11 w-12 shrink-0 items-center"
    >
      <span
        className={`relative h-7 w-12 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-surface-hi'}`}
      >
        <span className={`absolute left-0 top-0.5 size-6 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-[1.375rem]' : 'translate-x-0.5'}`} />
      </span>
    </button>
  )
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (next: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex max-w-full flex-wrap gap-1 rounded-xl bg-surface-hi p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`min-h-11 flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            value === option.value ? 'bg-accent text-accent-fg' : 'text-fg-muted'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function NumberStepper({
  value,
  onChange,
  step,
  min,
  max,
  suffix,
  label,
  placeholder,
}: {
  value: number | null
  onChange: (next: number | null) => void
  step: number
  min: number
  max: number
  suffix?: string
  label: string
  placeholder?: string
}) {
  const clamp = (next: number) => Math.min(max, Math.max(min, Math.round(next * 100) / 100))

  return (
    <div className="flex shrink-0 items-center gap-2" aria-label={label}>
      <button
        type="button"
        aria-label={`${label} verringern`}
        onClick={() => onChange(clamp((value ?? min) - step))}
        className="size-11 rounded-xl bg-surface-hi text-xl leading-none text-fg active:bg-line"
      >
        −
      </button>
      <span className="min-w-16 text-center text-[15px] tabular-nums text-fg">
        {value === null ? (placeholder ?? '–') : `${value}${suffix ? ` ${suffix}` : ''}`}
      </span>
      <button
        type="button"
        aria-label={`${label} erhöhen`}
        onClick={() => onChange(clamp((value ?? min) + step))}
        className="size-11 rounded-xl bg-surface-hi text-xl leading-none text-fg active:bg-line"
      >
        +
      </button>
    </div>
  )
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  autoComplete = 'off',
  type = 'text',
}: {
  label: string
  value: string
  onChange: (next: string) => void
  placeholder?: string
  autoComplete?: string
  type?: 'text' | 'password'
}) {
  return (
    <label className="block px-4 py-3">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-fg-faint">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-xl border border-line bg-bg/50 px-3 py-2.5 text-fg placeholder:text-fg-faint"
      />
    </label>
  )
}

export function ActionButton({
  children,
  onClick,
  variant = 'secondary',
  disabled = false,
  className = '',
}: {
  children: ReactNode
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'warn' | 'danger'
  disabled?: boolean
  className?: string
}) {
  const variants = {
    primary: 'bg-accent text-accent-fg',
    secondary: 'bg-surface-hi text-fg',
    warn: 'bg-warn/15 text-warn',
    danger: 'bg-danger/15 text-danger',
  } as const

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold transition-[background-color,transform] active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function ChipSelect<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: readonly T[]
  onChange: (next: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          onClick={() => onChange(option)}
          className={`min-h-11 rounded-full px-3 py-2 text-xs font-medium transition-colors ${
            value === option ? 'bg-accent text-accent-fg' : 'bg-surface-hi text-fg-muted'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
