'use client'

import { useState } from 'react'
import { Plus, Trash2, TrendingUp } from 'lucide-react'
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
  // Multi-item list (pure per-item entry)
  const [items, setItems] = useState<MetalItemEntry[]>([
    {
      id: 'item-1',
      label: metal === 'gold' ? 'Jewelry (e.g. Wedding Set)' : 'Silver Item 1',
      rawWeight: grams || '',
      karat: '22K',
      silverPurity: '925',
    },
  ])

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

  const pureGramsTotal = items.reduce((sum, item) => sum + computeItemPureGrams(item), 0)
  const grossGramsTotal = items.reduce((sum, item) => sum + computeItemGrossGrams(item), 0)

  function updateItems(newItems: MetalItemEntry[]) {
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
    updateItems([...items, newItem])
  }

  function removeItem(id: string) {
    if (items.length <= 1) {
      updateItems([{ ...items[0], rawWeight: '' }])
      return
    }
    updateItems(items.filter((it) => it.id !== id))
  }

  function updateItem(id: string, patch: Partial<MetalItemEntry>) {
    updateItems(items.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }

  const totalValue = pureGramsTotal * (pricePerGram || 0)
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

      {/* 2. Item-by-Item Breakdown Header */}
      <div className="flex items-center justify-between border-b border-hair pb-2.5">
        <span className="text-xs font-medium text-ink">
          {metalLabel} Items ({items.length})
        </span>
        <span className="text-[11px] text-mute">
          {metal === 'gold' ? 'Karat purity adjusted' : 'Purity percentage adjusted'}
        </span>
      </div>

      {/* 3. Items List */}
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="flex flex-col gap-2.5 rounded-2xl border border-hair bg-paper p-3.5 shadow-sm transition-all"
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
                <span className="text-xs text-mute ml-1 font-medium">g</span>
              </div>

              {/* Karat / Purity Selector */}
              <div className="col-span-6">
                {metal === 'gold' ? (
                  <select
                    value={item.karat}
                    onChange={(e) => updateItem(item.id, { karat: e.target.value as GoldKarat })}
                    aria-label={`${item.label} karat`}
                    className="w-full rounded-xl border border-hair bg-paper px-2.5 py-1.5 text-xs font-semibold text-gold-ink outline-none"
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
                    className="w-full rounded-xl border border-hair bg-paper px-2.5 py-1.5 text-xs font-semibold text-ink outline-none"
                  >
                    {(Object.keys(SILVER_PURITY_FACTORS) as SilverPurity[]).map((p) => (
                      <option key={p} value={p}>
                        {SILVER_PURITY_FACTORS[p].purityPct}% Purity ({p})
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

        <button
          type="button"
          onClick={addItem}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-hair py-2.5 text-xs font-medium text-ink-soft hover:border-ink-soft/40 hover:bg-paper transition-all"
        >
          <Plus size={14} /> Add Another {metalLabel} Item
        </button>
      </div>

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
            <strong className="text-ink">{pureGramsTotal.toFixed(2)}g</strong>
          </span>
          {grossGramsTotal > pureGramsTotal && (
            <span className="text-mute">
              (Gross Raw Weight: {grossGramsTotal.toFixed(2)}g)
            </span>
          )}
        </div>

        <div className="pt-1 text-xs">
          {pureGramsTotal >= nisabGrams ? (
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
