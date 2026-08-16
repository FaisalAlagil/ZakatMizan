import { REF } from '@/lib/fiqh/fiqh-references'
import type { Citation, EnrichmentQuestion, IncomeSourceType, Transaction, Verdict } from '@/lib/types'

export type Rule = {
  id: string
  /** Higher wins. An explicit prohibition must outrank a lawful-looking match. */
  priority: number
  match: RegExp
  verdict: Verdict
  confidence: number
  basis: string
  citation: Citation
  sourceType?: IncomeSourceType
  question?: EnrichmentQuestion
}

export const employerQuestion: EnrichmentQuestion = {
  key: 'employer-industry',
  prompt: 'What does this employer actually do?',
  options: [
    {
      value: 'halal_general',
      label: 'Ordinary permissible work',
      sets: {
        verdict: 'HALAL',
        industry: 'halal_general',
        basis: 'Wages from permissible work are lawful.',
        citation: REF.lawfulEarning,
      },
    },
    {
      value: 'conventional_banking',
      label: 'Bank, lender or insurer',
      sets: {
        verdict: 'UNCERTAIN',
        industry: 'conventional_banking',
        uncertaintyKind: 'scholarly',
        basis: 'Scholars differ on employment in interest-based finance.',
        citation: REF.conventionalBankingWork,
      },
    },
    {
      value: 'alcohol',
      label: 'Alcohol, gambling or adult entertainment',
      sets: {
        verdict: 'HARAM',
        industry: 'alcohol',
        basis: 'Wages paid directly out of a forbidden activity take its ruling.',
        citation: REF.employmentInHaramIndustry,
      },
    },
    {
      value: 'mixed_retail',
      label: 'Mostly permissible, with some of the above',
      sets: {
        verdict: 'MIXED',
        industry: 'mixed_retail',
        haramRatio: 0.05,
        haramRatioIsEstimate: true,
        basis: 'Part of this income traces back to a non-compliant activity.',
        citation: REF.mixedIncomePurification,
      },
    },
  ],
}

const tenantQuestion: EnrichmentQuestion = {
  key: 'tenant-use',
  prompt: 'What is the property used for?',
  options: [
    {
      value: 'halal_general',
      label: 'A home, or an ordinary permissible business',
      sets: { verdict: 'HALAL', basis: 'Rent from permissible use is lawful.', citation: REF.lawfulEarning },
    },
    {
      value: 'alcohol',
      label: 'A bar, casino or similar',
      sets: {
        verdict: 'HARAM',
        basis: 'Letting a property specifically for a forbidden use takes that ruling.',
        citation: REF.employmentInHaramIndustry,
      },
    },
  ],
}

const holdingQuestion: EnrichmentQuestion = {
  key: 'holding-screen',
  prompt: 'Has this holding been screened for shariah compliance?',
  options: [
    {
      value: 'compliant',
      label: 'Yes, it is a screened or Islamic fund',
      sets: { verdict: 'HALAL', basis: 'Screened holdings pass the compliance test.', citation: REF.lawfulEarning },
    },
    {
      value: 'mixed_retail',
      label: 'No, it is a conventional fund or index',
      sets: {
        verdict: 'MIXED',
        haramRatio: 0.05,
        haramRatioIsEstimate: true,
        basis: 'Conventional funds usually hold some non-compliant revenue. The estimate below can be replaced with the published purification ratio.',
        citation: REF.mixedIncomePurification,
      },
    },
    {
      value: 'conventional_banking',
      label: 'It is a bond, GIC or savings product',
      sets: {
        verdict: 'HARAM',
        basis: 'A fixed return on a loan is riba.',
        citation: REF.ribaProhibited,
      },
    },
  ],
}

export const vagueQuestion: EnrichmentQuestion = {
  key: 'source-type',
  prompt: 'Where did this money come from?',
  options: [
    {
      value: 'employment',
      label: 'Wages',
      sets: { sourceType: 'employment', verdict: 'NEEDS_INFO', question: employerQuestion },
    },
    {
      value: 'gift',
      label: 'A gift or family transfer',
      sets: { sourceType: 'gift', verdict: 'HALAL', basis: 'Gifts are lawful to receive.', citation: REF.giftsLawful },
    },
    {
      value: 'business',
      label: 'Sales from my own business',
      sets: {
        sourceType: 'business',
        verdict: 'HALAL',
        basis: 'Proceeds of permissible trade are lawful.',
        citation: REF.lawfulEarning,
      },
    },
    {
      value: 'interest',
      label: 'Interest or a bank payout',
      sets: {
        sourceType: 'interest',
        verdict: 'HARAM',
        basis: 'A return paid purely for the use of money is riba.',
        citation: REF.ribaProhibited,
      },
    },
    {
      value: 'other',
      label: 'Something else',
      sets: { sourceType: 'other', verdict: 'UNCERTAIN', uncertaintyKind: 'technical' },
    },
  ],
}

/**
 * Ordered by priority, highest first. Written by hand so that every verdict the
 * app issues can be traced back to a rule and a source.
 */
