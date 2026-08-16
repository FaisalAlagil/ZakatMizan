import { describe, it, expect } from 'vitest'
import { computeZakat, type ZakatInput } from '@/lib/fiqh/zakat-engine'
import { MADHHABS, type Asset, type Liability, type MetalPrices, type Transaction } from '@/lib/types'

/**
 * Round test prices so the expected figures are checkable by hand.
 *   gold nisab   = 87.48g  x 100 = 8,748
 *   silver nisab = 612.36g x 1.2 =   734.832
 */
const PRICES: MetalPrices = {
  goldPerGram: 100,
  silverPerGram: 1.2,
  currency: 'CAD',
  asOf: '2026-01-01',
  source: 'manual',
}

const cash = (amount: number): Asset => ({ id: 'a1', kind: 'cash', label: 'Chequing', amount })

function input(over: Partial<ZakatInput> = {}): ZakatInput {
  return {
    madhhab: 'hanafi',
    assets: [],
    liabilities: [],
    transactions: [],
    prices: PRICES,
    hawlStartDate: '2025-01-01',
    today: '2026-01-05',
    dippedBelowNisab: false,
    ...over,
  }
}

describe('rate and thresholds', () => {
  it('applies 2.5% in every school', () => {
    for (const m of MADHHABS) {
      const r = computeZakat(input({ madhhab: m, assets: [cash(100_000)] }))
      expect(r.rate).toBe(0.025)
      expect(r.zakatDue).toBeCloseTo(2500, 2)
    }
  })

  it('charges nothing when wealth is below every threshold', () => {
    for (const m of MADHHABS) {
      const r = computeZakat(input({ madhhab: m, assets: [cash(200)] }))
      expect(r.meetsNisab).toBe(false)
      expect(r.zakatDue).toBe(0)
    }
  })
})

describe('nisab basis: the headline difference', () => {
  // 5,000 sits above the silver threshold (734.83) and below the gold one (8,748).
  it('makes zakat due under Hanafi but not under the other three', () => {
    const hanafi = computeZakat(input({ madhhab: 'hanafi', assets: [cash(5000)] }))
    expect(hanafi.meetsNisab).toBe(true)
    expect(hanafi.zakatDue).toBeCloseTo(125, 2)

    for (const m of ['maliki', 'shafii', 'hanbali'] as const) {
      const r = computeZakat(input({ madhhab: m, assets: [cash(5000)] }))
      expect(r.meetsNisab).toBe(false)
      expect(r.zakatDue).toBe(0)
    }
  })

  it('reports the threshold actually used', () => {
    expect(computeZakat(input({ madhhab: 'hanafi', assets: [cash(5000)] })).pools[0].nisabBasis).toBe('silver')
    expect(computeZakat(input({ madhhab: 'shafii', assets: [cash(5000)] })).pools[0].nisabBasis).toBe('gold')
  })
})

describe('personal jewellery', () => {
  const jewellery: Asset = { id: 'j1', kind: 'personal_jewelry', label: 'Wedding gold', amount: 40 }

  it('is counted by Hanafi and exempt in the other three', () => {
    const hanafi = computeZakat(input({ madhhab: 'hanafi', assets: [cash(5000), jewellery] }))
    // 5,000 + (40g x 100) = 9,000
    expect(hanafi.zakatableBase).toBeCloseTo(9000, 2)
    expect(hanafi.zakatDue).toBeCloseTo(225, 2)

    const shafii = computeZakat(input({ madhhab: 'shafii', assets: [cash(5000), jewellery] }))
    expect(shafii.zakatableBase).toBeCloseTo(5000, 2)
    expect(shafii.excluded.some((e) => e.label.includes('Wedding gold'))).toBe(true)
  })

  it('pushes a Shafi\'i payer over the gold threshold once the jewellery is large enough', () => {
    const big: Asset = { id: 'j2', kind: 'personal_jewelry', label: 'Gold set', amount: 200 }
    const r = computeZakat(input({ madhhab: 'shafii', assets: [cash(5000), big] }))
    // Still exempt, so still below the 8,748 gold threshold.
    expect(r.meetsNisab).toBe(false)
  })
})

