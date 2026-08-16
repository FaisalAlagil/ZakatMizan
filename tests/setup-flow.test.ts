import { describe, expect, it } from 'vitest'
import { parseCsv, toTransactions, type ColumnMap } from '@/lib/import/csv'

const SAMPLE_CSV = `date,description,amount,keyword
2025-08-18,Freelance Client Project Payment,3250.00,salary
2025-09-25,High Interest Savings Payout,74.50,interest_income
2025-10-14,Monthly Professional Consulting,4500.00,freelance
2025-11-08,Marketplace Payout (Mixed Sales),1800.00,mixed_income
2025-12-02,Dividend Distribution,380.00,dividend
2026-01-15,Tax Refund Deposit,1200.00,tax_refund`

describe('Setup Flow & Spreadsheet Import', () => {
  it('correctly parses sample CSV data used in SetupSpreadsheetImport', () => {
    const { rows, suggested, headers } = parseCsv(SAMPLE_CSV)
    expect(headers).toEqual(['date', 'description', 'amount', 'keyword'])
    expect(rows.length).toBe(6)
    expect(suggested.description).toBe('description')
    expect(suggested.amount).toBe('amount')

    const txs = toTransactions(rows, suggested as ColumnMap, 'CAD')
    expect(txs.length).toBe(6)

    const netCash = txs.reduce((sum, t) => sum + t.amount, 0)
    expect(netCash).toBeCloseTo(11204.5, 2)

    // Check classification categorization
    const halal = txs.filter((t) => t.verdict === 'HALAL')
    const haram = txs.filter((t) => t.verdict === 'HARAM')
    const mixed = txs.filter((t) => t.verdict === 'MIXED')

    expect(halal.length).toBe(4) // salary, freelance, dividend, tax_refund
    expect(haram.length).toBe(1) // interest_income
    expect(mixed.length).toBe(1) // mixed_income
  })

  it('handles empty CSV input gracefully with empty rows and safe fallback', () => {
    const { rows } = parseCsv('')
    expect(rows.length).toBe(0)
  })
})
