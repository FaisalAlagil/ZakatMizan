import Papa from 'papaparse'
import type { Asset, Liability, Transaction, Verdict } from '@/lib/types'
import { REF } from '@/lib/fiqh/fiqh-references'

export type ColumnMap = {
  date: string
  description: string
  /** A single signed amount column. */
  amount?: string
  /** Or a separate credit column, which is what most Canadian banks export. */
  credit?: string
  debit?: string
  direction?: string
  keyword?: string
  mixedHalalPct?: string
  haramPortionDisposed?: string
  missingInfo?: string
}

export type ParsedCsv = {
  headers: string[]
  rows: Record<string, string>[]
  suggested: Partial<ColumnMap>
}

export type ExtractedBalances = {
  cash: number
  goldGrams: number
  silverGrams: number
  investments: number
  savings: number
  businessStock: number
  debts: number
}

const MATCHERS: Record<keyof ColumnMap, RegExp> = {
  date: /^(date|transaction date|posted|posting date)$/i,
  description: /^(description|details|memo|narrative|merchant_or_source|merchant|payee|transaction|parse_line|asset_name|name|item)$/i,
  amount: /^(amount|amount_cad|amount_usd|value|sum|balance|total)$/i,
  credit: /^(credit|deposit|money in|paid in|inflow)$/i,
  debit: /^(debit|withdrawal|money out|paid out|outflow)$/i,
  direction: /^(direction|type|flow)$/i,
  keyword: /^(keyword|category|trans_type|transaction_type|asset_type|kind)$/i,
  mixedHalalPct: /^(mixed_halal_pct|halal_pct|halal_percent)$/i,
  haramPortionDisposed: /^(haram_portion_disposed|disposed|purified)$/i,
  missingInfo: /^(missing_information|missing_info|warning)$/i,
}

export function parseCsv(text: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })

  const headers = result.meta.fields ?? []
  const suggested: Partial<ColumnMap> = {}

  for (const key of Object.keys(MATCHERS) as (keyof ColumnMap)[]) {
    const hit = headers.find((h) => MATCHERS[key].test(h.trim()))
    if (hit) suggested[key] = hit
  }

  // Fall back to positional guesses so an unlabelled export still imports.
  if (!suggested.description) suggested.description = headers.find((h) => /desc|detail|memo|merchant|keyword|item|name/i.test(h))
  if (!suggested.date) suggested.date = headers.find((h) => /date/i.test(h))
  if (!suggested.amount) suggested.amount = headers.find((h) => /amount|value|balance/i.test(h))

  return { headers, rows: result.data, suggested }
}

export function toNumber(raw: string | undefined): number {
  if (!raw) return 0
  const cleaned = raw.replace(/[^0-9.\-()]/g, '')
  const negative = /^\(.*\)$/.test(cleaned)
  const value = Number.parseFloat(cleaned.replace(/[()]/g, ''))
  if (Number.isNaN(value)) return 0
  return negative ? -value : value
}

/**
 * Extract weight in grams from text (e.g., "40g 22k gold", "50 grams", "2.5 oz")
 */
export function extractGramsFromText(text: string): number {
  const matchGrams = text.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:g|grams?)\b/i)
  if (matchGrams) return Number.parseFloat(matchGrams[1]) || 0

  const matchOz = text.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:oz|ounces?|troy oz)\b/i)
  if (matchOz) return (Number.parseFloat(matchOz[1]) || 0) * 31.1035

  const matchTola = text.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:tolas?)\b/i)
  if (matchTola) return (Number.parseFloat(matchTola[1]) || 0) * 11.664

  return 0
}