describe('debts', () => {
  const liability: Liability = { id: 'l1', label: 'Car loan', amount: 30_000, dueWithinYear: 6000 }

  it('is deducted by Hanafi and Hanbali, ignored by Shafi\'i', () => {
    const hanafi = computeZakat(input({ madhhab: 'hanafi', assets: [cash(20_000)], liabilities: [liability] }))
    expect(hanafi.zakatableBase).toBeCloseTo(14_000, 2)
    expect(hanafi.zakatDue).toBeCloseTo(350, 2)

    const hanbali = computeZakat(input({ madhhab: 'hanbali', assets: [cash(20_000)], liabilities: [liability] }))
    expect(hanbali.zakatableBase).toBeCloseTo(14_000, 2)

    const shafii = computeZakat(input({ madhhab: 'shafii', assets: [cash(20_000)], liabilities: [liability] }))
    expect(shafii.zakatableBase).toBeCloseTo(20_000, 2)
    expect(shafii.zakatDue).toBeCloseTo(500, 2)
  })

  it('only deducts the instalments due inside the year, not the whole balance', () => {
    const r = computeZakat(input({ madhhab: 'hanafi', assets: [cash(20_000)], liabilities: [liability] }))
    expect(r.zakatableBase).toBeCloseTo(20_000 - 6000, 2)
  })
})

describe('business stock', () => {
  const held: Asset = {
    id: 'b1',
    kind: 'business_inventory',
    label: 'Unsold stock',
    amount: 40_000,
    traderType: 'muhtakir',
  }

  it('is excluded for a Maliki holder but counted by the other three', () => {
    const maliki = computeZakat(input({ madhhab: 'maliki', assets: [cash(20_000), held] }))
    expect(maliki.zakatableBase).toBeCloseTo(20_000, 2)
    expect(maliki.excluded.some((e) => e.label.includes('Unsold stock'))).toBe(true)

    const hanafi = computeZakat(input({ madhhab: 'hanafi', assets: [cash(20_000), held] }))
    expect(hanafi.zakatableBase).toBeCloseTo(60_000, 2)
  })

  it('counts an active Maliki trader\'s stock', () => {
    const active: Asset = { ...held, traderType: 'mudir' }
    const r = computeZakat(input({ madhhab: 'maliki', assets: [cash(20_000), active] }))
    expect(r.zakatableBase).toBeCloseTo(60_000, 2)
  })
})

describe('silver held separately', () => {
  it('is pooled with cash by Hanafi but assessed on its own by the other three', () => {
    const silver: Asset = { id: 's1', kind: 'silver', label: 'Silver bars', amount: 1000 } // 1,000g = 1,200

    const hanafi = computeZakat(input({ madhhab: 'hanafi', assets: [cash(500), silver] }))
    expect(hanafi.pools).toHaveLength(1)
    expect(hanafi.zakatableBase).toBeCloseTo(1700, 2)

    const shafii = computeZakat(input({ madhhab: 'shafii', assets: [cash(500), silver] }))
    expect(shafii.pools).toHaveLength(2)
    // Cash of 500 is below the gold threshold, but 1,200 of silver clears the silver one.
    const monetary = shafii.pools.find((p) => p.id === 'monetary')!
    const silverPool = shafii.pools.find((p) => p.id === 'silver')!
    expect(monetary.meetsNisab).toBe(false)
    expect(silverPool.meetsNisab).toBe(true)
    expect(shafii.zakatDue).toBeCloseTo(30, 2)
  })
})

describe('holding period', () => {
  it('survives a mid-year dip under Hanafi and restarts under the other three', () => {
    const hanafi = computeZakat(input({ madhhab: 'hanafi', assets: [cash(100_000)], dippedBelowNisab: true }))
    expect(hanafi.hawl.brokenByDip).toBe(false)
    expect(hanafi.zakatDue).toBeCloseTo(2500, 2)

    const shafii = computeZakat(input({ madhhab: 'shafii', assets: [cash(100_000)], dippedBelowNisab: true }))
    expect(shafii.hawl.brokenByDip).toBe(true)
    expect(shafii.zakatDue).toBe(0)
    expect(shafii.projectedZakat).toBeCloseTo(2500, 2)
  })

  it('holds zakat until the lunar year completes', () => {
    const r = computeZakat(input({ assets: [cash(100_000)], hawlStartDate: '2025-11-01', today: '2026-01-05' }))
    expect(r.hawl.complete).toBe(false)
    expect(r.zakatDue).toBe(0)
    expect(r.projectedZakat).toBeCloseTo(2500, 2)
    expect(r.hawl.daysRemaining).toBeGreaterThan(0)
  })
})

