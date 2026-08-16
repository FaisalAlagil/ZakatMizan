import { describe, expect, it } from 'vitest'
import { parseCsv, toTransactions, type ColumnMap } from '@/lib/import/csv'

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
})
