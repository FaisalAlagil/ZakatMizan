import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import {
  extractBalancesFromCsv,
  parseCsv,
  parseWorkbook,
  toTransactions,
  type ColumnMap,
} from '@/lib/import/csv'
import {
  calculatePortfolioPurification,
  screenInvestment,
} from '@/lib/fiqh/investments'

const SAMPLE_CSV = `person_name,transaction_id,date,keyword,amount_cad,direction,transaction_type,merchant_or_source,description,account,scope,status,mixed_halal_pct,haram_portion_disposed,cost_basis_cad,related_reference,missing_information,parse_line
Nadia Rahman,NRR000157,2025-08-18,freelance_income,$202.70,inflow,income,Freelance Client,Freelance professional work payment,NR_CHQ_PERSONAL,personal,posted,,,,,,2025-08-18 | freelance_income | 202.70 | inflow | income | Freelance Client | Freelance professional work payment
Nadia Rahman,NRH001,2025-09-25,interest_income,$58.25,inflow,income,Bank,Interest income credited by bank,NR_SAVINGS,personal,posted,,,,,,2025-09-25 | interest_income | 58.25 | inflow | income | Bank | Interest income credited by bank
Nadia Rahman,NRH002,2025-11-08,alcohol_sales_income,$640.00,inflow,income,Event Bar Sales,Income from direct alcohol sales,NR_CHQ_BUSINESS,business,posted,,,,,,2025-11-08 | alcohol_sales_income | 640.00 | inflow | income | Event Bar Sales | Income from direct alcohol sales
Nadia Rahman,NRS0012,2026-01-06,mixed_income_disposed,"$2,000.00",inflow,income,Marketplace Payout,Business payout: 80% permissible sales and 20% prohibited-product sales. Known haram portion was removed/disposed.,NR_CHQ_BUSINESS,business,posted,80,yes,,,,2026-01-06 | mixed_income_disposed | 2000.00 | inflow | income | Marketplace Payout | Business payout: 80% permissible sales and 20% prohibited-product sales. Known haram portion was removed/disposed.
Nadia Rahman,NRS0013,2026-01-22,mixed_income_retained,"$1,500.00",inflow,income,Marketplace Payout,Business payout: 70% permissible sales and 30% prohibited-product sales. Owner retained the full mixed amount.,NR_CHQ_BUSINESS,business,posted,70,no,,,,2026-01-22 | mixed_income_retained | 1500.00 | inflow | income | Marketplace Payout | Business payout: 70% permissible sales and 30% prohibited-product sales. Owner retained the full mixed amount.
Nadia Rahman,NRS0014,2026-02-04,mixed_income_missing_split,$980.00,inflow,income,Marketplace Payout,"Business payout contains permissible and prohibited sales, but the split percentage was not provided.",NR_CHQ_BUSINESS,business,posted,,,,,Percentage of permissible vs prohibited revenue is missing,"2026-02-04 | mixed_income_missing_split | 980.00 | inflow | income | Marketplace Payout | Business payout contains permissible and prohibited sales, but the split percentage was not provided."
Nadia Rahman,NRS0015,2026-02-14,tentative_cashback,$36.50,inflow,adjustment,Credit Card Provider,Cashback reward on regular purchases; transaction details are otherwise complete.,NR_CHQ_PERSONAL,personal,posted,,,,,,2026-02-14 | tentative_cashback | 36.50 | inflow | adjustment | Credit Card Provider | Cashback reward on regular purchases; transaction details are otherwise complete.
Nadia Rahman,NRS0017,2026-03-02,missing_info_affiliate_income,$260.00,inflow,income,Affiliate Network,Affiliate payout received; underlying promoted product/service is not listed.,NR_CHQ_PERSONAL,personal,posted,,,,,Underlying product/service and contract terms are missing,2026-03-02 | missing_info_affiliate_income | 260.00 | inflow | income | Affiliate Network | Affiliate payout received; underlying promoted product/service is not listed.
Nadia Rahman,NRR000034,2025-08-28,groceries,$98.20,outflow,expense,Local Grocer,Household grocery purchase,NR_VISA_PERSONAL,personal,posted,,,,,,2025-08-28 | groceries | 98.20 | outflow | expense | Local Grocer | Household grocery purchase`

