import { describe, it, expect } from 'vitest'
import { canConvert, convert, formatMoney, type Rates } from '@/lib/currency'

const RATES: Rates = {
  base: 'USD',
  asOf: '2026-08-01',
  source: 'manual',
  rates: { USD: 1, CAD: 1.4, GBP: 0.8, PKR: 280 },
}

describe('convert', () => {
  it('leaves an amount alone when the currency already matches', () => {
    expect(convert(500, 'CAD', 'CAD', RATES)).toBe(500)
  })

  it('converts through the base', () => {
    // 1,400 CAD is 1,000 USD, which is 800 GBP.
    expect(convert(1400, 'CAD', 'GBP', RATES)).toBeCloseTo(800, 6)
  })

  it('converts from the base and back to it', () => {
    expect(convert(1000, 'USD', 'CAD', RATES)).toBeCloseTo(1400, 6)
    expect(convert(1400, 'CAD', 'USD', RATES)).toBeCloseTo(1000, 6)
  })

  it('round-trips without drift', () => {
    const there = convert(2500, 'PKR', 'GBP', RATES)
    expect(convert(there, 'GBP', 'PKR', RATES)).toBeCloseTo(2500, 6)
  })

  it('handles a currency whose unit is far from the base', () => {
    // 280,000 PKR is 1,000 USD.
    expect(convert(280_000, 'PKR', 'USD', RATES)).toBeCloseTo(1000, 6)
  })

  it('returns the amount unchanged rather than zero when a rate is missing', () => {
    expect(convert(750, 'XYZ', 'CAD', RATES)).toBe(750)
    expect(convert(750, 'CAD', 'XYZ', RATES)).toBe(750)
  })
})

describe('canConvert', () => {
  it('is true for matching currencies and for known pairs', () => {
    expect(canConvert('CAD', 'CAD', RATES)).toBe(true)
    expect(canConvert('PKR', 'GBP', RATES)).toBe(true)
  })

  it('is false when a rate is missing', () => {
    expect(canConvert('XYZ', 'CAD', RATES)).toBe(false)
  })
})

describe('mixed currencies reaching the zakat figure', () => {
  // Mirrors what useZakat does before handing anything to the engine.
  const toMain = (main: string) => ({
    assets: [
      { id: 'a1', kind: 'cash' as const, label: 'Canadian savings', amount: 14_000, currency: 'CAD' },
      { id: 'a2', kind: 'cash' as const, label: 'UK account', amount: 8_000, currency: 'GBP' },
      { id: 'a3', kind: 'cash' as const, label: 'Family in Pakistan', amount: 280_000, currency: 'PKR' },
    ].map((a) => ({ ...a, amount: convert(a.amount, a.currency, main, RATES), currency: main })),
    liabilities: [
      { id: 'l1', label: 'Card', amount: 1400, dueWithinYear: 1400, currency: 'CAD' },
    ].map((l) => ({
      ...l,
      amount: convert(l.amount, l.currency, main, RATES),
      dueWithinYear: convert(l.dueWithinYear, l.currency, main, RATES),
      currency: main,
    })),
  })

  it('adds holdings in three currencies into one total', () => {
    // 14,000 CAD = 10,000 USD; 8,000 GBP = 10,000 USD; 280,000 PKR = 1,000 USD.
    const { assets } = toMain('USD')
    expect(assets.reduce((s, a) => s + a.amount, 0)).toBeCloseTo(21_000, 6)
  })

  it('gives the same wealth whichever main currency is chosen', () => {
    const usd = toMain('USD').assets.reduce((s, a) => s + a.amount, 0)
    const cad = toMain('CAD').assets.reduce((s, a) => s + a.amount, 0)
    expect(convert(cad, 'CAD', 'USD', RATES)).toBeCloseTo(usd, 6)
  })

  it('converts debts too, so they net off correctly', () => {
    const { assets, liabilities } = toMain('USD')
    const net =
      assets.reduce((s, a) => s + a.amount, 0) - liabilities.reduce((s, l) => s + l.dueWithinYear, 0)
    // 1,400 CAD of debt is 1,000 USD.
    expect(net).toBeCloseTo(20_000, 6)
    expect(net * 0.025).toBeCloseTo(500, 6)
  })
})

describe('an amount keeps the currency it was entered in', () => {
  // Mirrors useZakat: an asset with no currency is read as the main currency,
  // so anything saved without one silently changes value when the main
  // currency changes. Entries must carry their own currency.
  const read = (asset: { amount: number; currency?: string }, main: string) =>
    convert(asset.amount, asset.currency ?? main, main, RATES)

  it('reinterprets an unstamped amount when the main currency changes', () => {
    const floating = { amount: 25_000 }
    expect(read(floating, 'CAD')).toBe(25_000)
    expect(read(floating, 'GBP')).toBe(25_000) // same number, different money
  })

  it('converts a stamped amount instead of reinterpreting it', () => {
    const stamped = { amount: 25_000, currency: 'CAD' }
    expect(read(stamped, 'CAD')).toBe(25_000)
    // 25,000 CAD is 17,857.14 USD, which is 14,285.71 GBP.
    expect(read(stamped, 'GBP')).toBeCloseTo(14_285.71, 2)
  })

  it('gives the same zakat whichever currency it is displayed in', () => {
    const stamped = { amount: 25_000, currency: 'CAD' }
    const inCad = read(stamped, 'CAD') * 0.025
    const inGbp = read(stamped, 'GBP') * 0.025
    expect(convert(inGbp, 'GBP', 'CAD', RATES)).toBeCloseTo(inCad, 6)
  })
})

describe('formatMoney', () => {
  it('formats a known currency', () => {
    expect(formatMoney(1234.5, 'CAD')).toContain('1,234.50')
  })

  it('still shows an unrecognised but well-formed code alongside the figure', () => {
    expect(formatMoney(10, 'XYZ')).toContain('10.00')
    expect(formatMoney(10, 'XYZ')).toContain('XYZ')
  })

  it('falls back rather than throwing on a malformed code', () => {
    // Intl rejects anything that is not three letters.
    expect(formatMoney(10, 'xy')).toBe('10.00 xy')
  })
})
