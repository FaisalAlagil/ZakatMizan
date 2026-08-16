import { describe, it, expect } from 'vitest'
import { normalize } from '@/lib/classify/normalize'
import { classify, classifyAll, classifyIfNeeded, applyFacts, needsAi, CONFIDENCE_GATE } from '@/lib/classify/engine'
import { counterpartyFragment, matchLearned, type LearnedRule } from '@/lib/classify/learned-rules'
import type { Transaction } from '@/lib/types'

function tx(description: string, amount = 1000): Transaction {
  return { id: 't', date: '2025-06-01', description, amount, currency: 'CAD' }
}

describe('normalize', () => {
  it('strips reference numbers, dates and punctuation', () => {
    expect(normalize('TD SAV INTEREST PAID 04/23  #99213')).toBe('TD SAV INTEREST PAID')
  })

  it('collapses whitespace and uppercases', () => {
    expect(normalize('  etsy   deposit ')).toBe('ETSY DEPOSIT')
  })

  it('keeps a bare label intact', () => {
    expect(normalize('Transfer')).toBe('TRANSFER')
  })
})

describe('deterministic rules', () => {
  const cases: [string, string, string][] = [
    ['TD SAVINGS INTEREST PAID', 'riba.interest-credit', 'HARAM'],
    ['INTEREST EARNED APY 0.05', 'riba.interest-credit', 'HARAM'],
    ['CASINO NIAGARA PAYOUT', 'maysir.gambling', 'HARAM'],
    ['LOTTO MAX PRIZE CLAIM', 'maysir.gambling', 'HARAM'],
    ['DRAFTKINGS WITHDRAWAL', 'maysir.gambling', 'HARAM'],
    ['LCBO STORE SALES DEPOSIT', 'khamr.alcohol-sales', 'HARAM'],
    ['RBC PAYROLL DEP ACME CORP', 'employment.payroll', 'NEEDS_INFO'],
    ['DIRECT DEPOSIT GUSTO', 'employment.payroll', 'NEEDS_INFO'],
    ['RENT PAYMENT UNIT 3', 'rental.income', 'NEEDS_INFO'],
    ['DIVIDEND VGRO', 'investment.dividend', 'NEEDS_INFO'],
    ['TRANSFER', 'vague.unlabeled', 'NEEDS_INFO'],
    ['DEPOSIT', 'vague.unlabeled', 'NEEDS_INFO'],
    ['E-TRANSFER FROM AHMED', 'gift.transfer', 'HALAL'],
    ['CANADA CHILD BENEFIT', 'benefit.government', 'HALAL'],
    ['CRA TAX REFUND', 'refund.tax', 'HALAL'],
    ['ETSY MARKETPLACE PAYOUT', 'business.sales', 'HALAL'],
  ]

  for (const [description, ruleId, verdict] of cases) {
    it(`classifies "${description}" as ${verdict} via ${ruleId}`, () => {
      const r = classify(tx(description), [])
      expect(r.ruleId).toBe(ruleId)
      expect(r.verdict).toBe(verdict)
      expect(r.classifiedBy).toBe('rule')
    })
  }

  it('attaches a citation to every unlawful verdict', () => {
    for (const d of ['TD SAVINGS INTEREST PAID', 'CASINO NIAGARA PAYOUT', 'LCBO STORE SALES DEPOSIT']) {
      expect(classify(tx(d), []).citation?.source).toBeTruthy()
    }
  })

  it('puts unlawful income ahead of a lawful-looking match', () => {
    // Reads as both a payroll deposit and a casino, and the casino has to win.
    const r = classify(tx('PAYROLL DEP CASINO NIAGARA RESORT'), [])
    expect(r.verdict).toBe('HARAM')
    expect(r.ruleId).toBe('maysir.gambling')
  })

  it('ignores money going out, since this tracks income', () => {
    const r = classify(tx('LCBO STORE #221', -48.5), [])
    expect(r.ruleId).toBe('nonincome.debit')
    expect(r.verdict).toBeUndefined()
  })
})