export function toTransactions(
  rows: Record<string, string>[],
  map: ColumnMap,
  currency: string,
): Transaction[] {
  return rows
    .map((row, index) => {
      let rawAmount = map.credit
        ? toNumber(row[map.credit]) - toNumber(row[map.debit ?? ''])
        : toNumber(row[map.amount ?? ''])

      const direction = (row[map.direction ?? 'direction'] ?? row.direction ?? '').toLowerCase().trim()
      if (direction === 'outflow' && rawAmount > 0) {
        rawAmount = -rawAmount
      }

      const desc = (
        row[map.description] ??
        row.description ??
        row.merchant_or_source ??
        row.keyword ??
        ''
      ).trim()

      if (!desc) return null

      const keyword = (row[map.keyword ?? 'keyword'] ?? row.keyword ?? '').toLowerCase().trim()
      const missingInfo = (row[map.missingInfo ?? 'missing_information'] ?? row.missing_information ?? '').trim()
      const mixedHalalPctRaw = row[map.mixedHalalPct ?? 'mixed_halal_pct'] ?? row.mixed_halal_pct
      const disposedRaw = (row[map.haramPortionDisposed ?? 'haram_portion_disposed'] ?? row.haram_portion_disposed ?? '').toLowerCase().trim()

      const tx: Transaction = {
        id: row.transaction_id || `csv-${index}-${Math.abs(rawAmount)}-${desc.slice(0, 12)}`,
        date: row[map.date] ?? row.date ?? new Date().toISOString().slice(0, 10),
        description: desc,
        amount: rawAmount,
        currency,
        counterparty: row.merchant_or_source ?? row.merchant ?? undefined,
      }

      // Outgoing expense or transfer
      if (rawAmount <= 0) {
        tx.verdict = undefined
        tx.ruleId = 'nonincome.debit'
        return tx
      }

      // Check explicit missing information flag from dataset
      if (missingInfo || keyword.includes('missing_info') || keyword.includes('missing_split') || keyword.includes('missing_cost_basis')) {
        tx.verdict = 'NEEDS_INFO'
        tx.basis = missingInfo || 'Origin details or cost basis are missing; more information required.'
        tx.uncertaintyKind = 'technical'
        tx.classifiedBy = 'rule'
        return tx
      }

      // Check mixed income keywords & percentage
      if (keyword.includes('mixed') || mixedHalalPctRaw) {
        tx.verdict = 'MIXED'
        const halalPct = Number.parseFloat(mixedHalalPctRaw || '95') || 95
        tx.haramRatio = Math.max(0, Math.min(1, (100 - halalPct) / 100))
        tx.haramRatioIsEstimate = false
        tx.mixedTreatment = disposedRaw === 'no' || keyword.includes('retained') ? 'retained' : 'disposed'
        tx.basis = `Mixed income (${halalPct}% halal). Haram portion is ${tx.mixedTreatment === 'disposed' ? 'disposed/purified' : 'retained in wealth'}.`
        tx.citation = REF.mixedIncomePurification
        tx.classifiedBy = 'rule'
        return tx
      }

      // Check tentative keywords
      if (keyword.startsWith('tentative_')) {
        tx.verdict = 'UNCERTAIN'
        tx.uncertaintyKind = 'scholarly'
        tx.basis = 'Provisional or unscreened transaction requiring qualified scholarly review.'
        tx.citation = REF.conventionalBankingWork
        tx.classifiedBy = 'rule'
        return tx
      }

      // Check explicit haram keywords
      if (
        keyword.includes('interest') ||
        keyword.includes('alcohol') ||
        keyword.includes('gambling') ||
        keyword.includes('lottery') ||
        keyword.includes('prohibited') ||
        keyword.includes('vape')
      ) {
        tx.verdict = 'HARAM'
        tx.basis = 'Impermissible income. 100% must be separated for disposal and excluded from zakat.'
        tx.citation = keyword.includes('interest') ? REF.ribaProhibited : REF.employmentInHaramIndustry
        tx.classifiedBy = 'rule'
        return tx
      }

      // Check explicit halal keywords
      if (
        keyword.includes('salary') ||
        keyword.includes('rental') ||
        keyword.includes('freelance') ||
        keyword.includes('business_sale') ||
        keyword.includes('gross_business') ||
        keyword.includes('tip') ||
        keyword.includes('gift') ||
        keyword.includes('scholarship') ||
        keyword.includes('dividend') ||
        keyword.includes('tax_refund') ||
        keyword.includes('content_revenue') ||
        keyword.includes('commission') ||
        keyword.includes('crypto_sale')
      ) {
        tx.verdict = 'HALAL'
        tx.basis = 'Proceeds from permissible trade, services, or earnings.'
        tx.citation = REF.lawfulEarning
        tx.classifiedBy = 'rule'
        return tx
      }

      return tx
    })
    .filter((t): t is Transaction => t !== null && t.description.length > 0)
}

