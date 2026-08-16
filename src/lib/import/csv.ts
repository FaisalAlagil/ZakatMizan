import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { Transaction, Verdict } from '@/lib/types'
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

export type ParsedSheet = {
  name: string
  headers: string[]
  rows: Record<string, string>[]
  suggested: Partial<ColumnMap>
}

export type ParsedWorkbook = {
  sheets: ParsedSheet[]
  allRows: Record<string, string>[]
  sheetNames: string[]
  totalRows: number
}

export type ExtractedBalances = {
  cash: number
  goldGrams: number
  silverGrams: number
  investments: number
  savings: number
  businessStock: number
  debts: number
  sheetContributions?: Record<string, { cash: number; goldGrams: number; investments: number }>
}

const MATCHERS: Record<keyof ColumnMap, RegExp> = {
  date: /^(date|transaction date|posted|posting date)$/i,
  description: /^(description|details|memo|narrative|merchant_or_source|merchant|payee|transaction|parse_line|asset_name|name|item|holding|fund|ticker)$/i,
  amount: /^(amount|amount_cad|amount_usd|value|sum|balance|total|market_value|current_value|val)$/i,
  credit: /^(credit|deposit|money in|paid in|inflow)$/i,
  debit: /^(debit|withdrawal|money out|paid out|outflow)$/i,
  direction: /^(direction|type|flow)$/i,
  keyword: /^(keyword|category|trans_type|transaction_type|asset_type|asset_class|kind|type|shariah_status)$/i,
  mixedHalalPct: /^(mixed_halal_pct|halal_pct|halal_percent|halal_ratio|purity_pct)$/i,
  haramPortionDisposed: /^(haram_portion_disposed|disposed|purified)$/i,
  missingInfo: /^(missing_information|missing_info|warning)$/i,
}

export function findSuggestedColumns(headers: string[]): Partial<ColumnMap> {
  const suggested: Partial<ColumnMap> = {}

  for (const key of Object.keys(MATCHERS) as (keyof ColumnMap)[]) {
    const hit = headers.find((h) => MATCHERS[key].test(h.trim()))
    if (hit) suggested[key] = hit
  }

  // Fall back to positional guesses so an unlabelled export still imports.
  if (!suggested.description) suggested.description = headers.find((h) => /desc|detail|memo|merchant|keyword|item|name|holding/i.test(h))
  if (!suggested.date) suggested.date = headers.find((h) => /date/i.test(h))
  if (!suggested.amount) suggested.amount = headers.find((h) => /amount|value|balance|val|sum/i.test(h))

  return suggested
}

/**
 * Parses a single CSV string.
 */
export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[]; suggested: Partial<ColumnMap> } {
  const result = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })

  const headers = result.meta.fields ?? []
  const suggested = findSuggestedColumns(headers)

  return { headers, rows: result.data, suggested }
}

/**
 * Parses an entire Excel workbook (.xlsx, .xls) or multi-sheet file.
 * Ingests ALL sheets and returns aggregated rows with sheet metadata.
 */
export function parseWorkbook(data: ArrayBuffer | Uint8Array | string): ParsedWorkbook {
  let wb: XLSX.WorkBook
  try {
    wb = XLSX.read(data, { type: typeof data === 'string' ? 'string' : 'array', raw: false })
  } catch {
    // If xlsx binary read fails on string, fall back to csv parser
    if (typeof data === 'string') {
      const csv = parseCsv(data)
      return {
        sheets: [{ name: 'Sheet1', headers: csv.headers, rows: csv.rows, suggested: csv.suggested }],
        allRows: csv.rows,
        sheetNames: ['Sheet1'],
        totalRows: csv.rows.length,
      }
    }
    throw new Error('Failed to read spreadsheet file.')
  }

  const sheets: ParsedSheet[] = []
  const allRows: Record<string, string>[] = []

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    if (!ws) continue

    const rawRows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, {
      raw: false,
      defval: '',
      header: 1, // Get array of arrays to find real header row
    }) as unknown as (string | number)[][]

    if (!rawRows || rawRows.length === 0) continue

    // Find header row (first non-empty row)
    const headerRowIdx = rawRows.findIndex((r) => r.some((cell) => cell !== undefined && String(cell).trim() !== ''))
    if (headerRowIdx === -1) continue

    const rawHeaderRow = rawRows[headerRowIdx] || []
    const headers = rawHeaderRow.map((h, i) => (h ? String(h).trim() : `Column_${i + 1}`))

    // Convert data rows into objects
    const dataRows = rawRows.slice(headerRowIdx + 1)
    const sheetRows: Record<string, string>[] = []

    for (const dRow of dataRows) {
      if (!dRow || !dRow.some((c) => c !== undefined && String(c).trim() !== '')) continue
      const rowObj: Record<string, string> = { _sheetName: sheetName }
      headers.forEach((h, colIdx) => {
        rowObj[h] = dRow[colIdx] !== undefined ? String(dRow[colIdx]).trim() : ''
      })
      sheetRows.push(rowObj)
      allRows.push(rowObj)
    }

    const suggested = findSuggestedColumns(headers)
    sheets.push({
      name: sheetName,
      headers,
      rows: sheetRows,
      suggested,
    })
  }

  return {
    sheets,
    allRows,
    sheetNames: wb.SheetNames,
    totalRows: allRows.length,
  }
}

