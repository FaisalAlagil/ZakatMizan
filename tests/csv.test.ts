import { describe, it, expect } from 'vitest'
import { parseCsv, toTransactions } from '@/lib/import/csv'

describe('parseCsv', () => {
  it('suggests columns from common bank headers', () => {
    const { suggested, headers } = parseCsv('Date,Description,Amount\n2025-06-01,ETSY PAYOUT,240.00')
    expect(headers).toEqual(['Date', 'Description', 'Amount'])
    expect(suggested).toMatchObject({ date: 'Date', description: 'Description', amount: 'Amount' })
  })

  it('recognises separate credit and debit columns', () => {
    const { suggested } = parseCsv('Posted,Details,Money In,Money Out\n2025-06-01,RENT,1500,')
    expect(suggested.credit).toBe('Money In')
    expect(suggested.debit).toBe('Money Out')
  })
})

describe('toTransactions', () => {
  it('reads a signed amount column', () => {
    const { rows, suggested } = parseCsv('Date,Description,Amount\n2025-06-01,ETSY PAYOUT,"1,240.50"')
    const txs = toTransactions(rows, suggested as never, 'CAD')
    expect(txs[0].amount).toBeCloseTo(1240.5, 2)
    expect(txs[0].description).toBe('ETSY PAYOUT')
  })

  it('treats bracketed figures as money going out', () => {
    const { rows, suggested } = parseCsv('Date,Description,Amount\n2025-06-01,LCBO,(48.50)')
    expect(toTransactions(rows, suggested as never, 'CAD')[0].amount).toBeCloseTo(-48.5, 2)
  })

  it('nets credit against debit', () => {
    const { rows, suggested } = parseCsv('Posted,Details,Money In,Money Out\n2025-06-01,RENT,1500,\n2025-06-02,LCBO,,48.50')
    const txs = toTransactions(rows, suggested as never, 'CAD')
    expect(txs[0].amount).toBeCloseTo(1500, 2)
    expect(txs[1].amount).toBeCloseTo(-48.5, 2)
  })

  it('drops rows with no description', () => {
    const { rows, suggested } = parseCsv('Date,Description,Amount\n2025-06-01,,10\n2025-06-02,ETSY,20')
    expect(toTransactions(rows, suggested as never, 'CAD')).toHaveLength(1)
  })
})
