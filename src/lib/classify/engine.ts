import { REF } from '@/lib/fiqh/fiqh-references'
import type { Citation, Industry, IncomeSourceType, ScholarlyDifference, Transaction, Verdict } from '@/lib/types'
import { normalize } from './normalize'
import { applyRule, matchRule, employerQuestion, vagueQuestion } from './rules'
import { applyLearned, matchLearned, type LearnedRule } from './learned-rules'

/** At or above this, the rule table settles it and no model is consulted. */
export const CONFIDENCE_GATE = 0.9

/** Rules at or above this priority outrank anything the user has taught us. */
const OVERRIDES_LEARNED = 70

/** What the model is allowed to return. Facts about the world, never a ruling. */
export type AiFacts = {
  sourceType: IncomeSourceType
  counterparty: string
  industry: Industry
  involvesInterest: boolean
  certainty: number
  reasoning: string
}

export function classify(tx: Transaction, learned: LearnedRule[]): Transaction {
  // This tracks income. Money going out is not classified at all.
  if (tx.amount <= 0) {
    return { ...tx, ruleId: 'nonincome.debit', verdict: undefined, classifiedBy: 'rule' }
  }

  const normalized = normalize(tx.description)
  const rule = matchRule(normalized)
  const learnedRule = matchLearned(normalized, learned)

  if (rule && rule.priority >= OVERRIDES_LEARNED) return applyRule(tx, rule)
  if (learnedRule) return applyLearned(tx, learnedRule)
  if (rule) return applyRule(tx, rule)
  return { ...tx, verdict: undefined, confidence: 0 }
}

/**
 * A row goes to the model only when the rules cannot settle it and there is no
 * question we could put to the user instead. Asking the user is cheaper, and
 * the answer is worth more because it becomes a learned rule.
 */
export function needsAi(tx: Transaction): boolean {
  if (tx.ruleId === 'nonincome.debit') return false
  if (!tx.verdict) return true
  if (tx.question) return false
  // A verdict the user gave us, directly or through a rule they taught us, is
  // settled. Confidence only speaks to how sure the rule table was.
  if (tx.classifiedBy === 'user' || tx.classifiedBy === 'learned') return false
  return (tx.confidence ?? 0) < CONFIDENCE_GATE
}

/**
 * Whether this entry still needs a decision from the person. Drives the badge
 * on the nav and the highlight on the row.
 */
export function needsAnswer(tx: Transaction): boolean {
  return tx.amount > 0 && (tx.verdict === 'NEEDS_INFO' || tx.verdict === 'UNCERTAIN' || needsAi(tx))
}

/**
 * Runs the rules only when there is no verdict yet. The guided add flow works
 * the verdict out from the source the user picked, and re-running the rule
 * table over a hand-written label like "A gift or family support" would find
 * nothing and wipe that answer out.
 */
export function classifyIfNeeded(tx: Transaction, learned: LearnedRule[]): Transaction {
  return tx.verdict ? tx : classify(tx, learned)
}

export function classifyAll(
  txs: Transaction[],
  learned: LearnedRule[],
): { settled: Transaction[]; pending: Transaction[]; all: Transaction[] } {
  const all = txs.map((t) => classify(t, learned))
  return {
    settled: all.filter((t) => !needsAi(t)),
    pending: all.filter((t) => needsAi(t)),
    all,
  }
}

type IndustryOutcome = {
  verdict: Verdict
  ruleId: string
  basis: string
  citation: Citation
  haramRatio?: number
  uncertaintyKind?: 'technical' | 'scholarly'
  scholarlyDifference?: ScholarlyDifference
}

const bankingDifference: ScholarlyDifference = {
  topic: 'Working for a conventional bank or insurer',
  positions: [
    {
      madhhab: 'contemporary',
      position:
        'Many scholars hold that a role which directly records, sells or facilitates interest takes the ruling of riba.',
      citation: REF.conventionalBankingWork,
    },
    {
      madhhab: 'contemporary',
      position:
        'Others distinguish support roles such as IT, cleaning or security, which are not themselves the contract, and permit the wage while advising a move where possible.',
      citation: REF.conventionalBankingWork,
    },
  ],
}

const insuranceDifference: ScholarlyDifference = {
  topic: 'Income connected to conventional insurance',
  positions: [
    {
      madhhab: 'contemporary',
      position: 'Widely held to contain gharar and riba, so the income is treated as unlawful.',
      citation: REF.insuranceDifference,
    },
    {
      madhhab: 'contemporary',
      position: 'Some permit it where the cover is required by law and no takaful alternative exists.',
      citation: REF.insuranceDifference,
    },
  ],
}

