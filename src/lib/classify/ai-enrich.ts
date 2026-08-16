import type { Transaction } from '@/lib/types'
import { normalize } from './normalize'
import { applyFacts, type AiFacts } from './engine'

export type EnrichOutcome = {
  transactions: Transaction[]
  unavailable: boolean
  reason?: string
}

/**
 * Only the normalized description is sent. normalize() has already removed
 * digits, dates and reference numbers, so no amount, date or account number
 * leaves the browser.
 */
export async function enrichWithAi(pending: Transaction[]): Promise<EnrichOutcome> {
  if (pending.length === 0) return { transactions: [], unavailable: false }

  const items = pending.map((t) => ({ id: t.id, description: normalize(t.description) }))

  const res = await fetch('/api/classify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ items }),
  })

  const data = (await res.json()) as { results: AiFacts[]; unavailable?: boolean; reason?: string }

  if (data.unavailable) {
    return { transactions: pending, unavailable: true, reason: data.reason }
  }

  const byId = new Map(data.results.map((r) => [(r as AiFacts & { id: string }).id, r]))
  return {
    transactions: pending.map((t) => {
      const facts = byId.get(t.id)
      return facts ? applyFacts(t, facts) : t
    }),
    unavailable: false,
  }
}
