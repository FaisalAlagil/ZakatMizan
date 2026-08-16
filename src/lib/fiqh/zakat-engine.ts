import type {
  Asset,
  ExcludedItem,
  Liability,
  Madhhab,
  MetalPrices,
  TraceStep,
  Transaction,
  ZakatPool,
  ZakatResult,
} from '@/lib/types'
import { REF } from './fiqh-references'
import { GOLD_NISAB_GRAMS, MADHHAB_PROFILES, SILVER_NISAB_GRAMS } from './madhhab-profiles'
import { computeHawl } from './hawl'

export type ZakatInput = {
  madhhab: Madhhab
  assets: Asset[]
  liabilities: Liability[]
  transactions: Transaction[]
  prices: MetalPrices
  hawlStartDate: string
  today: string
  dippedBelowNisab: boolean
  /** Some bodies round the thresholds to 85g and 595g. */
  nisabGrams?: { gold: number; silver: number }
}

export function assetValue(asset: Asset, prices: MetalPrices): number {
  switch (asset.kind) {
    case 'gold':
    case 'personal_jewelry':
      return asset.amount * prices.goldPerGram
    case 'silver':
      return asset.amount * prices.silverPerGram
    default:
      return asset.amount
  }
}

/** Total that must be given away because it was never lawfully owned. */
export function purificationTotal(transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => {
    if (t.verdict === 'HARAM') return sum + Math.abs(t.amount)
    if (t.verdict === 'MIXED') return sum + Math.abs(t.amount) * (t.haramRatio ?? 0)
    return sum
  }, 0)
}

/** 
 * Wealth deduction for unlawful income disposed of.
 * If mixed income is retained by the user, per hackathon rules, it remains in the zakatable wealth base.
 */
export function purificationDeduction(transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => {
    if (t.verdict === 'HARAM') return sum + Math.abs(t.amount)
    if (t.verdict === 'MIXED') {
      return t.mixedTreatment === 'retained' ? sum : sum + Math.abs(t.amount) * (t.haramRatio ?? 0)
    }
    return sum
  }, 0)
}

