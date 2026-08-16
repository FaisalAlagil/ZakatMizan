'use client'

import { money } from './ui'
import { useAnimatedNumber } from './animated-number'

/**
 * The signature element. A measured line where the threshold (nisab) is a tick
 * and your wealth is the bar running up to it or past it. The axis stays fixed
 * across the four schools, so switching madhhab visibly slides the tick.
 */
export function ThresholdRule({
  wealth,
  nisab,
  axisMax,
  currency,
}: {
  wealth: number
  nisab: number
  axisMax: number
  currency: string
}) {
  const max = Math.max(axisMax, nisab * 1.1, 1)
  const pct = (v: number) => `${Math.min(100, Math.max(0, (v / max) * 100))}%`
  const clears = wealth >= nisab
  const shownGap = useAnimatedNumber(Math.abs(wealth - nisab))

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 text-xs">
        <span className="text-white/50">Everything you hold</span>
        <span className="font-medium text-white/80">
          Zakat starts at <span className="tnum">{money(nisab, currency, 0)}</span>
        </span>
      </div>

      <div className="rule-track mt-2">
        <div className="rule-axis" />
        <div className="rule-fill" style={{ width: pct(wealth) }} />
        <div className="rule-head" style={{ left: pct(wealth) }} aria-hidden />
        <div className="rule-tick" style={{ left: pct(nisab) }} aria-hidden />
      </div>

      <p className="text-sm leading-relaxed text-white/70">
        {clears ? (
          <>
            You hold <span className="tnum font-medium text-white">{money(wealth, currency, 0)}</span>, which is{' '}
            <span className="tnum font-medium text-gold">{money(shownGap, currency, 0)}</span> above the
            threshold. Zakat is due.
          </>
        ) : (
          <>
            You hold <span className="tnum font-medium text-white">{money(wealth, currency, 0)}</span>. You are{' '}
            <span className="tnum font-medium text-white">{money(shownGap, currency, 0)}</span> below the
            threshold, so no zakat is due this year.
          </>
        )}
      </p>
    </div>
  )
}