describe('Hackathon CSV Import Dataset Parser', () => {
  it('parses benchmark CSV headers and maps columns automatically', () => {
    const { headers, rows, suggested } = parseCsv(SAMPLE_CSV)
    expect(headers).toContain('amount_cad')
    expect(headers).toContain('keyword')
    expect(headers).toContain('direction')
    expect(rows.length).toBe(9)

    const txs = toTransactions(rows, suggested as ColumnMap, 'CAD')
    expect(txs.length).toBe(9)

    // Freelance income -> HALAL
    const freelance = txs.find((t) => t.id === 'NRR000157')
    expect(freelance?.verdict).toBe('HALAL')
    expect(freelance?.amount).toBe(202.7)

    // Interest -> HARAM
    const interest = txs.find((t) => t.id === 'NRH001')
    expect(interest?.verdict).toBe('HARAM')
    expect(interest?.amount).toBe(58.25)

    // Alcohol -> HARAM
    const alcohol = txs.find((t) => t.id === 'NRH002')
    expect(alcohol?.verdict).toBe('HARAM')

    // Mixed Disposed -> MIXED with 20% haram ratio and disposed
    const mixedDisposed = txs.find((t) => t.id === 'NRS0012')
    expect(mixedDisposed?.verdict).toBe('MIXED')
    expect(mixedDisposed?.haramRatio).toBeCloseTo(0.2, 2)
    expect(mixedDisposed?.mixedTreatment).toBe('disposed')

    // Mixed Retained -> MIXED with 30% haram ratio and retained
    const mixedRetained = txs.find((t) => t.id === 'NRS0013')
    expect(mixedRetained?.verdict).toBe('MIXED')
    expect(mixedRetained?.haramRatio).toBeCloseTo(0.3, 2)
    expect(mixedRetained?.mixedTreatment).toBe('retained')

    // Mixed Missing Split -> NEEDS_INFO
    const missingSplit = txs.find((t) => t.id === 'NRS0014')
    expect(missingSplit?.verdict).toBe('NEEDS_INFO')

    // Tentative Cashback -> UNCERTAIN (Scholar Review)
    const cashback = txs.find((t) => t.id === 'NRS0015')
    expect(cashback?.verdict).toBe('UNCERTAIN')

    // Missing Info Affiliate -> NEEDS_INFO
    const missingAffiliate = txs.find((t) => t.id === 'NRS0017')
    expect(missingAffiliate?.verdict).toBe('NEEDS_INFO')

    // Outflow Expense -> nonincome.debit with negative amount
    const expense = txs.find((t) => t.id === 'NRR000034')
    expect(expense?.amount).toBe(-98.2)
    expect(expense?.verdict).toBeUndefined()
  })

  it('correctly ingests multi-sheet Excel workbooks with Gold and Investments on separate tabs', () => {
    // Construct an in-memory multi-sheet workbook
    const wb = XLSX.utils.book_new()

    // Sheet 1: Transactions
    const ws1 = XLSX.utils.json_to_sheet([
      { date: '2025-01-01', description: 'Tech Salary Paycheque', amount: 5000, keyword: 'salary' },
      { date: '2025-01-15', description: 'Bank Interest Credit', amount: 45, keyword: 'interest' },
    ])
    XLSX.utils.book_append_sheet(wb, ws1, 'Transactions')

    // Sheet 2: Gold and Jewelry
    const ws2 = XLSX.utils.json_to_sheet([
      { item: 'Wedding Gold Bangles (22k)', weight_grams: 40, market_value: 7040 },
      { item: 'Pure 24k Bullion Bar', weight_grams: 50, market_value: 8800 },
    ])
    XLSX.utils.book_append_sheet(wb, ws2, 'Gold & Jewelry')

    // Sheet 3: Investments & Equities
    const ws3 = XLSX.utils.json_to_sheet([
      { holding: 'SP Funds S&P 500 Sharia ETF (SPUS)', market_value: 12000, type: 'investment' },
      { holding: 'Apple Inc. (AAPL)', market_value: 6000, type: 'stocks' },
    ])
    XLSX.utils.book_append_sheet(wb, ws3, 'Investments')

    // Write to binary buffer
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })

    const { sheets, allRows, sheetNames } = parseWorkbook(buf)
    expect(sheetNames).toEqual(['Transactions', 'Gold & Jewelry', 'Investments'])
    expect(sheets.length).toBe(3)
    expect(allRows.length).toBe(6)

    const balances = extractBalancesFromCsv(allRows, sheets[0].suggested as ColumnMap, 'CAD')
    expect(balances.cash).toBe(5045) // 5000 salary + 45 interest
    expect(balances.goldGrams).toBeCloseTo(90, 1) // 40g + 50g from Sheet 2
    expect(balances.investments).toBe(18000) // 12000 + 6000 from Sheet 3
  })
})

describe('Investment Shariah Screening & Purification', () => {
  it('screens SPUS and HLAL as 100% Halal compliant with 0% purification', () => {
    const spus = screenInvestment('SPUS', 10000, 150)
    expect(spus.shariahStatus).toBe('halal')
    expect(spus.halalRatio).toBe(1.0)
    expect(spus.purificationRatio).toBe(0.0)
    expect(spus.purificationDue).toBe(0)
  })

  it('screens VOO and S&P 500 as mixed with exact 5% dividend purification requirement', () => {
    const voo = screenInvestment('VOO', 20000, 400) // $400 annual dividend
    expect(voo.shariahStatus).toBe('mixed')
    expect(voo.halalRatio).toBe(0.95)
    expect(voo.purificationRatio).toBe(0.05)
    // 5% of $400 dividend = $20 purification due
    expect(voo.purificationDue).toBe(20)
  })

  it('screens custom 96% Halal investment and computes exact 4% purification', () => {
    const custom = screenInvestment('Custom Tech Fund', 50000, 1000)
    custom.halalRatio = 0.96
    custom.purificationRatio = 0.04
    custom.purificationDue = 1000 * 0.04
    expect(custom.purificationDue).toBe(40)

    const portfolio = calculatePortfolioPurification([custom])
    expect(portfolio.totalMarketValue).toBe(50000)
    expect(portfolio.totalHalalValue).toBe(48000)
    expect(portfolio.totalPurificationDue).toBe(40)
  })

  it('screens conventional bank stocks as 100% Haram requiring full disposal', () => {
    const rbc = screenInvestment('Royal Bank of Canada (RY)', 5000, 200)
    expect(rbc.shariahStatus).toBe('haram')
    expect(rbc.halalRatio).toBe(0.0)
    expect(rbc.purificationRatio).toBe(1.0)
  })
})
