import type { Citation, Madhhab } from '@/lib/types'
import { REF } from './fiqh-references'

/** 20 dinars. The 85g figure some bodies use is a rounding of the same threshold. */
export const GOLD_NISAB_GRAMS = 87.48
/** 200 dirhams. */
export const SILVER_NISAB_GRAMS = 612.36

export const GOLD_NISAB_GRAMS_ALT = 85
export const SILVER_NISAB_GRAMS_ALT = 595

export type NisabBasisRule = 'lower_of_gold_or_silver' | 'gold'
export type HawlRule = 'endpoints_only' | 'continuous'
export type DebtRule = 'due_debts' | 'from_monetary_assets' | 'none'
export type TradeGoodsRule = 'annual_market_value' | 'mudir_vs_muhtakir'

export type MadhhabRule<T> = {
  value: T
  /** Shown on hover in the breakdown, in plain language. */
  explain: string
  citation: Citation
}

export type MadhhabProfile = {
  id: Madhhab
  label: string
  blurb: string
  rate: number
  nisabBasis: MadhhabRule<NisabBasisRule>
  combineAssetClasses: MadhhabRule<boolean>
  hawl: MadhhabRule<HawlRule>
  personalJewelryZakatable: MadhhabRule<boolean>
  debtDeduction: MadhhabRule<DebtRule>
  tradeGoods: MadhhabRule<TradeGoodsRule>
}