const tobaccoWeaponsDifference: ScholarlyDifference = {
  topic: 'Income from tobacco or arms',
  positions: [
    {
      madhhab: 'contemporary',
      position: 'Some treat these as forbidden because of the harm they cause.',
      citation: REF.tobaccoWeaponsDifference,
    },
    {
      madhhab: 'contemporary',
      position: 'Others permit the trade itself and place responsibility on the misuse.',
      citation: REF.tobaccoWeaponsDifference,
    },
  ],
}

const haram = (basis: string, citation: Citation): IndustryOutcome => ({
  verdict: 'HARAM',
  ruleId: 'employment.haram-industry',
  basis,
  citation,
})

const scholarly = (
  ruleId: string,
  basis: string,
  citation: Citation,
  scholarlyDifference: ScholarlyDifference,
): IndustryOutcome => ({
  verdict: 'UNCERTAIN',
  ruleId,
  basis,
  citation,
  uncertaintyKind: 'scholarly',
  scholarlyDifference,
})

/** The only place a model-supplied fact becomes a ruling, and it happens here in code. */
const INDUSTRY_OUTCOMES: Record<Industry, IndustryOutcome> = {
  halal_general: {
    verdict: 'HALAL',
    ruleId: 'employment.halal-industry',
    basis: 'Ordinary permissible work, so the income is lawful.',
    citation: REF.lawfulEarning,
  },
  alcohol: haram('Income traced to the sale of intoxicants.', REF.khamrProhibited),
  pork: haram('Income traced to the sale of pork.', REF.employmentInHaramIndustry),
  gambling_hospitality: haram('Income traced to gambling.', REF.maysirProhibited),
  adult_entertainment: haram('Income traced to adult entertainment.', REF.employmentInHaramIndustry),
  conventional_banking: scholarly(
    'finance.scholarly-difference',
    'This income comes from interest-based finance, where scholars differ by role.',
    REF.conventionalBankingWork,
    bankingDifference,
  ),
  insurance_conventional: scholarly(
    'insurance.scholarly-difference',
    'Conventional insurance is a contested area.',
    REF.insuranceDifference,
    insuranceDifference,
  ),
  tobacco: scholarly(
    'tobacco.scholarly-difference',
    'Scholars differ on income from tobacco.',
    REF.tobaccoWeaponsDifference,
    tobaccoWeaponsDifference,
  ),
  weapons: scholarly(
    'weapons.scholarly-difference',
    'Scholars differ on income from arms.',
    REF.tobaccoWeaponsDifference,
    tobaccoWeaponsDifference,
  ),
  mixed_retail: {
    verdict: 'MIXED',
    ruleId: 'business.mixed-revenue',
    basis:
      'Part of this business is not compliant. The share below is an estimate you can replace with the real figure.',
    citation: REF.mixedIncomePurification,
    haramRatio: 0.05,
  },
  unknown: {
    verdict: 'NEEDS_INFO',
    ruleId: 'ai.unresolved',
    basis: 'We could not tell where this came from.',
    citation: REF.lawfulEarning,
    uncertaintyKind: 'technical',
  },
}

export function applyFacts(tx: Transaction, facts: AiFacts): Transaction {
  const base: Transaction = {
    ...tx,
    counterparty: facts.counterparty || tx.counterparty,
    industry: facts.industry,
    sourceType: facts.sourceType ?? tx.sourceType,
    classifiedBy: 'ai',
    confidence: facts.certainty,
  }

  // A model that is unsure hands the question to the user rather than guessing.
  if (facts.certainty < 0.5 || facts.industry === 'unknown') {
    return {
      ...base,
      verdict: 'NEEDS_INFO',
      ruleId: 'ai.unresolved',
      basis: 'We could not tell where this came from, so please pick the closest description.',
      citation: REF.lawfulEarning,
      uncertaintyKind: 'technical',
      question: facts.sourceType === 'employment' ? employerQuestion : vagueQuestion,
    }
  }

  const outcome = INDUSTRY_OUTCOMES[facts.industry]

  // An interest-bearing return in an otherwise ordinary setting is still riba.
  if (facts.involvesInterest && facts.industry === 'halal_general') {
    return {
      ...base,
      verdict: 'HARAM',
      ruleId: 'riba.interest-credit',
      basis: 'This is a return paid for the use of money, which is riba.',
      citation: REF.ribaProhibited,
    }
  }

  return {
    ...base,
    verdict: outcome.verdict,
    ruleId: outcome.ruleId,
    basis: outcome.basis,
    citation: outcome.citation,
    haramRatio: outcome.haramRatio ?? base.haramRatio,
    haramRatioIsEstimate: outcome.haramRatio !== undefined ? true : base.haramRatioIsEstimate,
    uncertaintyKind: outcome.uncertaintyKind,
    scholarlyDifference: outcome.scholarlyDifference,
  }
}
