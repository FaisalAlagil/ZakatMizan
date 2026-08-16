import type { Citation, IncomeSourceType, Transaction, Verdict } from '@/lib/types'
import { normalize } from './normalize'

/**
 * Written whenever the user answers a question or overrides a verdict, so the
 * same counterparty is never asked about twice.
 */
export type LearnedRule = {
  id: string
  /** A normalized fragment of the description, usually the counterparty name. */
  match: string
  verdict: Verdict
  basis: string
  createdAt: string
  haramRatio?: number
  sourceType?: IncomeSourceType
  citation?: Citation
}

/**
 * Matches on tokens rather than a contiguous substring. A fragment is built by
 * dropping generic words from the middle of a description, so "RBC NIAGARA
 * SOFTWARE" has to match "RBC PAYROLL DEP NIAGARA SOFTWARE INC" even though it
 * is not a substring of it. The most specific rule wins.
 */
export function matchLearned(normalized: string, learned: LearnedRule[]): LearnedRule | undefined {
  const words = new Set(normalized.split(' '))
  return learned
    .map((rule) => ({ rule, tokens: normalize(rule.match).split(' ').filter(Boolean) }))
    .filter(({ tokens }) => tokens.length > 0 && tokens.every((t) => words.has(t)))
    .sort((a, b) => b.tokens.length - a.tokens.length)[0]?.rule
}

export function applyLearned(tx: Transaction, rule: LearnedRule): Transaction {
  return {
    ...tx,
    verdict: rule.verdict,
    ruleId: `learned:${rule.id}`,
    basis: rule.basis,
    citation: rule.citation ?? tx.citation,
    confidence: 1,
    haramRatio: rule.haramRatio ?? tx.haramRatio,
    sourceType: rule.sourceType ?? tx.sourceType,
    classifiedBy: 'learned',
    question: undefined,
  }
}

/** Pull a usable counterparty fragment out of a description. */
export function counterpartyFragment(description: string): string {
  const words = normalize(description)
    .split(' ')
    .filter((w) => w.length > 2 && !GENERIC.has(w))
  return words.slice(0, 3).join(' ')
}

const GENERIC = new Set([
  'PAYROLL', 'DEPOSIT', 'DIRECT', 'DEP', 'TRANSFER', 'PAYMENT', 'CREDIT',
  'FROM', 'THE', 'INC', 'LTD', 'CORP', 'ACH', 'MISC', 'INTERAC',
])
