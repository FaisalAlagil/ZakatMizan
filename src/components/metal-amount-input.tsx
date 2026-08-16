'use client'

import { useState } from 'react'
import { Plus, Trash2, TrendingUp, X } from 'lucide-react'
import { money } from '@/components/ui'
import {
  calculatePureGoldGrams,
  calculatePureSilverGrams,
  GOLD_KARAT_FACTORS,
  SILVER_PURITY_FACTORS,
  type GoldKarat,
  type SilverPurity,
} from '@/lib/fiqh/karats'

export type MetalItemEntry = {
  id: string
  label: string
  rawWeight: string
  karat: GoldKarat
  silverPurity: SilverPurity
}

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
  const [mode, setMode] = useState<'simple' | 'breakdown'>('simple')
  const [simpleKarat, setSimpleKarat] = useState<GoldKarat>('24K')
  const [simpleSilverPurity, setSimpleSilverPurity] = useState<SilverPurity>('999')

  // Multi-item breakdown list
  const [items, setItems] = useState<MetalItemEntry[]>([
    {
      id: 'item-1',
      label: metal === 'gold' ? 'Jewelry (e.g. Wedding Set)' : 'Silver Item 1',
      rawWeight: '',
      karat: '22K',
      silverPurity: '925',
    },
  ])

  // Helper to convert an item's raw weight to pure 24K/999 grams
  function computeItemPureGrams(item: MetalItemEntry): number {
    const raw = Number.parseFloat(item.rawWeight) || 0
    if (raw <= 0) return 0
    return metal === 'gold'
      ? calculatePureGoldGrams(raw, 'g', item.karat)
      : calculatePureSilverGrams(raw, 'g', item.silverPurity)
  }

  function computeItemGrossGrams(item: MetalItemEntry): number {
    const raw = Number.parseFloat(item.rawWeight) || 0
    return raw > 0 ? raw : 0
  }

  // Calculate totals
  let pureGramsTotal = 0
  let grossGramsTotal = 0

  if (mode === 'breakdown') {
    pureGramsTotal = items.reduce((sum, item) => sum + computeItemPureGrams(item), 0)
    grossGramsTotal = items.reduce((sum, item) => sum + computeItemGrossGrams(item), 0)
  } else {
    const raw = Number.parseFloat(grams) || 0
    if (raw > 0) {
      const factor =
        metal === 'gold'
          ? GOLD_KARAT_FACTORS[simpleKarat].factor
          : SILVER_PURITY_FACTORS[simpleSilverPurity].factor
      pureGramsTotal = raw * factor
      grossGramsTotal = raw
    }
  }

  // Synchronize breakdown changes to parent
  function updateBreakdownItems(newItems: MetalItemEntry[]) {
    setItems(newItems)
    const totalPure = newItems.reduce((sum, it) => sum + computeItemPureGrams(it), 0)
    onChangeGrams(totalPure > 0 ? totalPure.toFixed(2).replace(/\.00$/, '') : '')
  }

  function addItem() {
    const nextIdx = items.length + 1
    const newItem: MetalItemEntry = {
      id: `item-${Date.now()}`,
      label: metal === 'gold' ? `Gold Item ${nextIdx}` : `Silver Item ${nextIdx}`,
      rawWeight: '',
      karat: metal === 'gold' ? '21K' : '24K',
      silverPurity: '925',
    }
    updateBreakdownItems([...items, newItem])
  }

  function removeItem(id: string) {
    if (items.length <= 1) {
      updateBreakdownItems([{ ...items[0], rawWeight: '' }])
      return
    }
    updateBreakdownItems(items.filter((it) => it.id !== id))
  }

  function updateItem(id: string, patch: Partial<MetalItemEntry>) {
    updateBreakdownItems(items.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }

  // Simple mode handlers
  function handleSimpleValueChange(raw: string) {
    const cleaned = raw.replace(/[^0-9.]/g, '')
    if (!cleaned) {
      onChangeGrams('')
      return
    }
    const val = Number.parseFloat(cleaned) || 0
    const pureGrams =
      metal === 'gold'
        ? calculatePureGoldGrams(val, 'g', simpleKarat)
        : calculatePureSilverGrams(val, 'g', simpleSilverPurity)

    onChangeGrams(pureGrams > 0 ? pureGrams.toFixed(2).replace(/\.00$/, '') : '')
  }

  function addGramsSimple(delta: number) {
    const current = Number.parseFloat(grams) || 0
    const updated = Math.max(0, current + delta)
    onChangeGrams(updated === 0 ? '' : updated.toFixed(2).replace(/\.00$/, ''))
  }

  const numPureGrams = Number.parseFloat(grams) || 0
  const totalValue = numPureGrams * (pricePerGram || 0)
  const nisabValue = nisabGrams * (pricePerGram || 0)
  const metalLabel = metal === 'gold' ? 'Gold' : 'Silver'

  return (
    <div className="space-y-5">
      {/* 1. Live Market Rate Banner on Top */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-hair bg-paper p-3.5 shadow-sm sm:p-4">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
              metal === 'gold' ? 'bg-gold/20 text-gold-ink' : 'bg-mute/15 text-ink'
            }`}
          >
            <TrendingUp size={15} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-ink">Live {metalLabel} Spot Price</span>
              <span className="flex size-2 rounded-full bg-halal animate-pulse" title="Live rate active" />
            </div>
            <p className="tnum mt-0.5 text-xs text-ink-soft">
              <strong className="text-ink font-semibold">{money(pricePerGram, currency, 2)}</strong> / gram
            </p>
          </div>
        </div>

        <div className="text-right text-[11px] text-mute">
          <span>{metalLabel} Nisab: </span>
          <strong className="text-ink font-medium">{nisabGrams}g</strong>
          <span className="block">{money(nisabValue, currency, 0)}</span>
        </div>
      </div>

      {/* 2. Mode Toggle: Single Total vs Multi-Item Breakdown */}
      <div className="flex items-center justify-between border-b border-hair pb-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode('simple')}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              mode === 'simple'
                ? 'bg-deep text-white shadow-sm'
                : 'text-ink-soft hover:bg-paper hover:text-ink'
            }`}
          >
            Single Total
          </button>
          <button
            type="button"
            onClick={() => setMode('breakdown')}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              mode === 'breakdown'
                ? 'bg-deep text-white shadow-sm'
                : 'text-ink-soft hover:bg-paper hover:text-ink'
            }`}
          >
            + Item Breakdown ({items.length})
          </button>
        </div>

        <span className="text-[11px] text-mute">
          {metal === 'gold' ? 'Karat purity adjusted' : 'Purity percentage'}
        </span>
      </div>

      {/* 3A. Simple Mode */}
      {mode === 'simple' ? (
        <div className="space-y-4">
          {/* Karat / Purity Selector */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs text-mute font-medium">Purity:</span>
            {metal === 'gold' ? (
              <select
                value={simpleKarat}
                onChange={(e) => setSimpleKarat(e.target.value as GoldKarat)}
                aria-label="Gold Karat Purity"
                className="rounded-xl border border-hair bg-paper px-3 py-1.5 text-xs font-semibold text-ink shadow-sm outline-none focus:border-deep"
              >
                {(Object.keys(GOLD_KARAT_FACTORS) as GoldKarat[]).map((k) => (
                  <option key={k} value={k}>
                    {k} ({GOLD_KARAT_FACTORS[k].purityPct}%)
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={simpleSilverPurity}
                onChange={(e) => setSimpleSilverPurity(e.target.value as SilverPurity)}
                aria-label="Silver Purity"
                className="rounded-xl border border-hair bg-paper px-3 py-1.5 text-xs font-semibold text-ink shadow-sm outline-none focus:border-deep"
              >
                {(Object.keys(SILVER_PURITY_FACTORS) as SilverPurity[]).map((p) => (
                  <option key={p} value={p}>
                    {SILVER_PURITY_FACTORS[p].purityPct}% Purity ({p})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Main Grams Input */}
          <div className="flex items-baseline justify-center gap-2 border-b-2 border-hair pb-4 transition-colors focus-within:border-deep">
            <input
              autoFocus
              value={grams}
              onChange={(e) => handleSimpleValueChange(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              aria-label={`${metalLabel} weight in grams`}
              size={Math.max(1, grams.length || 1)}
              className="tnum display w-auto bg-transparent p-0 text-center text-5xl leading-none text-ink outline-none placeholder:text-hair sm:text-6xl"
            />
            <span className="shrink-0 text-xl font-medium text-mute">grams</span>
          </div>

          {/* Quick Adjustment Buttons */}
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
                onClick={() => addGramsSimple(item.amount)}
                className="rounded-full border border-hair bg-paper px-3 py-1 text-xs font-medium text-ink transition-colors hover:border-ink-soft/40 hover:bg-canvas active:scale-95"
              >
                {item.label}
              </button>
            ))}

            {numPureGrams > 0 && (
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
      ) : (
        /* 3B. Multi-Item Breakdown Mode */
        <div className="space-y-3">
          <div className="space-y-2.5">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 rounded-2xl border border-hair bg-paper p-3.5 shadow-sm transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => updateItem(item.id, { label: e.target.value })}
                    placeholder={`Item ${idx + 1}`}
                    className="text-xs font-semibold text-ink bg-transparent outline-none focus:underline w-full max-w-[70%] truncate"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.label}`}
                    className="text-mute hover:text-haram p-1 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="grid grid-cols-12 gap-2 items-center">
                  {/* Weight Input (Grams) */}
                  <div className="col-span-6 flex items-center border border-hair rounded-xl px-2.5 py-1.5 bg-canvas focus-within:border-deep">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={item.rawWeight}
                      onChange={(e) =>
                        updateItem(item.id, { rawWeight: e.target.value.replace(/[^0-9.]/g, '') })
                      }
                      placeholder="0"
                      aria-label={`${item.label} weight in grams`}
                      className="tnum text-sm font-semibold text-ink bg-transparent outline-none w-full"
                    />
                    <span className="text-xs text-mute ml-1">g</span>
                  </div>

                  {/* Karat / Purity Selector */}
                  <div className="col-span-6">
                    {metal === 'gold' ? (
                      <select
                        value={item.karat}
                        onChange={(e) => updateItem(item.id, { karat: e.target.value as GoldKarat })}
                        aria-label={`${item.label} karat`}
                        className="w-full rounded-xl border border-hair bg-paper px-2 py-1.5 text-xs font-semibold text-gold-ink outline-none"
                      >
                        {(Object.keys(GOLD_KARAT_FACTORS) as GoldKarat[]).map((k) => (
                          <option key={k} value={k}>
                            {k} ({GOLD_KARAT_FACTORS[k].purityPct}%)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        value={item.silverPurity}
                        onChange={(e) =>
                          updateItem(item.id, { silverPurity: e.target.value as SilverPurity })
                        }
                        aria-label={`${item.label} purity`}
                        className="w-full rounded-xl border border-hair bg-paper px-2 py-1.5 text-xs font-semibold text-ink outline-none"
                      >
                        {(Object.keys(SILVER_PURITY_FACTORS) as SilverPurity[]).map((p) => (
                          <option key={p} value={p}>
                            {SILVER_PURITY_FACTORS[p].purityPct}% ({p})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Sub-item pure calculated weight */}
                {computeItemPureGrams(item) > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-mute border-t border-hair/50 pt-1.5">
                    <span className="truncate max-w-[50%]">
                      Pure 24K: <strong>{computeItemPureGrams(item).toFixed(2)}g</strong>
                    </span>
                    <span className="font-medium text-ink">
                      ≈ {money(computeItemPureGrams(item) * pricePerGram, currency, 2)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-hair py-2.5 text-xs font-medium text-ink-soft hover:border-ink-soft/40 hover:bg-paper transition-all"
          >
            <Plus size={14} /> Add Another {metalLabel} Item
          </button>
        </div>
      )}

      {/* 4. Live Total Value & Nisab Breakdown Card */}
      <div className="rounded-2xl border border-hair bg-paper p-4 text-center space-y-1.5 shadow-sm">
        <div className="flex items-baseline justify-center gap-2">
          <span className="eyebrow text-mute">Estimated Total Value:</span>
          <span className="display text-2xl font-semibold text-ink">
            {money(totalValue, currency, 2)}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-ink-soft">
          <span>
            Pure {metalLabel} Weight:{' '}
            <strong className="text-ink">{numPureGrams.toFixed(2)}g</strong>
          </span>
          {grossGramsTotal > numPureGrams && (
            <span className="text-mute">
              (Gross Raw Weight: {grossGramsTotal.toFixed(2)}g)
            </span>
          )}
        </div>

        <div className="pt-1 text-xs">
          {numPureGrams >= nisabGrams ? (
            <span className="inline-flex items-center gap-1 font-semibold text-halal">
              ✓ Meets {metalLabel} Nisab ({nisabGrams}g threshold)
            </span>
          ) : (
            <span className="text-mute">
              Below {nisabGrams}g Nisab threshold ({money(nisabValue, currency, 0)})
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
