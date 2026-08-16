import Papa from 'papaparse'
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

export type ParsedCsv = {
  headers: string[]
  rows: Record<string, string>[]
  suggested: Partial<ColumnMap>
}

const MATCHERS: Record<keyof ColumnMap, RegExp> = {
  date: /^(date|transaction date|posted|posting date)$/i,
  description: /^(description|details|memo|narrative|merchant_or_source|merchant|payee|transaction|parse_line)$/i,
  amount: /^(amount|amount_cad|amount_usd|value|sum)$/i,
  credit: /^(credit|deposit|money in|paid in|inflow)$/i,
  debit: /^(debit|withdrawal|money out|paid out|outflow)$/i,
  direction: /^(direction|type|flow)$/i,
  keyword: /^(keyword|category|trans_type|transaction_type)$/i,
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
  if (!suggested.description) suggested.description = headers.find((h) => /desc|detail|memo|merchant|keyword/i.test(h))
  if (!suggested.date) suggested.date = headers.find((h) => /date/i.test(h))
  if (!suggested.amount) suggested.amount = headers.find((h) => /amount/i.test(h))

  return { headers, rows: result.data, suggested }
}

function toNumber(raw: string | undefined): number {
  if (!raw) return 0
  const cleaned = raw.replace(/[^0-9.\-()]/g, '')
  const negative = /^\(.*\)$/.test(cleaned)
  const value = Number.parseFloat(cleaned.replace(/[()]/g, ''))
  if (Number.isNaN(value)) return 0
  return negative ? -value : value
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
