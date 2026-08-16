'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Asset, Liability, Madhhab, MetalPrices, Transaction } from '@/lib/types'
import { classify, classifyIfNeeded } from '@/lib/classify/engine'
import { counterpartyFragment, type LearnedRule } from '@/lib/classify/learned-rules'
import { GOLD_NISAB_GRAMS, GOLD_NISAB_GRAMS_ALT, SILVER_NISAB_GRAMS, SILVER_NISAB_GRAMS_ALT } from '@/lib/fiqh/madhhab-profiles'
import { FALLBACK_RATES, type Rates } from '@/lib/currency'

export type NisabPreset = 'precise' | 'rounded'

type State = {
  onboarded: boolean
  madhhab: Madhhab
  currency: string
  nisabPreset: NisabPreset
  /** Rules-only mode. No transaction text leaves the device. */
  offlineMode: boolean
  hawlStartDate: string
  dippedBelowNisab: boolean
  transactions: Transaction[]
  assets: Asset[]
  liabilities: Liability[]
  learned: LearnedRule[]
  prices: MetalPrices | null
  rates: Rates | null
  priceOverride: { goldPerGram: number; silverPerGram: number } | null
}

type Actions = {
  complete: (madhhab: Madhhab) => void
  setMadhhab: (m: Madhhab) => void
  setCurrency: (c: string) => void
  setNisabPreset: (p: NisabPreset) => void
  setOfflineMode: (v: boolean) => void
  setHawlStartDate: (d: string) => void
  setDipped: (v: boolean) => void
  setPrices: (p: MetalPrices) => void
  setRates: (r: Rates) => void
  setPriceOverride: (p: { goldPerGram: number; silverPerGram: number } | null) => void
  addTransactions: (txs: Transaction[]) => void
  replaceTransactions: (txs: Transaction[]) => void
  updateTransaction: (id: string, patch: Partial<Transaction>, options?: { learn?: boolean }) => void
  replaceSetupData: (m: Madhhab, assets: Asset[], liabilities: Liability[]) => void
  addAsset: (a: Asset) => void
  removeAsset: (id: string) => void
  addLiability: (l: Liability) => void
  removeLiability: (id: string) => void
  reset: () => void
  importState: (raw: string) => boolean
}