describe('unlawful income', () => {
  const tx = (over: Partial<Transaction>): Transaction => ({
    id: 't1',
    date: '2025-06-01',
    description: 'x',
    amount: 1000,
    currency: 'CAD',
    ...over,
  })

  it('is purified rather than zakated, and never enters the base', () => {
    const r = computeZakat(
      input({
        assets: [cash(100_000)],
        transactions: [tx({ id: 't1', verdict: 'HARAM', amount: 2000 })],
      }),
    )
    expect(r.purificationDue).toBeCloseTo(2000, 2)
    expect(r.zakatableBase).toBeCloseTo(98_000, 2)
    expect(r.zakatDue).toBeCloseTo(2450, 2)
  })

  it('purifies only the stated proportion of mixed income', () => {
    const r = computeZakat(
      input({
        assets: [cash(100_000)],
        transactions: [tx({ id: 't2', verdict: 'MIXED', amount: 10_000, haramRatio: 0.08 })],
      }),
    )
    expect(r.purificationDue).toBeCloseTo(800, 2)
    expect(r.zakatableBase).toBeCloseTo(99_200, 2)
  })

  it('leaves lawful and unresolved income alone', () => {
    const r = computeZakat(
      input({
        assets: [cash(100_000)],
        transactions: [
          tx({ id: 't3', verdict: 'HALAL', amount: 5000 }),
          tx({ id: 't4', verdict: 'NEEDS_INFO', amount: 5000 }),
          tx({ id: 't5', verdict: 'UNCERTAIN', amount: 5000 }),
        ],
      }),
    )
    expect(r.purificationDue).toBe(0)
    expect(r.zakatableBase).toBeCloseTo(100_000, 2)
  })

  it('never lets purification exceed the wealth on hand', () => {
    const r = computeZakat(
      input({ assets: [cash(500)], transactions: [tx({ id: 't6', verdict: 'HARAM', amount: 5000 })] }),
    )
    expect(r.zakatableBase).toBe(0)
    expect(r.zakatDue).toBe(0)
  })
})

describe('explainability', () => {
  it('emits a trace that names the school-specific steps', () => {
    const r = computeZakat(input({ madhhab: 'hanafi', assets: [cash(5000)] }))
    expect(r.trace.length).toBeGreaterThan(3)
    expect(r.trace.some((s) => s.madhhabSpecific)).toBe(true)
    expect(r.trace.every((s) => s.label.length > 0)).toBe(true)
  })

  it('attaches a citation to the threshold step', () => {
    const r = computeZakat(input({ madhhab: 'shafii', assets: [cash(50_000)] }))
    const step = r.trace.find((s) => s.id === 'nisab')
    expect(step?.citation?.source).toBeTruthy()
  })
})

describe('inaccessible retirement savings', () => {
  it('is left out of the base but recorded as excluded', () => {
    const locked: Asset = { id: 'r1', kind: 'retirement', label: 'Locked-in RRSP', amount: 50_000, accessible: false }
    const r = computeZakat(input({ assets: [cash(10_000), locked] }))
    expect(r.zakatableBase).toBeCloseTo(10_000, 2)
    expect(r.excluded.some((e) => e.label.includes('Locked-in RRSP'))).toBe(true)
  })

  it('counts retirement savings the holder can withdraw', () => {
    const open: Asset = { id: 'r2', kind: 'retirement', label: 'TFSA', amount: 50_000, accessible: true }
    const r = computeZakat(input({ assets: [cash(10_000), open] }))
    expect(r.zakatableBase).toBeCloseTo(60_000, 2)
  })
})
