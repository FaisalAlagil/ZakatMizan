'use client'

import { ChevronLeft } from 'lucide-react'
import { CURRENCIES } from '@/lib/currency'
import { CurrencySelect } from './currency-select'

/**
 * One decision per screen: a progress bar at the top, a single question in the
 * middle, and one action fixed at the bottom within thumb reach. Nothing else
 * competes for attention.
 */
export function StepShell({
  step,
  total,
  onBack,
  title,
  hint,
  children,
  cta,
  onCta,
  ctaDisabled,
  secondary,
}: {
  step: number
  total: number
  onBack?: () => void
  title: string
  hint?: string
  children?: React.ReactNode
  cta: string
  onCta: () => void
  ctaDisabled?: boolean
  secondary?: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="flex items-center gap-3 px-5 pt-6 sm:px-8">
        <button
          onClick={onBack}
          disabled={!onBack}
          aria-label="Back"
          className="-ml-2 rounded-full p-2 text-ink-soft transition-colors hover:bg-paper disabled:opacity-0"
        >
          <ChevronLeft size={22} />
        </button>

        <div
          className="h-2.5 flex-1 overflow-hidden rounded-full bg-hair"
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={total}
        >
          <div
            className="h-full rounded-full bg-halal transition-[width] duration-500 ease-out"
            style={{ width: `${(step / total) * 100}%` }}
          />
        </div>

        <span className="tnum w-12 text-right text-xs font-medium text-mute">
          {step}/{total}
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pt-10 sm:px-8">
        <h1 className="display text-[1.75rem] leading-[1.2] text-ink sm:text-3xl">{title}</h1>
        {hint && <p className="mt-2.5 text-[0.95rem] leading-relaxed text-ink-soft">{hint}</p>}
        <div className="mt-8 pb-8">{children}</div>
      </main>

      <footer className="sticky bottom-0 border-t border-hair bg-canvas/90 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-3">
          <button
            onClick={onCta}
            disabled={ctaDisabled}
            className="w-full rounded-full bg-deep py-4 text-base font-semibold text-white shadow-[0_4px_0_0_#000] transition-all duration-150 hover:bg-lift active:translate-y-[3px] active:shadow-[0_1px_0_0_#000] disabled:cursor-not-allowed disabled:bg-hair disabled:text-mute disabled:shadow-none disabled:active:translate-y-0"
          >
            {cta}
          </button>
          {secondary}
        </div>
      </footer>
    </div>
  )
}

/** A full-width tappable answer. Large target, obvious selected state. */
export function Choice({
  label,
  detail,
  selected,
  onClick,
  tone = 'neutral',
}: {
  label: string
  detail?: string
  selected?: boolean
  onClick: () => void
  tone?: 'neutral' | 'halal' | 'haram' | 'mixed' | 'uncertain'
}) {
  const ring = {
    neutral: 'border-deep bg-deep/[0.04]',
    halal: 'border-halal bg-halal/8',
    haram: 'border-haram bg-haram/8',
    mixed: 'border-mixed bg-mixed/8',
    uncertain: 'border-uncertain bg-uncertain/8',
  }[tone]

  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`block w-full rounded-2xl border-2 px-4 py-4 text-left transition-all duration-150 active:scale-[0.985] ${
        selected ? ring : 'border-hair bg-paper hover:border-ink-soft/30'
      }`}
    >
      <span className="block text-[0.95rem] font-medium text-ink">{label}</span>
      {detail && <span className="mt-1 block text-sm leading-relaxed text-ink-soft">{detail}</span>}
    </button>
  )
}

/** One big number, the only thing on screen. */
export function BigAmount({
  value,
  onChange,
  currency,
  onCurrencyChange,
  suffix,
  autoFocus = true,
}: {
  value: string
  onChange: (v: string) => void
  currency?: string
  /** When given, the currency becomes selectable beneath the figure. */
  onCurrencyChange?: (code: string) => void
  suffix?: string
  autoFocus?: boolean
}) {
  const symbol = currency ? (CURRENCIES.find((c) => c.code === currency)?.symbol ?? currency) : ''
  return (
    <>
    {/* Both children sit on the same baseline with line-height removed, so the
        symbol lines up with the figure instead of drifting against it. */}
    <div className="flex items-baseline justify-center gap-2 border-b-2 border-hair pb-4 transition-colors focus-within:border-deep">
      {currency && (
        <span className="display shrink-0 text-3xl leading-none text-mute">{symbol}</span>
      )}
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
        inputMode="decimal"
        placeholder="0"
        aria-label="Amount"
        // Sized to its content so the symbol and the figure read as one unit.
        size={Math.max(1, value.length || 1)}
        className="tnum display w-auto bg-transparent p-0 text-center text-5xl leading-none text-ink outline-none placeholder:text-hair"
      />
      {suffix && <span className="shrink-0 text-xl leading-none text-mute">{suffix}</span>}
    </div>
    {currency && onCurrencyChange && (
      <div className="mt-4">
        <CurrencySelect value={currency} onChange={onCurrencyChange} />
      </div>
    )}
    </>
  )
}