const INITIAL: State = {
  onboarded: false,
  madhhab: 'hanafi',
  currency: 'CAD',
  nisabPreset: 'precise',
  offlineMode: false,
  hawlStartDate: '2025-01-01',
  dippedBelowNisab: false,
  transactions: [],
  assets: [],
  liabilities: [],
  learned: [],
  prices: null,
  rates: null,
  priceOverride: null,
}

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      complete: (madhhab) => set({ onboarded: true, madhhab }),
      setMadhhab: (madhhab) => set({ madhhab }),
      setCurrency: (currency) => set({ currency }),
      setNisabPreset: (nisabPreset) => set({ nisabPreset }),
      setOfflineMode: (offlineMode) => set({ offlineMode }),
      setHawlStartDate: (hawlStartDate) => set({ hawlStartDate }),
      setDipped: (dippedBelowNisab) => set({ dippedBelowNisab }),
      setPrices: (prices) => set({ prices }),
      setRates: (rates) => set({ rates }),
      setPriceOverride: (priceOverride) => set({ priceOverride }),

      addTransactions: (txs) => {
        const { learned, transactions } = get()
        const existing = new Set(transactions.map((t) => t.id))
        const fresh = txs.filter((t) => !existing.has(t.id)).map((t) => classifyIfNeeded(t, learned))
        set({ transactions: [...transactions, ...fresh] })
      },

      replaceTransactions: (txs) => set({ transactions: txs }),

      updateTransaction: (id, patch, options) => {
        const { transactions, learned } = get()
        const target = transactions.find((t) => t.id === id)
        let updated = transactions.map((t) =>
          t.id === id ? { ...t, ...patch, question: undefined, classifiedBy: patch.classifiedBy ?? 'user' } : t,
        )

        // An answer about a counterparty becomes a rule, so we never ask about
        // that source again.
        let nextLearned = learned
        if (options?.learn && target && patch.verdict) {
          const match = counterpartyFragment(target.description)
          if (match.length > 2 && !learned.some((l) => l.match === match)) {
            const rule: LearnedRule = {
              id: `${match}-${learned.length}`,
              match,
              verdict: patch.verdict,
              basis: patch.basis ?? `You told us how to treat ${match}.`,
              citation: patch.citation,
              haramRatio: patch.haramRatio,
              sourceType: patch.sourceType,
              createdAt: new Date().toISOString(),
            }
            nextLearned = [...learned, rule]

            // Apply it to the rows already on screen too, so answering once
            // clears every entry from the same source. Settled rows and the
            // user's own decisions are left alone.
            updated = updated.map((t) =>
              t.id !== id && t.amount > 0 && (t.verdict === undefined || t.verdict === 'NEEDS_INFO')
                ? classify(t, nextLearned)
                : t,
            )
          }
        }

        set({ transactions: updated, learned: nextLearned })
      },

      // Re-running setup replaces what setup created and leaves anything the
      // user added by hand on the Zakat page alone.
      replaceSetupData: (madhhab, assets, liabilities) =>
        set({
          madhhab,
          onboarded: true,
          assets: [...get().assets.filter((a) => !a.id.startsWith('setup-')), ...assets],
          liabilities: [...get().liabilities.filter((l) => !l.id.startsWith('setup-')), ...liabilities],
        }),

      addAsset: (a) => set({ assets: [...get().assets, a] }),
      removeAsset: (id) => set({ assets: get().assets.filter((a) => a.id !== id) }),
      addLiability: (l) => set({ liabilities: [...get().liabilities, l] }),
      removeLiability: (id) => set({ liabilities: get().liabilities.filter((l) => l.id !== id) }),


      // A full reset really means a new user: back to the welcome screen, with
      // no school or currency remembered.
      reset: () => set({ ...INITIAL }),

      importState: (raw) => {
        try {
          const parsed = JSON.parse(raw) as Partial<State>
          if (!Array.isArray(parsed.transactions)) return false
          set({ ...get(), ...parsed })
          return true
        } catch {
          return false
        }
      },
    }),
    {
      name: 'mizan-v1',
      version: 2,
      /**
       * Version 1 could seed itself with sample data. That is gone, but it can
       * still be sitting in a browser from before, so strip it out. If nothing
       * real is left, send the person back through setup rather than showing
       * them an empty dashboard.
       */
      migrate: (persisted, version) => {
        const state = persisted as State
        if (version >= 2) return state

        const notDemo = <T extends { id: string }>(items: T[] | undefined) =>
          (items ?? []).filter((i) => !i.id.startsWith('demo-'))

        const transactions = notDemo(state.transactions)
        const assets = notDemo(state.assets)
        const liabilities = notDemo(state.liabilities)

        return {
          ...state,
          transactions,
          assets,
          liabilities,
          onboarded: state.onboarded && (assets.length > 0 || transactions.length > 0),
        }
      },
    },
  ),
)

export function nisabGrams(preset: NisabPreset) {
  return preset === 'precise'
    ? { gold: GOLD_NISAB_GRAMS, silver: SILVER_NISAB_GRAMS }
    : { gold: GOLD_NISAB_GRAMS_ALT, silver: SILVER_NISAB_GRAMS_ALT }
}

/** Prices actually used by the calculator: a manual override wins over the feed. */
export function effectiveRates(state: { rates: Rates | null }): Rates {
  return state.rates ?? FALLBACK_RATES
}

export function effectivePrices(state: State): MetalPrices {
  const base: MetalPrices = state.prices ?? {
    goldPerGram: 176,
    silverPerGram: 2.2,
    currency: state.currency,
    asOf: '',
    source: 'cached',
  }
  if (!state.priceOverride) return base
  return { ...base, ...state.priceOverride, source: 'manual' }
}