describe('confidence gate', () => {
  it('settles a high-confidence match without any model call', () => {
    const r = classify(tx('TD SAVINGS INTEREST PAID'), [])
    expect(r.confidence!).toBeGreaterThanOrEqual(CONFIDENCE_GATE)
    expect(needsAi(r)).toBe(false)
  })

  it('sends an unrecognised description on for enrichment', () => {
    const r = classify(tx('ZZQ HOLDINGS PTE REMIT'), [])
    expect(needsAi(r)).toBe(true)
  })

  it('never re-examines a verdict the user gave us', () => {
    // Entered through the guided add flow: the user picked the source and
    // answered the deciding question, so there is nothing left to identify.
    const answered: Transaction = {
      ...tx('Niagara Software'),
      verdict: 'HALAL',
      classifiedBy: 'user',
      sourceType: 'employment',
    }
    expect(needsAi(answered)).toBe(false)
  })

  it('never re-examines a verdict carried over from a learned rule', () => {
    const learnedResult: Transaction = { ...tx('Acme Corp'), verdict: 'HALAL', classifiedBy: 'learned' }
    expect(needsAi(learnedResult)).toBe(false)
  })

  it('does not send a question we can ask the user directly', () => {
    // Payroll needs the employer's industry, and the user is the cheaper source.
    expect(needsAi(classify(tx('RBC PAYROLL DEP ACME CORP'), []))).toBe(false)
  })
})

describe('model facts are mapped through the rule table, never trusted as rulings', () => {
  it('turns an industry fact into a cited verdict', () => {
    const base = classify(tx('ZZQ HOLDINGS PTE REMIT'), [])
    const r = applyFacts(base, {
      sourceType: 'employment',
      counterparty: 'Niagara Falls Casino Resort',
      industry: 'gambling_hospitality',
      involvesInterest: false,
      certainty: 0.82,
      reasoning: 'names a casino resort',
    })
    expect(r.verdict).toBe('HARAM')
    expect(r.classifiedBy).toBe('ai')
    expect(r.citation?.source).toBeTruthy()
    expect(r.ruleId).toBe('employment.haram-industry')
  })

  it('flags conventional banking as a point of scholarly difference, not a ruling', () => {
    const r = applyFacts(classify(tx('ZZQ REMIT'), []), {
      sourceType: 'employment',
      counterparty: 'A Bank',
      industry: 'conventional_banking',
      involvesInterest: true,
      certainty: 0.9,
      reasoning: 'bank',
    })
    expect(r.verdict).toBe('UNCERTAIN')
    expect(r.uncertaintyKind).toBe('scholarly')
    expect(r.scholarlyDifference?.positions.length).toBeGreaterThan(1)
  })

  it('falls back to a question when the model is unsure', () => {
    const r = applyFacts(classify(tx('ZZQ REMIT'), []), {
      sourceType: 'other',
      counterparty: '',
      industry: 'unknown',
      involvesInterest: false,
      certainty: 0.2,
      reasoning: 'no idea',
    })
    expect(r.verdict).toBe('NEEDS_INFO')
    expect(r.question).toBeTruthy()
  })

  it('treats a partly non-compliant retailer as mixed, with the ratio marked an estimate', () => {
    const r = applyFacts(classify(tx('ZZQ REMIT'), []), {
      sourceType: 'business',
      counterparty: 'Corner Store',
      industry: 'mixed_retail',
      involvesInterest: false,
      certainty: 0.8,
      reasoning: 'sells alcohol alongside groceries',
    })
    expect(r.verdict).toBe('MIXED')
    expect(r.haramRatio).toBeGreaterThan(0)
    expect(r.haramRatioIsEstimate).toBe(true)
  })
})

