'use client'

import { useState } from 'react'
import { TrendingUp, X } from 'lucide-react'
import { money } from '@/components/ui'

const TROY_OZ_TO_GRAMS = 31.1034768
const TOLA_TO_GRAMS = 11.6638

type Unit = 'g' | 'oz' | 'tola'

export function MetalAmountInput({
  metal,
  grams,
  onChangeGrams,
  pricePerGram,
  currency,
  nisabGrams = metal === 'gold' ? 87.48 : 612.36,
}: {
  metal: 'gold' | 'silver'
  grams: string
  onChangeGrams: (val: string) => void
  pricePerGram: number
  currency: string
  nisabGrams?: number
}) {
  const [unit, setUnit] = useState<Unit>('g')

  const numGrams = Number.parseFloat(grams) || 0
  const totalValue = numGrams * (pricePerGram || 0)
  const nisabValue = nisabGrams * (pricePerGram || 0)

  // Convert current grams to active unit for input display if not in grams
  function getDisplayValue(): string {
    if (!grams || numGrams === 0) return ''
    if (unit === 'oz') return (numGrams / TROY_OZ_TO_GRAMS).toFixed(2).replace(/\.00$/, '')
    if (unit === 'tola') return (numGrams / TOLA_TO_GRAMS).toFixed(2).replace(/\.00$/, '')
    return grams
  }

  function handleValueChange(raw: string) {
    const cleaned = raw.replace(/[^0-9.]/g, '')
    if (!cleaned) {
      onChangeGrams('')
      return
    }
    const val = Number.parseFloat(cleaned) || 0
    if (unit === 'oz') {
      onChangeGrams((val * TROY_OZ_TO_GRAMS).toFixed(2))
    } else if (unit === 'tola') {
      onChangeGrams((val * TOLA_TO_GRAMS).toFixed(2))
    } else {
      onChangeGrams(cleaned)
    }
  }

  function addGrams(delta: number) {
    const current = Number.parseFloat(grams) || 0
    const updated = Math.max(0, current + delta)
    onChangeGrams(updated === 0 ? '' : updated.toFixed(2).replace(/\.00$/, ''))
  }

  const pricePerOz = pricePerGram * TROY_OZ_TO_GRAMS
  const metalLabel = metal === 'gold' ? 'Gold' : 'Silver'

  return (
    <div className="space-y-5">
      {/* 1. Live Market Rate Banner on Top */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-hair bg-paper p-3.5 shadow-sm sm:p-4">
        <div className="flex items-center gap-2.5">
          <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${metal === 'gold' ? 'bg-gold/20 text-gold-ink' : 'bg-mute/15 text-ink'}`}>
            <TrendingUp size={15} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-ink">Live {metalLabel} Market Rate</span>
              <span className="flex size-2 rounded-full bg-halal animate-pulse" title="Live rate active" />
            </div>
            <p className="tnum mt-0.5 text-xs text-ink-soft">
              <strong className="text-ink font-semibold">{money(pricePerGram, currency, 2)}</strong> / gram
              <span className="text-mute"> ({money(pricePerOz, currency, 0)} / troy oz)</span>
            </p>
          </div>
        </div>

        <div className="text-right text-[11px] text-mute">
          <span>{metalLabel} Nisab: </span>
          <strong className="text-ink font-medium">{nisabGrams}g</strong>
          <span className="block">{money(nisabValue, currency, 0)}</span>
        </div>
      </div>

      {/* 2. Unit Switcher Tabs */}
      <div className="flex items-center justify-center">
        <div className="inline-flex rounded-xl bg-deep/[0.05] p-1 text-xs">
          <button
            type="button"
            onClick={() => setUnit('g')}
            className={`rounded-lg px-3 py-1 font-medium transition-all ${
              unit === 'g' ? 'bg-paper text-ink shadow-sm' : 'text-mute hover:text-ink'
            }`}
          >
            Grams (g)
          </button>
          <button
            type="button"
            onClick={() => setUnit('oz')}
            className={`rounded-lg px-3 py-1 font-medium transition-all ${
              unit === 'oz' ? 'bg-paper text-ink shadow-sm' : 'text-mute hover:text-ink'
            }`}
          >
            Troy Ounces (oz)
          </button>
          <button
            type="button"
            onClick={() => setUnit('tola')}
            className={`rounded-lg px-3 py-1 font-medium transition-all ${
              unit === 'tola' ? 'bg-paper text-ink shadow-sm' : 'text-mute hover:text-ink'
            }`}
          >
            Tolas (11.66g)
          </button>
        </div>
      </div>

      {/* 3. Big Amount Input */}
      <div className="flex items-baseline justify-center gap-2 border-b-2 border-hair pb-4 transition-colors focus-within:border-deep">
        <input
          autoFocus
          value={getDisplayValue()}
          onChange={(e) => handleValueChange(e.target.value)}
          inputMode="decimal"
          placeholder="0"
          aria-label={`${metalLabel} weight`}
          size={Math.max(1, getDisplayValue().length || 1)}
          className="tnum display w-auto bg-transparent p-0 text-center text-5xl leading-none text-ink outline-none placeholder:text-hair sm:text-6xl"
        />
        <span className="shrink-0 text-xl font-medium text-mute">
          {unit === 'g' ? `g of ${metal}` : unit === 'oz' ? `oz of ${metal}` : `tolas of ${metal}`}
        </span>
      </div>

      {/* 4. Live Value Calculation Preview */}
      <div className="flex flex-col items-center justify-center gap-1 text-center">
        {numGrams > 0 ? (
          <div className="animate-in fade-in slide-in-from-bottom-1 duration-200">
            <p className="tnum text-base font-semibold text-ink">
              ≈ {money(totalValue, currency, 2)}
            </p>
            <p className="text-xs text-mute">
              {numGrams.toFixed(2)} grams •{' '}
              {numGrams >= nisabGrams ? (
                <span className="font-medium text-halal">Meets {metalLabel} Nisab threshold</span>
              ) : (
                <span>Below {nisabGrams}g Nisab threshold</span>
              )}
            </p>
          </div>
        ) : (
          <p className="text-xs text-mute">
            Enter the weight you hold, or use the quick buttons below.
          </p>
        )}
      </div>

      {/* 5. Quick Adjustment Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
        {[
          { label: '+10g', amount: 10 },
          { label: '+20g', amount: 20 },
          { label: '+40g (wedding set)', amount: 40 },
          { label: '+50g', amount: 50 },
          { label: '+100g', amount: 100 },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => addGrams(item.amount)}
            className="rounded-full border border-hair bg-paper px-3 py-1 text-xs font-medium text-ink transition-colors hover:border-ink-soft/40 hover:bg-canvas active:scale-95"
          >
            {item.label}
          </button>
        ))}

        {numGrams > 0 && (
          <button
            type="button"
            onClick={() => onChangeGrams('')}
            className="inline-flex items-center gap-1 rounded-full border border-hair bg-paper px-2.5 py-1 text-xs text-mute hover:text-haram hover:border-haram/30 transition-colors"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>
    </div>
  )
}