export const MADHHAB_PROFILES: Record<Madhhab, MadhhabProfile> = {
  hanafi: {
    id: 'hanafi',
    label: 'Hanafi',
    blurb:
      'The school of Abu Hanifa, most widespread in Turkey, the Balkans, Central and South Asia. On zakat it applies the lower threshold and pools your wealth together, so it tends to make zakat due on smaller holdings.',
    rate: 0.025,
    nisabBasis: {
      value: 'lower_of_gold_or_silver',
      explain:
        'Whichever of the gold or silver threshold is lower in value is used. At current prices that is silver, which is a much lower bar, so more people owe zakat.',
      citation: REF.hanafiLowerNisab,
    },
    combineAssetClasses: {
      value: true,
      explain: 'Cash, gold, silver and trade goods are added together to see whether you reach the threshold.',
      citation: REF.hanafiCombines,
    },
    hawl: {
      value: 'endpoints_only',
      explain:
        'You need to hold the threshold at the start and at the end of the lunar year. Dipping below it in between does not reset the year.',
      citation: REF.hanafiHawlEndpoints,
    },
    personalJewelryZakatable: {
      value: true,
      explain: 'Gold and silver jewellery is zakatable even when it is worn, because the metal itself remains wealth.',
      citation: REF.hanafiJewelryZakatable,
    },
    debtDeduction: {
      value: 'due_debts',
      explain: 'Debts you owe that are due are subtracted before the threshold is applied.',
      citation: REF.debtDeductible,
    },
    tradeGoods: {
      value: 'annual_market_value',
      explain: 'Stock held for resale is valued at market price on your zakat date.',
      citation: REF.tradeGoodsZakatable,
    },
  },

  maliki: {
    id: 'maliki',
    label: 'Maliki',
    blurb:
      'The school of Malik ibn Anas, most widespread in North and West Africa. It separates gold from silver, and treats an active trader differently from someone holding stock for a rising market.',
    rate: 0.025,
    nisabBasis: {
      value: 'gold',
      explain: 'Cash is measured against the gold threshold, which is the higher of the two.',
      citation: REF.majoritySeparateNisab,
    },
    combineAssetClasses: {
      value: false,
      explain: 'Gold and silver are separate categories. Each is measured against its own threshold.',
      citation: REF.majoritySeparateNisab,
    },
    hawl: {
      value: 'continuous',
      explain: 'You need to stay above the threshold for the whole year. Falling below it starts the year again.',
      citation: REF.majorityHawlContinuous,
    },
    personalJewelryZakatable: {
      value: false,
      explain: 'Jewellery you wear is exempt, because it is treated as personal use rather than stored wealth.',
      citation: REF.majorityJewelryExempt,
    },
    debtDeduction: {
      value: 'from_monetary_assets',
      explain: 'Debts are set against your cash and monetary assets rather than against everything you own.',
      citation: REF.debtFromMonetary,
    },
    tradeGoods: {
      value: 'mudir_vs_muhtakir',
      explain:
        'An active trader values stock every year. Someone holding goods waiting for the price to rise pays for one year when the goods are sold.',
      citation: REF.malikiTradeGoods,
    },
  },

  shafii: {
    id: 'shafii',
    label: "Shafi'i",
    blurb:
      "The school of al-Shafi'i, most widespread in East Africa, Egypt, Yemen and Southeast Asia. It is the strictest of the four on debt: what you owe does not reduce the zakat due on what you hold.",
    rate: 0.025,
    nisabBasis: {
      value: 'gold',
      explain: 'Cash is measured against the gold threshold.',
      citation: REF.majoritySeparateNisab,
    },
    combineAssetClasses: {
      value: false,
      explain: 'Gold and silver are separate categories, each measured against its own threshold.',
      citation: REF.majoritySeparateNisab,
    },
    hawl: {
      value: 'continuous',
      explain: 'You need to stay above the threshold for the whole year. Falling below it starts the year again.',
      citation: REF.majorityHawlContinuous,
    },
    personalJewelryZakatable: {
      value: false,
      explain:
        'Jewellery worn for permissible adornment is exempt. The school qualifies this where the quantity is extravagant.',
      citation: REF.majorityJewelryExempt,
    },
    debtDeduction: {
      value: 'none',
      explain: 'On the dominant view, debt does not stop zakat becoming due on the wealth you are holding.',
      citation: REF.debtNotDeductible,
    },
    tradeGoods: {
      value: 'annual_market_value',
      explain: 'Stock held for resale is valued at market price on your zakat date.',
      citation: REF.tradeGoodsZakatable,
    },
  },

  hanbali: {
    id: 'hanbali',
    label: 'Hanbali',
    blurb:
      'The school of Ahmad ibn Hanbal, most widespread in the Arabian Peninsula. On zakat it sits close to the Maliki and Shafi\'i positions, but it allows debts to be deducted.',
    rate: 0.025,
    nisabBasis: {
      value: 'gold',
      explain: 'Cash is measured against the gold threshold.',
      citation: REF.majoritySeparateNisab,
    },
    combineAssetClasses: {
      value: false,
      explain: 'Gold and silver are separate categories, each measured against its own threshold.',
      citation: REF.majoritySeparateNisab,
    },
    hawl: {
      value: 'continuous',
      explain: 'You need to stay above the threshold for the whole year. Falling below it starts the year again.',
      citation: REF.majorityHawlContinuous,
    },
    personalJewelryZakatable: {
      value: false,
      explain: 'Jewellery you wear is exempt, because it is treated as personal use rather than stored wealth.',
      citation: REF.majorityJewelryExempt,
    },
    debtDeduction: {
      value: 'due_debts',
      explain: 'Debts you owe that are due are subtracted before the threshold is applied.',
      citation: REF.debtDeductible,
    },
    tradeGoods: {
      value: 'annual_market_value',
      explain: 'Stock held for resale is valued at market price on your zakat date.',
      citation: REF.tradeGoodsZakatable,
    },
  },
}

export type ProfileRuleKey =
  | 'nisabBasis'
  | 'combineAssetClasses'
  | 'hawl'
  | 'personalJewelryZakatable'
  | 'debtDeduction'
  | 'tradeGoods'

export const RULE_LABELS: Record<ProfileRuleKey, string> = {
  nisabBasis: 'Threshold basis',
  combineAssetClasses: 'Pooling of assets',
  hawl: 'Holding period',
  personalJewelryZakatable: 'Jewellery you wear',
  debtDeduction: 'Debts',
  tradeGoods: 'Business stock',
}

const RULE_KEYS = Object.keys(RULE_LABELS) as ProfileRuleKey[]

export type RuleDiff = {
  key: ProfileRuleKey
  label: string
  from: string
  to: string
  explain: string
  citation: Citation
}

/** Powers the madhhab switcher diff: which rules actually changed, and why. */
export function diffProfiles(from: Madhhab, to: Madhhab): RuleDiff[] {
  const a = MADHHAB_PROFILES[from]
  const b = MADHHAB_PROFILES[to]
  return RULE_KEYS.filter((k) => a[k].value !== b[k].value).map((k) => ({
    key: k,
    label: RULE_LABELS[k],
    from: String(a[k].value),
    to: String(b[k].value),
    explain: b[k].explain,
    citation: b[k].citation,
  }))
}