export function toNumber(raw: string | undefined): number {
  if (!raw) return 0
  const cleaned = String(raw).replace(/[^0-9.\-()]/g, '')
  const negative = /^\(.*\)$/.test(cleaned)
  const value = Number.parseFloat(cleaned.replace(/[()]/g, ''))
  if (Number.isNaN(value)) return 0
  return negative ? -value : value
}

/**
 * Extract weight in grams from text (e.g., "40g 22k gold", "50 grams", "2.5 oz", "2 tolas")
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
        row.asset_name ??
        row.name ??
        row.item ??
        ''
      ).trim()

      if (!desc) return null

      const keyword = (
        row[map.keyword ?? 'keyword'] ??
        row.keyword ??
        row.category ??
        row.asset_type ??
        ''
      )
        .toLowerCase()
        .trim()

      const missingInfo = (row[map.missingInfo ?? 'missing_information'] ?? row.missing_information ?? '').trim()
      const mixedHalalPctRaw = row[map.mixedHalalPct ?? 'mixed_halal_pct'] ?? row.mixed_halal_pct ?? row.halal_pct
      const disposedRaw = (row[map.haramPortionDisposed ?? 'haram_portion_disposed'] ?? row.haram_portion_disposed ?? '').toLowerCase().trim()

      const tx: Transaction = {
        id: row.transaction_id || `tx-${index}-${Math.abs(rawAmount)}-${desc.slice(0, 12)}`,
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
 * from bank statements, balance sheets, and multi-sheet transaction spreadsheets.
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
    sheetContributions: {},
  }

  let regularCashSum = 0

  for (const row of rows) {
    const rawVal =
      map.credit && row[map.credit]
        ? toNumber(row[map.credit]) - toNumber(row[map.debit ?? ''])
        : toNumber(
            (map.amount && row[map.amount]) ||
              row.amount ||
              row.market_value ||
              row.value ||
              row.balance ||
              row.val ||
              row.current_value ||
              row.total
          )

    const desc = (
      row[map.description] ??
      row.description ??
      row.merchant_or_source ??
      row.keyword ??
      row.asset_name ??
      row.name ??
      row.item ??
      row.holding ??
      row.fund ??
      row.ticker ??
      ''
    ).trim()

    const sheetName = (row._sheetName || '').toLowerCase()

    // Check if there are explicit columns like gold_grams, silver_grams, weight, grams
    const explicitGoldGrams = toNumber(row.gold_grams ?? row.gold_weight ?? row.gold_g)
    const explicitSilverGrams = toNumber(row.silver_grams ?? row.silver_weight ?? row.silver_g)
    const explicitGrams = toNumber(row.grams ?? row.weight_grams ?? row.weight)

    if (explicitGoldGrams > 0) {
      result.goldGrams += explicitGoldGrams
      continue
    }

    if (explicitSilverGrams > 0) {
      result.silverGrams += explicitSilverGrams
      continue
    }

    if (!desc && rawVal === 0 && explicitGrams === 0) continue

    const keyword = (
      row[map.keyword ?? 'keyword'] ??
      row.keyword ??
      row.category ??
      row.asset_type ??
      row.asset_class ??
      row.kind ??
      row.type ??
      ''
    )
      .toLowerCase()
      .trim()

    const text = `${desc} ${keyword} ${sheetName}`.toLowerCase()
    const absVal = Math.abs(rawVal)

    // 1. Dedicated Sheet: Gold / Jewelry
    if (sheetName.includes('gold') || sheetName.includes('jewelry') || sheetName.includes('bullion')) {
      const parsedGrams = explicitGrams > 0 ? explicitGrams : extractGramsFromText(text)
      if (parsedGrams > 0) {
        result.goldGrams += parsedGrams
      } else if (absVal > 0) {
        result.goldGrams += absVal / (goldPricePerGram || 176)
      }
      continue
    }

    // 2. Dedicated Sheet: Silver
    if (sheetName.includes('silver')) {
      const parsedGrams = explicitGrams > 0 ? explicitGrams : extractGramsFromText(text)
      if (parsedGrams > 0) {
        result.silverGrams += parsedGrams
      } else if (absVal > 0) {
        result.silverGrams += absVal / (silverPricePerGram || 2.2)
      }
      continue
    }

    // 3. Dedicated Sheet: Investments / Stocks / Equities
    if (sheetName.includes('invest') || sheetName.includes('stock') || sheetName.includes('equity') || sheetName.includes('portfolio')) {
      result.investments += absVal > 0 ? absVal : 0
      continue
    }

    // 4. Dedicated Sheet: Retirement / RRSP
    if (sheetName.includes('rrsp') || sheetName.includes('retire') || sheetName.includes('pension')) {
      result.savings += absVal > 0 ? absVal : 0
      continue
    }

    // 5. Dedicated Sheet: Debts / Liabilities
    if (sheetName.includes('debt') || sheetName.includes('liabilit') || sheetName.includes('loan')) {
      result.debts += absVal > 0 ? absVal : 0
      continue
    }

    // General text pattern matching across any sheet:
    // Gold detection
    if (
      text.includes('gold') ||
      keyword.includes('gold') ||
      keyword.includes('jewelry') ||
      text.includes('mithqal') ||
      text.includes('bullion bar') ||
      text.includes('dinar') ||
      text.includes('24k') ||
      text.includes('22k') ||
      text.includes('21k') ||
      text.includes('18k')
    ) {
      const parsedGrams = explicitGrams > 0 ? explicitGrams : extractGramsFromText(text)
      if (parsedGrams > 0) {
        result.goldGrams += parsedGrams
      } else if (absVal > 0) {
        result.goldGrams += absVal / (goldPricePerGram || 176)
      }
      continue
    }

    // Silver detection
    if (
      text.includes('silver') ||
      keyword.includes('silver') ||
      text.includes('dirham') ||
      text.includes('sterling') ||
      text.includes('925 silver')
    ) {
      const parsedGrams = explicitGrams > 0 ? explicitGrams : extractGramsFromText(text)
      if (parsedGrams > 0) {
        result.silverGrams += parsedGrams
      } else if (absVal > 0) {
        result.silverGrams += absVal / (silverPricePerGram || 2.2)
      }
      continue
    }

    // Investments / Stocks / Equities / ETF
    if (
      keyword.includes('stock') ||
      keyword.includes('equity') ||
      keyword.includes('etf') ||
      keyword.includes('investment') ||
      keyword.includes('shares') ||
      text.includes('etf') ||
      text.includes('shares') ||
      text.includes('brokerage') ||
      text.includes('mutual fund') ||
      text.includes('equities') ||
      text.includes('spus') ||
      text.includes('hlal') ||
      text.includes('portfolio')
    ) {
      result.investments += absVal
      continue
    }

    // Retirement / RRSP / Pension / TFSA / 401k
    if (
      keyword.includes('rrsp') ||
      keyword.includes('retirement') ||
      keyword.includes('pension') ||
      keyword.includes('tfsa') ||
      keyword.includes('401k') ||
      keyword.includes('ira') ||
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

    // Business Stock / Merchandise Inventory
    if (
      keyword.includes('inventory') ||
      keyword.includes('merchandise') ||
      keyword.includes('trade_goods') ||
      keyword.includes('stock_in_trade') ||
      text.includes('inventory') ||
      text.includes('goods for resale') ||
      text.includes('stock for sale') ||
      text.includes('merchandise')
    ) {
      result.businessStock += absVal
      continue
    }

    // Debts / Loans / Overdue Liabilities
    if (
      keyword.includes('debt') ||
      keyword.includes('loan') ||
      keyword.includes('liability') ||
      keyword.includes('payable') ||
      text.includes('loan payment') ||
      text.includes('car loan') ||
      text.includes('credit card balance') ||
      text.includes('mortgage instalment') ||
      text.includes('payable') ||
      text.includes('line of credit')
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
