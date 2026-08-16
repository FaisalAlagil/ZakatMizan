import { describe, it, expect } from 'vitest'
import { buildSummary } from '@/lib/export'
import { computeZakat } from '@/lib/fiqh/zakat-engine'
import type { Asset, Liability, MetalPrices, Transaction } from '@/lib/types'

const PRICES: MetalPrices = {
  goldPerGram: 100,
  silverPerGram: 1.2,
  currency: 'CAD',
  asOf: '2026-01-01',
  source: 'manual',
}

const assets: Asset[] = [
  { id: 'a1', kind: 'cash', label: 'Cash and bank', amount: 40_000 },
  { id: 'a2', kind: 'personal_jewelry', label: 'Gold you own', amount: 40 },
]
const liabilities: Liability[] = [{ id: 'l1', label: 'Car loan', amount: 6000, dueWithinYear: 6000 }]
const transactions: Transaction[] = [
  { id: 't1', date: '2025-06-01', description: 'Bank interest', amount: 312, currency: 'CAD', verdict: 'HARAM', basis: 'Riba.' },
  { id: 't2', date: '2025-06-02', description: 'Corner shop', amount: 10_000, currency: 'CAD', verdict: 'MIXED', haramRatio: 0.08 },
  { id: 't3', date: '2025-06-03', description: 'Music royalties', amount: 500, currency: 'CAD', verdict: 'UNCERTAIN' },
  { id: 't4', date: '2025-06-04', description: 'Salary', amount: 52_000, currency: 'CAD', verdict: 'HALAL' },
]

function summary(madhhab: 'hanafi' | 'shafii' = 'hanafi') {
  const result = computeZakat({
    madhhab,
    assets,
    liabilities,
    transactions,
    prices: PRICES,
    hawlStartDate: '2025-01-01',
    today: '2026-01-05',
    dippedBelowNisab: false,
  })
  return buildSummary({ result, assets, liabilities, transactions, today: '5 January 2026' })
}

describe('buildSummary', () => {
  it('names the school and the date it was prepared', () => {
    const s = summary()
    expect(s).toContain('Hanafi')
    expect(s).toContain('5 January 2026')
  })

  it('states the zakat and the purification separately', () => {
    const s = summary()
    expect(s).toMatch(/Zakat due: \$[\d,]+\.\d{2}/)
    expect(s).toContain('To set aside and purify (separate from zakat)')
  })

  it('lists what is held, in grams for metals', () => {
    const s = summary()
    expect(s).toContain('Cash and bank: $40,000.00')
    expect(s).toContain('Gold you own: 40g')
  })

  it('itemises income to purify and shows the share for mixed income', () => {
    const s = summary()
    expect(s).toContain('Bank interest: $312.00')
    expect(s).toContain('8% of $10,000.00')
  })

  it('separates income left for a scholar from income to purify', () => {
    const s = summary()
    expect(s).toContain('Left for a scholar to settle')
    expect(s).toContain('Music royalties')
  })

  it('leaves lawful income out of both lists', () => {
    expect(summary()).not.toContain('Salary')
  })

  it('reproduces every step of the working with its source', () => {
    const s = summary()
    expect(s).toContain('How it was worked out')
    expect(s).toContain('Threshold (nisab)')
    expect(s).toContain('Source:')
  })

  it('flags steps that no scholar has signed off on', () => {
    expect(summary()).toContain('[awaiting scholarly review]')
  })

  it('says plainly that it is not a fatwa', () => {
    expect(summary()).toContain('not a fatwa')
  })

  it('reflects the school it was produced for', () => {
    expect(summary('shafii')).toContain("Shafi'i")
    expect(summary('shafii')).not.toContain('Hanafi')
  })
})