/**
 * Automatically extracts setup asset balances (Gold, Silver, Investments, RRSP, Business Stock, Debts, Cash)
 * from bank statements, balance sheets, and transaction spreadsheets.
 */
export function extractBalancesFromCsv(
  rows: Record<string, string>[],
  map: ColumnMap,
  currency: string,
  goldPricePerGram = 176,
  silverPricePerGram = 2.2,
): ExtractedBalances {
  const result: ExtractedBalances = {
    cash: 0,
    goldGrams: 0,
    silverGrams: 0,
    investments: 0,
    savings: 0,
    businessStock: 0,
    debts: 0,
  }

  let regularCashSum = 0

  for (const row of rows) {
    const rawVal = map.credit
      ? toNumber(row[map.credit]) - toNumber(row[map.debit ?? ''])
      : toNumber(row[map.amount ?? ''])

    const desc = (
      row[map.description] ??
      row.description ??
      row.merchant_or_source ??
      row.keyword ??
      ''
    ).trim()

    if (!desc && rawVal === 0) continue

    const keyword = (row[map.keyword ?? 'keyword'] ?? row.keyword ?? '').toLowerCase().trim()
    const text = `${desc} ${keyword}`.toLowerCase()
    const absVal = Math.abs(rawVal)

    // 1. Gold detection
    if (
      text.includes('gold') ||
      keyword.includes('gold') ||
      keyword.includes('jewelry') ||
      text.includes('mithqal') ||
      text.includes('bullion bar')
    ) {
      const parsedGrams = extractGramsFromText(text)
      if (parsedGrams > 0) {
        result.goldGrams += parsedGrams
      } else if (absVal > 0) {
        // If denominated in dollars, convert to grams using live gold price
        result.goldGrams += absVal / (goldPricePerGram || 176)
      }
      continue
    }

    // 2. Silver detection
    if (text.includes('silver') || keyword.includes('silver') || text.includes('dirham')) {
      const parsedGrams = extractGramsFromText(text)
      if (parsedGrams > 0) {
        result.silverGrams += parsedGrams
      } else if (absVal > 0) {
        result.silverGrams += absVal / (silverPricePerGram || 2.2)
      }
      continue
    }

    // 3. Investments / Stocks / Equities / ETF
    if (
      keyword.includes('stock') ||
      keyword.includes('equity') ||
      keyword.includes('etf') ||
      keyword.includes('investment') ||
      text.includes('etf') ||
      text.includes('shares') ||
      text.includes('brokerage') ||
      text.includes('mutual fund') ||
      text.includes('equities')
    ) {
      result.investments += absVal
      continue
    }

    // 4. Retirement / RRSP / Pension / TFSA / 401k
    if (
      keyword.includes('rrsp') ||
      keyword.includes('retirement') ||
      keyword.includes('pension') ||
      text.includes('rrsp') ||
      text.includes('tfsa') ||
      text.includes('pension') ||
      text.includes('401k') ||
      text.includes('ira') ||
      text.includes('superannuation')
    ) {
      result.savings += absVal
      continue
    }

    // 5. Business Stock / Merchandise Inventory
    if (
      keyword.includes('inventory') ||
      keyword.includes('merchandise') ||
      keyword.includes('trade_goods') ||
      text.includes('inventory') ||
      text.includes('goods for resale') ||
      text.includes('stock for sale')
    ) {
      result.businessStock += absVal
      continue
    }

    // 6. Debts / Loans / Overdue Liabilities
    if (
      keyword.includes('debt') ||
      keyword.includes('loan') ||
      keyword.includes('liability') ||
      text.includes('loan payment') ||
      text.includes('car loan') ||
      text.includes('credit card balance') ||
      text.includes('mortgage instalment') ||
      text.includes('payable')
    ) {
      result.debts += absVal
      continue
    }

    // Default: Regular Cash Flow
    if (rawVal > 0) {
      regularCashSum += rawVal
    }
  }

  result.cash = Math.max(0, regularCashSum)
  return result
}
