import type { Asset, Liability, Transaction, ZakatResult } from '@/lib/types'
import { MADHHAB_PROFILES } from '@/lib/fiqh/madhhab-profiles'

export type SummaryInput = {
  result: ZakatResult
  assets: Asset[]
  liabilities: Liability[]
  transactions: Transaction[]
  today: string
}

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(amount)
}

/**
 * A plain-text summary meant to be read by a person or pasted into a chat.
 * It carries the figures, the reasoning and the sources, so someone who has
 * never seen the app can check the working.
 */
export function buildSummary({ result, assets, liabilities, transactions, today }: SummaryInput): string {
  const c = result.currency
  const profile = MADHHAB_PROFILES[result.madhhab]
  const lines: string[] = []

  lines.push(`# Zakat summary`)
  lines.push('')
  lines.push(`Prepared ${today} using Mizan. School followed: ${profile.label}. All figures in ${c}.`)
  lines.push('')
  lines.push(`- Zakat due: ${fmt(result.zakatDue, c)}`)
  if (!result.hawl.complete) {
    lines.push(`- Projected once the lunar year completes: ${fmt(result.projectedZakat, c)}`)
  }
  lines.push(`- To set aside and purify (separate from zakat): ${fmt(result.purificationDue, c)}`)
  lines.push(`- Wealth counted: ${fmt(result.zakatableBase, c)}`)
  lines.push(`- Threshold applied: ${fmt(result.pools[0]?.nisabValue ?? 0, c)}`)
  lines.push('')

  if (assets.length > 0) {
    lines.push(`## What is held`)
    for (const a of assets) {
      const isMetal = a.kind === 'gold' || a.kind === 'silver' || a.kind === 'personal_jewelry'
      const original = a.currency && a.currency !== c ? ` (entered as ${fmt(a.amount, a.currency)})` : ''
      lines.push(`- ${a.label}: ${isMetal ? `${a.amount}g` : fmt(a.amount, c) + original}`)
    }
    lines.push('')
  }

  if (liabilities.length > 0) {
    lines.push(`## What is owed this year`)
    for (const l of liabilities) lines.push(`- ${l.label}: ${fmt(l.dueWithinYear, c)}`)
    lines.push('')
  }

  const purify = transactions.filter((t) => t.verdict === 'HARAM' || t.verdict === 'MIXED')
  if (purify.length > 0) {
    lines.push(`## Income to purify`)
    for (const t of purify) {
      const share = t.verdict === 'MIXED' ? (t.haramRatio ?? 0) : 1
      lines.push(
        `- ${t.description}: ${fmt(Math.abs(t.amount) * share, c)}` +
          (t.verdict === 'MIXED' ? ` (${Math.round(share * 100)}% of ${fmt(Math.abs(t.amount), c)})` : '') +
          (t.basis ? ` — ${t.basis}` : ''),
      )
    }
    lines.push('')
  }

  const unresolved = transactions.filter((t) => t.verdict === 'UNCERTAIN')
  if (unresolved.length > 0) {
    lines.push(`## Left for a scholar to settle`)
    for (const t of unresolved) lines.push(`- ${t.description}: ${fmt(Math.abs(t.amount), c)}`)
    lines.push('')
  }

  lines.push(`## How it was worked out`)
  result.trace.forEach((step, i) => {
    const amount = step.amount === undefined ? '' : ` (${fmt(step.amount, c)})`
    lines.push(`${i + 1}. **${step.label}**${amount} — ${step.detail}`)
    if (step.citation) {
      lines.push(
        `   Source: ${step.citation.source}${step.citation.verified ? '' : ' [awaiting scholarly review]'}`,
      )
    }
  })
  lines.push('')

  if (result.excluded.length > 0) {
    lines.push(`## Left out`)
    for (const e of result.excluded) lines.push(`- ${e.label} (${fmt(e.amount, c)}) — ${e.reason}`)
    lines.push('')
  }

  lines.push(
    `This is a calculation with its reasoning shown, not a fatwa. Steps marked as awaiting scholarly review should be checked with a qualified scholar before paying.`,
  )

  return lines.join('\n')
}

export function download(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