export function computeZakat(input: ZakatInput): ZakatResult {
  const profile = MADHHAB_PROFILES[input.madhhab]
  const { prices, assets, liabilities, transactions } = input
  const grams = input.nisabGrams ?? { gold: GOLD_NISAB_GRAMS, silver: SILVER_NISAB_GRAMS }

  const trace: TraceStep[] = []
  const excluded: ExcludedItem[] = []

  const goldNisabValue = grams.gold * prices.goldPerGram
  const silverNisabValue = grams.silver * prices.silverPerGram

  // Which threshold applies, and why.
  const usesLower = profile.nisabBasis.value === 'lower_of_gold_or_silver'
  const monetaryBasis: 'gold' | 'silver' =
    usesLower && silverNisabValue < goldNisabValue ? 'silver' : 'gold'
  const monetaryNisab = monetaryBasis === 'silver' ? silverNisabValue : goldNisabValue

  trace.push({
    id: 'nisab',
    label: 'Threshold (nisab)',
    detail: usesLower
      ? profile.nisabBasis.explain
      : `${profile.label} measures cash against the gold threshold, which is ${grams.gold}g of gold.`,
    amount: monetaryNisab,
    citation: monetaryBasis === 'silver' ? REF.nisabSilver : REF.nisabGold,
    madhhabSpecific: true,
  })

  // Sort each asset into a pool, or drop it out with a stated reason.
  const pooled: Record<'monetary' | 'silver', number> = { monetary: 0, silver: 0 }
  const combines = profile.combineAssetClasses.value

  for (const a of assets) {
    const value = assetValue(a, prices)

    if (a.kind === 'personal_jewelry' && !profile.personalJewelryZakatable.value) {
      excluded.push({
        label: a.label,
        amount: value,
        reason: `${profile.label}: ${profile.personalJewelryZakatable.explain}`,
      })
      continue
    }

    if (
      a.kind === 'business_inventory' &&
      profile.tradeGoods.value === 'mudir_vs_muhtakir' &&
      a.traderType === 'muhtakir'
    ) {
      excluded.push({
        label: a.label,
        amount: value,
        reason: `${profile.label}: stock held for a rising market is paid on at the point of sale, not annually.`,
      })
      continue
    }

    if (a.kind === 'retirement' && a.accessible === false) {
      excluded.push({
        label: a.label,
        amount: value,
        reason: 'You cannot access these funds, so they are not counted this year. Scholars differ on locked-in savings.',
      })
      continue
    }

    if (a.kind === 'investment' && input.madhhab === 'hanbali') {
      excluded.push({
        label: a.label,
        amount: value,
        reason: 'Hanbali rule: stocks/shares are not treated as trade inventory and are excluded until liquidated.',
      })
      continue
    }

    if (a.kind === 'receivable' && input.madhhab === 'hanbali') {
      excluded.push({
        label: a.label,
        amount: value,
        reason: 'Hanbali rule: money lent to others is excluded from current calculation while unpaid.',
      })
      continue
    }

    // Silver stands on its own unless the school pools the categories together.
    const pool = !combines && a.kind === 'silver' ? 'silver' : 'monetary'
    pooled[pool] += value
  }

  trace.push({
    id: 'assets',
    label: 'Wealth counted',
    detail: combines
      ? `${profile.label} pools cash, gold, silver and business stock into one total.`
      : `${profile.label} keeps silver as its own category with its own threshold.`,
    amount: pooled.monetary + pooled.silver,
    citation: combines ? REF.hanafiCombines : REF.majoritySeparateNisab,
    madhhabSpecific: true,
  })

  if (excluded.length > 0) {
    trace.push({
      id: 'excluded',
      label: 'Left out',
      detail: `${excluded.map((e) => e.label).join(', ')}. The reason for each is listed below.`,
      amount: excluded.reduce((s, e) => s + e.amount, 0),
      madhhabSpecific: true,
    })
  }

  // Unlawful holdings are removed before anything is measured against the threshold.
  const purificationDue = purificationTotal(transactions)
  const deductiblePurification = purificationDeduction(transactions)
  if (purificationDue > 0) {
    trace.push({
      id: 'purification',
      label: 'Set aside to purify (Disposal)',
      detail:
        'Haram income and the haram portion of mixed income must be separated from halal wealth and given away. Removing haram income does not count as paying zakat.',
      amount: purificationDue,
      citation: REF.haramNotZakatable,
      madhhabSpecific: false,
    })
  }

  const debtRule = profile.debtDeduction.value
  const deductibleDebt =
    debtRule === 'none' ? 0 : liabilities.reduce((s, l) => s + Math.max(0, l.dueWithinYear), 0)

  trace.push({
    id: 'debts',
    label: 'Debts',
    detail:
      debtRule === 'none'
        ? `${profile.label}: ${profile.debtDeduction.explain}`
        : `${profile.label}: ${profile.debtDeduction.explain} Only instalments falling due inside the year are counted.`,
    amount: -deductibleDebt,
    citation:
      debtRule === 'none'
        ? REF.debtNotDeductible
        : debtRule === 'from_monetary_assets'
          ? REF.debtFromMonetary
          : REF.debtDeductible,
    madhhabSpecific: true,
  })

  const monetaryDeductions = deductibleDebt + deductiblePurification
  const pools: ZakatPool[] = [
    {
      id: 'monetary',
      label: combines ? 'Your wealth' : 'Cash, gold and business assets',
      gross: pooled.monetary,
      deductions: monetaryDeductions,
      net: Math.max(0, pooled.monetary - monetaryDeductions),
      nisabValue: monetaryNisab,
      nisabBasis: monetaryBasis,
      meetsNisab: false,
      zakat: 0,
    },
  ]

  if (!combines && pooled.silver > 0) {
    pools.push({
      id: 'silver',
      label: 'Silver',
      gross: pooled.silver,
      deductions: 0,
      net: pooled.silver,
      nisabValue: silverNisabValue,
      nisabBasis: 'silver',
      meetsNisab: false,
      zakat: 0,
    })
  }

  for (const p of pools) {
    p.meetsNisab = p.net >= p.nisabValue
    p.zakat = p.meetsNisab ? p.net * profile.rate : 0
  }

  const hawl = computeHawl(input.hawlStartDate, input.today, profile.hawl.value, input.dippedBelowNisab)
  const projectedZakat = pools.reduce((s, p) => s + p.zakat, 0)
  const hawlSatisfied = hawl.complete && !hawl.brokenByDip

  trace.push({
    id: 'hawl',
    label: 'Holding period',
    detail: hawl.brokenByDip
      ? `${profile.label}: ${profile.hawl.explain} Your wealth dipped below the threshold, so the year has restarted.`
      : hawl.complete
        ? `A full lunar year has passed since ${hawl.startDate}. ${profile.hawl.explain}`
        : `${hawl.daysRemaining} days remain until your zakat falls due on ${hawl.hijriDue}.`,
    citation: REF.hawlRequired,
    madhhabSpecific: true,
  })

  const zakatDue = hawlSatisfied ? projectedZakat : 0

  trace.push({
    id: 'total',
    label: 'Zakat due',
    detail: `${(profile.rate * 100).toFixed(1)}% of the wealth that clears the threshold.`,
    amount: zakatDue,
    citation: REF.zakatRate,
    madhhabSpecific: false,
  })

  return {
    madhhab: input.madhhab,
    currency: prices.currency,
    rate: profile.rate,
    pools,
    zakatableBase: pools.reduce((s, p) => s + p.net, 0),
    meetsNisab: pools.some((p) => p.meetsNisab),
    zakatDue,
    projectedZakat,
    purificationDue,
    trace,
    excluded,
    hawl,
  }
}

/** Powers the Compare All Four view. */
export function compareAllMadhhabs(input: Omit<ZakatInput, 'madhhab'>): Record<Madhhab, ZakatResult> {
  return {
    hanafi: computeZakat({ ...input, madhhab: 'hanafi' }),
    maliki: computeZakat({ ...input, madhhab: 'maliki' }),
    shafii: computeZakat({ ...input, madhhab: 'shafii' }),
    hanbali: computeZakat({ ...input, madhhab: 'hanbali' }),
  }
}
