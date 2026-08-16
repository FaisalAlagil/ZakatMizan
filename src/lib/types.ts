export type Madhhab = 'hanafi' | 'maliki' | 'shafii' | 'hanbali'

export const MADHHABS: Madhhab[] = ['hanafi', 'maliki', 'shafii', 'hanbali']

export const MADHHAB_LABELS: Record<Madhhab, string> = {
  hanafi: 'Hanafi',
  maliki: 'Maliki',
  shafii: "Shafi'i",
  hanbali: 'Hanbali',
}

export type Verdict = 'HALAL' | 'HARAM' | 'MIXED' | 'UNCERTAIN' | 'NEEDS_INFO'

/**
 * `verified` is false until a qualified reviewer signs off. The UI renders
 * unverified rulings with a review badge rather than stating them as settled.
 */
export type Citation = {
  source: string
  note?: string
  verified: boolean
}

export type IncomeSourceType =
  | 'employment'
  | 'business'
  | 'investment'
  | 'rental'
  | 'gift'
  | 'interest'
  | 'gambling'
  | 'benefit'
  | 'refund'
  | 'transfer'
  | 'other'

export type Industry =
  | 'halal_general'
  | 'conventional_banking'
  | 'insurance_conventional'
  | 'alcohol'
  | 'pork'
  | 'gambling_hospitality'
  | 'adult_entertainment'
  | 'tobacco'
  | 'weapons'
  | 'mixed_retail'
  | 'unknown'

/** A question the app asks the user to resolve a NEEDS_INFO transaction. */
export type EnrichmentQuestion = {
  key: string
  prompt: string
  options: { value: string; label: string; sets: Partial<Transaction> }[]
}

export type ScholarlyDifference = {
  topic: string
  positions: { madhhab: Madhhab | 'contemporary'; position: string; citation?: Citation }[]
}

export type ClassifiedBy = 'rule' | 'ai' | 'user' | 'learned'

export type Transaction = {
  id: string
  date: string
  description: string
  amount: number
  currency: string
  verdict?: Verdict
  ruleId?: string
  basis?: string
  citation?: Citation
  confidence?: number
  /** For MIXED: the proportion (0 to 1) of this amount that must be purified. */
  haramRatio?: number
  /** True when haramRatio is an app default rather than a user-supplied figure. */
  haramRatioIsEstimate?: boolean
  /** For MIXED: whether the non-halal portion was disposed/purified or retained */
  mixedTreatment?: 'disposed' | 'retained'
  counterparty?: string
  industry?: Industry
  sourceType?: IncomeSourceType
  classifiedBy?: ClassifiedBy
  question?: EnrichmentQuestion
  scholarlyDifference?: ScholarlyDifference
  /** Distinguishes "we can't tell what this is" from "the schools disagree". */
  uncertaintyKind?: 'technical' | 'scholarly'
}

export type AssetKind =
  | 'cash'
  | 'gold'
  | 'silver'
  | 'personal_jewelry'
  | 'business_inventory'
  | 'receivable'
  | 'crypto'
  | 'investment'
  | 'retirement'

export type Asset = {
  id: string
  kind: AssetKind
  label: string
  /** Currency value, except gold/silver/personal_jewelry which are in grams. */
  amount: number
  /** What the amount is denominated in. Omitted means the main currency. */
  currency?: string
  /** Maliki only: an active trader values stock annually, a holder pays on sale. */
  traderType?: 'mudir' | 'muhtakir'
  /** Retirement funds the user cannot access without penalty. */
  accessible?: boolean
}

export type Liability = {
  id: string
  label: string
  amount: number
  /** What the amount is denominated in. Omitted means the main currency. */
  currency?: string
  /** Installments falling due inside the hawl. Only this portion is deductible. */
  dueWithinYear: number
}

export type MetalPrices = {
  goldPerGram: number
  silverPerGram: number
  currency: string
  asOf: string
  source: 'live' | 'cached' | 'manual'
}

export type TraceStep = {
  id: string
  label: string
  detail: string
  amount?: number
  citation?: Citation
  /** True when this step would differ under another madhhab. Drives the diff view. */
  madhhabSpecific: boolean
}

export type ExcludedItem = {
  label: string
  amount: number
  reason: string
}

export type ZakatPool = {
  id: 'monetary' | 'silver'
  label: string
  gross: number
  deductions: number
  net: number
  nisabValue: number
  nisabBasis: 'gold' | 'silver'
  meetsNisab: boolean
  zakat: number
}

export type ZakatResult = {
  madhhab: Madhhab
  currency: string
  rate: number
  pools: ZakatPool[]
  zakatableBase: number
  meetsNisab: boolean
  /** What is owed right now. Zero until the holding period completes. */
  zakatDue: number
  /** What will be owed once the holding period completes, at today's figures. */
  projectedZakat: number
  purificationDue: number
  trace: TraceStep[]
  excluded: ExcludedItem[]
  hawl: HawlStatus
}

export type HawlStatus = {
  startDate: string
  daysElapsed: number
  daysRemaining: number
  lunarYearDays: number
  complete: boolean
  /** User declares whether wealth dipped below nisab during the year. */
  dippedBelowNisab: boolean
  /** Under the continuous rule a dip restarts the year; Hanafi ignores it. */
  brokenByDip: boolean
  hijriToday: string
  hijriDue: string
}
