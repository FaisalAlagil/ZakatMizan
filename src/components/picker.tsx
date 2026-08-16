'use client'

/**
 * Replaces the native select. Every option is visible and one tap wide, so
 * there is no menu to open and no hidden state.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  label?: string
  size?: 'sm' | 'md'
}) {
  const pad = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-sm'
  return (
    <div>
      {label && <p className="mb-1.5 text-xs text-mute">{label}</p>}
      <div
        role="radiogroup"
        aria-label={label}
        className="inline-flex flex-wrap gap-1 rounded-full bg-canvas p-1 ring-1 ring-hair"
      >
        {options.map((o) => {
          const active = o.value === value
          return (
            <button
              key={o.value}
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={`rounded-full font-medium transition-all duration-150 active:scale-[0.97] ${pad} ${
                active ? 'bg-deep text-white shadow-sm' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** A vertical list picker for longer option sets, still with no hidden menu. */
export function ListPicker<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; detail?: string }[]
  label?: string
}) {
  return (
    <div>
      {label && <p className="mb-2 text-xs text-mute">{label}</p>}
      <div role="radiogroup" aria-label={label} className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => {
          const active = o.value === value
          return (
            <button
              key={o.value}
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={`rounded-2xl border-2 px-3.5 py-3 text-left transition-all duration-150 active:scale-[0.985] ${
                active ? 'border-deep bg-deep/[0.04]' : 'border-hair bg-paper hover:border-ink-soft/30'
              }`}
            >
              <span className="block text-sm font-medium text-ink">{o.label}</span>
              {o.detail && <span className="mt-0.5 block text-xs text-mute">{o.detail}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