export const RULES: Rule[] = [
  {
    id: 'riba.interest-credit',
    priority: 90,
    match: /\b(INTEREST|INT PAID|INT EARNED|APY|CREDIT INTEREST|SAVINGS INT)\b/,
    verdict: 'HARAM',
    confidence: 0.98,
    basis: 'A return paid for the use of money is riba, and it is not zakatable. It is given away in full.',
    citation: REF.ribaProhibited,
    sourceType: 'interest',
  },
  {
    id: 'maysir.gambling',
    priority: 90,
    match: /\b(CASINO|LOTTO|LOTTERY|POKER|BETTING|BET|SPORTSBOOK|DRAFTKINGS|FANDUEL|BET\d*)\b/,
    verdict: 'HARAM',
    confidence: 0.97,
    basis: 'Winnings from gambling are maysir.',
    citation: REF.maysirProhibited,
    sourceType: 'gambling',
  },
  {
    id: 'khamr.alcohol-sales',
    priority: 90,
    match: /\b(LCBO|LIQUOR|BREWERY|BREWING|WINERY|WINE|BEER STORE|DISTILLERY)\b/,
    verdict: 'HARAM',
    confidence: 0.95,
    basis: 'Proceeds from the sale of intoxicants are not lawful income.',
    citation: REF.khamrProhibited,
    sourceType: 'business',
  },

  {
    id: 'benefit.government',
    priority: 60,
    match: /\b(CHILD BENEFIT|CCB|GST CREDIT|CANADA WORKERS|OAS|EI PAYMENT|DISABILITY BENEFIT)\b/,
    verdict: 'HALAL',
    confidence: 0.92,
    basis: 'Government support paid to you is lawful to receive.',
    citation: REF.lawfulEarning,
    sourceType: 'benefit',
  },
  {
    id: 'refund.tax',
    priority: 60,
    match: /\b(CRA|TAX REFUND|REFUND|REIMBURSEMENT)\b/,
    verdict: 'HALAL',
    confidence: 0.9,
    basis: 'A refund returns money that was already yours.',
    citation: REF.lawfulEarning,
    sourceType: 'refund',
  },
  {
    id: 'gift.transfer',
    priority: 60,
    match: /\bE\s?TRANSFER FROM\b|\bGIFT FROM\b|\bINTERAC FROM\b/,
    verdict: 'HALAL',
    confidence: 0.9,
    basis: 'Gifts and family transfers are lawful to receive.',
    citation: REF.giftsLawful,
    sourceType: 'gift',
  },
  {
    id: 'business.sales',
    priority: 60,
    match: /\b(ETSY|SHOPIFY|STRIPE|SQUARE|GUMROAD|MARKETPLACE PAYOUT|SALES DEPOSIT)\b/,
    verdict: 'HALAL',
    confidence: 0.9,
    basis: 'Proceeds of permissible trade are lawful.',
    citation: REF.lawfulEarning,
    sourceType: 'business',
  },

  {
    id: 'employment.payroll',
    priority: 50,
    match: /\b(PAYROLL|SALARY|DIRECT DEP|DIRECT DEPOSIT|ADP|GUSTO|PAYCHEQUE|PAYCHECK|WAGES)\b/,
    verdict: 'NEEDS_INFO',
    confidence: 1,
    basis: 'Wages take the ruling of the work they pay for, so we need to know what the employer does.',
    citation: REF.lawfulEarning,
    sourceType: 'employment',
    question: employerQuestion,
  },
  {
    id: 'rental.income',
    priority: 50,
    match: /\b(RENT|RENTAL|LEASE INCOME|TENANT)\b/,
    verdict: 'NEEDS_INFO',
    confidence: 1,
    basis: 'Rent takes the ruling of what the property is used for.',
    citation: REF.lawfulEarning,
    sourceType: 'rental',
    question: tenantQuestion,
  },
  {
    id: 'investment.dividend',
    priority: 50,
    match: /\b(DIVIDEND|DIV REINVEST|DISTRIBUTION|COUPON|BOND INTEREST)\b/,
    verdict: 'NEEDS_INFO',
    confidence: 1,
    basis: 'Investment income depends on what the underlying holding does.',
    citation: REF.mixedIncomePurification,
    sourceType: 'investment',
    question: holdingQuestion,
  },

  {
    id: 'vague.unlabeled',
    priority: 10,
    match: /^(TRANSFER|DEPOSIT|ACH|ACH CREDIT|MISC CREDIT|CREDIT|PAYMENT|E TRANSFER|INTERAC)$/,
    verdict: 'NEEDS_INFO',
    confidence: 1,
    basis: 'The description on its own does not say where this money came from.',
    citation: REF.lawfulEarning,
    question: vagueQuestion,
  },
]

export function matchRule(normalized: string): Rule | undefined {
  return RULES.filter((r) => r.match.test(normalized)).sort((a, b) => b.priority - a.priority)[0]
}

export function applyRule(tx: Transaction, rule: Rule): Transaction {
  return {
    ...tx,
    verdict: rule.verdict,
    ruleId: rule.id,
    basis: rule.basis,
    citation: rule.citation,
    confidence: rule.confidence,
    sourceType: rule.sourceType ?? tx.sourceType,
    question: rule.question,
    classifiedBy: 'rule',
    uncertaintyKind: rule.verdict === 'NEEDS_INFO' ? 'technical' : tx.uncertaintyKind,
  }
}
