'use client'

import { useMemo } from 'react'
import { compareAllMadhhabs, computeZakat, type ZakatInput } from '@/lib/fiqh/zakat-engine'
import { MADHHABS, type Asset, type Liability, type Transaction } from '@/lib/types'
import { convert } from '@/lib/currency'
import { effectivePrices, effectiveRates, nisabGrams, useStore } from '@/lib/store'

/** Metals are held in grams, so they are never touched by a currency conversion. */
const inGrams = (a: Asset) =>
  a.kind === 'gold' || a.kind === 'silver' || a.kind === 'personal_jewelry'

export function useZakat() {
  const state = useStore()

  return useMemo(() => {
    const main = state.currency
    const rates = effectiveRates(state)
    const raw = effectivePrices(state)

    // Everything is converted into the main currency before the engine sees it,
    // so the engine stays currency-agnostic and works in one unit throughout.
    const prices = {
      ...raw,
      goldPerGram: convert(raw.goldPerGram, raw.currency, main, rates),
      silverPerGram: convert(raw.silverPerGram, raw.currency, main, rates),
      currency: main,
    }

    const assets: Asset[] = state.assets.map((a) =>
      inGrams(a) ? a : { ...a, amount: convert(a.amount, a.currency ?? main, main, rates), currency: main },
    )

    const liabilities: Liability[] = state.liabilities.map((l) => ({
      ...l,
      amount: convert(l.amount, l.currency ?? main, main, rates),
      dueWithinYear: convert(l.dueWithinYear, l.currency ?? main, main, rates),
      currency: main,
    }))

    const transactions: Transaction[] = state.transactions.map((t) => ({
      ...t,
      amount: convert(t.amount, t.currency || main, main, rates),
      currency: main,
    }))

    const base: Omit<ZakatInput, 'madhhab'> = {
      assets,
      liabilities,
      transactions,
      prices,
      hawlStartDate: state.hawlStartDate,
      today: new Date().toISOString().slice(0, 10),
      dippedBelowNisab: state.dippedBelowNisab,
      nisabGrams: nisabGrams(state.nisabPreset),
    }

    const all = compareAllMadhhabs(base)
    const result = computeZakat({ ...base, madhhab: state.madhhab })

    // A fixed axis across the four schools so the switcher animation is honest.
    const axisMax =
      MADHHABS.reduce(
        (m, k) => Math.max(m, all[k].zakatableBase, all[k].pools[0]?.nisabValue ?? 0),
        0,
      ) * 1.15

    return { result, all, axisMax, prices, rates, main }
  }, [state])
}
