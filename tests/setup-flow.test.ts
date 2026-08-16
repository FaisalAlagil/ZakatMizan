import { describe, expect, it } from 'vitest'
import {
  extractBalancesFromCsv,
  extractGramsFromText,
  parseCsv,
  toTransactions,
  type ColumnMap,
} from '@/lib/import/csv'
import { GOLD_KARAT_FACTORS, SILVER_PURITY_FACTORS } from '@/lib/fiqh/karats'

const SAMPLE_CSV = `date,description,amount,keyword
2025-08-18,Freelance Client Project Payment,3250.00,salary
2025-09-25,High Interest Savings Payout,74.50,interest_income
2025-10-14,Monthly Professional Consulting,4500.00,freelance
2025-11-08,Marketplace Payout (Mixed Sales),1800.00,mixed_income
2025-12-02,Dividend Distribution,380.00,dividend
2026-01-15,Tax Refund Deposit,1200.00,tax_refund`

const ASSETS_CSV = `date,description,amount,keyword
2025-01-10,Chequing account initial balance,5000.00,cash
2025-01-12,22k Wedding Gold Bangles (40 grams),0,gold
2025-01-15,24k Bullion Bar (50g),0,gold
2025-01-18,Silver coins (250g),0,silver
2025-01-20,SPUS Shariah ETF Portfolio,8500.00,investment
2025-01-22,RRSP Locked-in Retirement Plan,15000.00,rrsp
2025-01-25,Retail Merchandise Stock for Resale,12000.00,inventory
2025-01-28,Auto Loan Balance Due,3500.00,debt`

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

  it('correctly extracts asset balances across all classes from CSV statements', () => {
    const { rows, suggested } = parseCsv(ASSETS_CSV)
    const balances = extractBalancesFromCsv(rows, suggested as ColumnMap, 'CAD')

    expect(balances.cash).toBeCloseTo(5000, 2)
    expect(balances.goldGrams).toBeCloseTo(90, 1) // 40g + 50g
    expect(balances.silverGrams).toBeCloseTo(250, 1)
    expect(balances.investments).toBeCloseTo(8500, 2)
    expect(balances.savings).toBeCloseTo(15000, 2)
    expect(balances.businessStock).toBeCloseTo(12000, 2)
    expect(balances.debts).toBeCloseTo(3500, 2)
  })

  it('accurately converts gram weights from textual patterns in CSV descriptions', () => {
    expect(extractGramsFromText('22k Gold Bangles 40g')).toBe(40)
    expect(extractGramsFromText('50 grams Bullion Bar')).toBe(50)
    expect(extractGramsFromText('1.5 oz fine gold coin')).toBeCloseTo(1.5 * 31.1035, 2)
    expect(extractGramsFromText('2 tolas gold jewelry')).toBeCloseTo(2 * 11.664, 2)
  })

  it('calculates exact pure 24K gold weight according to classical Karat purity standards', () => {
    // 40g of 22K (22/24 purity)
    const gold22k = 40 * GOLD_KARAT_FACTORS['22K'].factor
    expect(gold22k).toBeCloseTo(36.667, 2)

    // 50g of 24K (24/24 purity)
    const gold24k = 50 * GOLD_KARAT_FACTORS['24K'].factor
    expect(gold24k).toBe(50)

    // 15g of 18K (18/24 purity)
    const gold18k = 15 * GOLD_KARAT_FACTORS['18K'].factor
    expect(gold18k).toBe(11.25)

    // Total pure gold weight
    const totalPureGold = gold22k + gold24k + gold18k
    expect(totalPureGold).toBeCloseTo(97.917, 2)
  })

  it('calculates exact silver purity for sterling (925) and fine silver (999)', () => {
    const sterlingSilver = 100 * SILVER_PURITY_FACTORS['925'].factor
    expect(sterlingSilver).toBe(92.5)

    const fineSilver = 100 * SILVER_PURITY_FACTORS['999'].factor
    expect(fineSilver).toBe(100)
  })

  it('handles empty CSV input gracefully with empty rows and safe fallback', () => {
    const { rows } = parseCsv('')
    expect(rows.length).toBe(0)
  })
})