describe('learned rules built from a real bank description', () => {
  // counterpartyFragment drops generic words from the middle of a description,
  // so the fragment it returns is not a contiguous substring of the original.
  const description = 'RBC PAYROLL DEP NIAGARA SOFTWARE INC 0131'

  it('produces a fragment that still matches its own description', () => {
    const fragment = counterpartyFragment(description)
    expect(fragment.length).toBeGreaterThan(2)
    expect(matchLearned(normalize(description), [rule(fragment)])).toBeTruthy()
  })

  it('matches a sibling entry from the same employer', () => {
    const fragment = counterpartyFragment(description)
    const sibling = normalize('RBC PAYROLL DEP NIAGARA SOFTWARE INC 0228')
    expect(matchLearned(sibling, [rule(fragment)])).toBeTruthy()
  })

  it('does not match an unrelated employer', () => {
    const fragment = counterpartyFragment(description)
    expect(matchLearned(normalize('RBC PAYROLL DEP ONTARIO BAKERY LTD'), [rule(fragment)])).toBeUndefined()
  })

  it('resolves the sibling through the full classifier', () => {
    const learned = [rule(counterpartyFragment(description))]
    const r = classify(tx('RBC PAYROLL DEP NIAGARA SOFTWARE INC 0228'), learned)
    expect(r.verdict).toBe('HALAL')
    expect(r.classifiedBy).toBe('learned')
  })

  function rule(match: string): LearnedRule {
    return { id: 'r', match, verdict: 'HALAL', basis: 'You told us.', createdAt: '2025-06-01' }
  }
})

describe('learned rules', () => {
  const learned: LearnedRule[] = [
    {
      id: 'learned-1',
      match: 'ACME CORP',
      verdict: 'HALAL',
      basis: 'You told us Acme Corp is a software company.',
      createdAt: '2025-06-01',
    },
  ]

  it('takes precedence over the question a generic rule would ask', () => {
    const r = classify(tx('RBC PAYROLL DEP ACME CORP'), learned)
    expect(r.verdict).toBe('HALAL')
    expect(r.classifiedBy).toBe('learned')
  })

  it('still loses to an explicit prohibition', () => {
    const r = classify(tx('ACME CORP INTEREST PAID'), learned)
    expect(r.verdict).toBe('HARAM')
  })

  it('removes the need for a model call', () => {
    expect(needsAi(classify(tx('PAYMENT ACME CORP'), learned))).toBe(false)
  })
})

describe('keeping a verdict that already exists', () => {
  // The guided add flow works out the verdict from the source the user picked,
  // so re-running the rule table over it would throw that answer away.
  it('leaves an already-classified entry alone', () => {
    const settled: Transaction = {
      ...tx('A gift or family support'),
      verdict: 'HALAL',
      classifiedBy: 'user',
      basis: 'Gifts are lawful to receive.',
    }
    expect(classifyIfNeeded(settled, [])).toEqual(settled)
  })

  it('still runs the rules over an entry with no verdict', () => {
    const raw = tx('TD SAVINGS INTEREST PAID')
    expect(classifyIfNeeded(raw, []).verdict).toBe('HARAM')
  })
})

describe('classifyAll', () => {
  it('splits a batch into settled rows and rows still needing enrichment', () => {
    const rows = [
      tx('TD SAVINGS INTEREST PAID'),
      tx('CASINO NIAGARA PAYOUT'),
      tx('ZZQ HOLDINGS PTE REMIT'),
      tx('QRX 88 LTD'),
    ]
    const { settled, pending } = classifyAll(rows, [])
    expect(settled).toHaveLength(2)
    expect(pending).toHaveLength(2)
  })

  it('leaves every row with an id and a description', () => {
    const { settled, pending } = classifyAll([tx('TD SAVINGS INTEREST PAID'), tx('QRX 88 LTD')], [])
    for (const r of [...settled, ...pending]) {
      expect(r.id).toBeTruthy()
      expect(r.description).toBeTruthy()
    }
  })
})
