import { describe, expect, it } from 'vitest'
import { computeZakat, purificationDeduction, purificationTotal } from '@/lib/fiqh/zakat-engine'
import { HACKATHON_TEST_CASES } from '@/lib/fiqh/test-cases'
import type { MetalPrices, Transaction } from '@/lib/types'

const FIXED_PRICES_CAD: MetalPrices = {
  goldPerGram: 176,
  silverPerGram: 2.2,
  currency: 'CAD',
  asOf: '2026-08-16',
  source: 'manual',
}

describe('Hackathon Specific Fiqh Rules & Test Cases', () => {
  describe('Mixed Income Purification & Retained Treatment', () => {
    const mixedTxDisposed: Transaction = {
      id: 'tx-1',
      date: '2025-05-01',
      description: 'Conventional Fund Dividend',
      amount: 1000,
      currency: 'CAD',
      verdict: 'MIXED',
      haramRatio: 0.05,
      mixedTreatment: 'disposed',
    }

    const mixedTxRetained: Transaction = {
      id: 'tx-2',
      date: '2025-05-01',
      description: 'Conventional Fund Dividend Retained',
      amount: 1000,
      currency: 'CAD',
      verdict: 'MIXED',
      haramRatio: 0.05,
      mixedTreatment: 'retained',
    }

    const haramTx: Transaction = {
      id: 'tx-3',
      date: '2025-05-01',
      description: 'Bank APY Interest',
      amount: 200,
      currency: 'CAD',
      verdict: 'HARAM',
    }

    it('purificationTotal sums 100% of haram income and non-halal portions of mixed income', () => {
      expect(purificationTotal([haramTx])).toBe(200)
      expect(purificationTotal([mixedTxDisposed])).toBe(50)
      expect(purificationTotal([haramTx, mixedTxDisposed])).toBe(250)
      expect(purificationTotal([haramTx, mixedTxRetained])).toBe(250)
    })

    it('purificationDeduction deducts haram portion only if disposed, retaining mixed wealth if kept', () => {
      // If disposed, 50 is deducted from wealth base
      expect(purificationDeduction([mixedTxDisposed])).toBe(50)
      // If retained, per hackathon rules, 0 is deducted from wealth base so full mixed wealth remains zakatable
      expect(purificationDeduction([mixedTxRetained])).toBe(0)
    })
  })

  describe('Three Hackathon Test Cases Execution', () => {
    it('executes Test Case 1 (Salaried Professional & Screened Equities) correctly', () => {
      const tc = HACKATHON_TEST_CASES.case1
      const resultHanafi = computeZakat({
        madhhab: 'hanafi',
        assets: tc.assets,
        liabilities: tc.liabilities,
        transactions: tc.transactions,
        prices: FIXED_PRICES_CAD,
        hawlStartDate: tc.hawlStartDate,
        today: '2026-01-01',
        dippedBelowNisab: tc.dippedBelowNisab,
      })

      // In Hanafi: cash ($12,000) + gold (45g * 176 = $7,920) + stocks ($8,000) = $27,920 gross
      // Minus debts ($2,500) = $25,420 net zakatable wealth
      expect(resultHanafi.pools[0].gross).toBe(27920)
      expect(resultHanafi.pools[0].net).toBe(25420)
      expect(resultHanafi.meetsNisab).toBe(true)
      expect(resultHanafi.zakatDue).toBe(25420 * 0.025)
      expect(resultHanafi.purificationDue).toBe(0)

      const resultShafii = computeZakat({
        madhhab: 'shafii',
        assets: tc.assets,
        liabilities: tc.liabilities,
        transactions: tc.transactions,
        prices: FIXED_PRICES_CAD,
        hawlStartDate: tc.hawlStartDate,
        today: '2026-01-01',
        dippedBelowNisab: tc.dippedBelowNisab,
      })

      // In Shafi'i: personal jewelry is exempt, personal debts not deductible.
      // Cash ($12,000) + stocks ($8,000) = $20,000 net zakatable wealth
      expect(resultShafii.pools[0].net).toBe(20000)
      expect(resultShafii.zakatDue).toBe(20000 * 0.025)
    })

    it('executes Test Case 2 (Mixed Income & Purification) correctly', () => {
      const tc = HACKATHON_TEST_CASES.case2
      const resultHanafi = computeZakat({
        madhhab: 'hanafi',
        assets: tc.assets,
        liabilities: tc.liabilities,
        transactions: tc.transactions,
        prices: FIXED_PRICES_CAD,
        hawlStartDate: tc.hawlStartDate,
        today: '2026-01-01',
        dippedBelowNisab: tc.dippedBelowNisab,
      })

      // Purification due: $350 (interest) + $60 (5% of $1200 dividend) = $410
      expect(resultHanafi.purificationDue).toBe(410)

      // Cash ($9,500) + inventory ($4,000) = $13,500 gross
      // Deductions: $1,000 debt + $410 purification = $1,410
      // Net = $13,500 - $1,410 = $12,090
      expect(resultHanafi.pools[0].net).toBe(12090)
      expect(resultHanafi.zakatDue).toBe(12090 * 0.025)
    })

    it('executes Test Case 3 (Trade Goods & Broken Hawl Continuity) correctly', () => {
      const tc = HACKATHON_TEST_CASES.case3
      const resultHanafi = computeZakat({
        madhhab: 'hanafi',
        assets: tc.assets,
        liabilities: tc.liabilities,
        transactions: tc.transactions,
        prices: FIXED_PRICES_CAD,
        hawlStartDate: tc.hawlStartDate,
        today: '2026-01-01',
        dippedBelowNisab: tc.dippedBelowNisab,
      })

      // In Hanafi: mid-year dip does NOT break hawl if nisab met at endpoints
      expect(resultHanafi.hawl.brokenByDip).toBe(false)
      expect(resultHanafi.hawl.complete).toBe(true)
      expect(resultHanafi.zakatDue).toBeGreaterThan(0)

      const resultMaliki = computeZakat({
        madhhab: 'maliki',
        assets: tc.assets,
        liabilities: tc.liabilities,
        transactions: tc.transactions,
        prices: FIXED_PRICES_CAD,
        hawlStartDate: tc.hawlStartDate,
        today: '2026-01-01',
        dippedBelowNisab: tc.dippedBelowNisab,
      })

      // In Maliki: continuous hawl means a dip restarts the year -> zakatDue is 0 until complete hawl
      expect(resultMaliki.hawl.brokenByDip).toBe(true)
      expect(resultMaliki.zakatDue).toBe(0)
    })
  })
})
