import type { Citation } from '@/lib/types'

/**
 * Every ruling the app issues points at a row in here.
 *
 * `verified: true` means the ruling rests on an explicit primary text and is
 * agreed across the four schools. `verified: false` means it is a school-specific
 * juristic position that a qualified reviewer should confirm before the app
 * presents it as settled. The UI renders unverified rulings with a review badge.
 *
 * Review status: NOT YET REVIEWED. Have a scholar or mentor sign off on the
 * school-specific rows before submission, then flip their `verified` flags.
 */
export const REF = {
  // Agreed, primary-text basis
  ribaProhibited: {
    source: "Qur'an 2:275, 2:278-279",
    note: 'Allah has permitted trade and forbidden riba. Interest received on deposits or loans falls under riba al-nasiah.',
    verified: true,
  },
  maysirProhibited: {
    source: "Qur'an 5:90-91",
    note: 'Gambling (maysir) is grouped with intoxicants as an abomination to be avoided.',
    verified: true,
  },
  khamrProhibited: {
    source: "Qur'an 5:90; Sunan Abu Dawud 3674",
    note: 'Intoxicants are forbidden, and the reported curse on khamr includes its seller and the one who carries it.',
    verified: true,
  },
  zakatRate: {
    source: 'Sahih al-Bukhari 1454; agreed by the four schools',
    note: 'A quarter of a tenth (2.5%) on monetary wealth completing a lunar year above nisab.',
    verified: true,
  },
  nisabSilver: {
    source: 'Sahih al-Bukhari 1447, Sahih Muslim 979',
    note: 'No zakat on less than five awaq of silver. Five awaq = 200 dirhams = about 612.36g.',
    verified: true,
  },
  nisabGold: {
    source: 'Sunan Abu Dawud 1573; agreed by the four schools',
    note: '20 dinars (about 87.48g of gold) is the gold threshold.',
    verified: true,
  },
  hawlRequired: {
    source: 'Sunan Abu Dawud 1573, Sunan Ibn Majah 1792',
    note: 'No zakat on wealth until a lunar year passes over it.',
    verified: true,
  },
  asnaf: {
    source: "Qur'an 9:60",
    note: 'The eight categories entitled to receive zakat.',
    verified: true,
  },
  haramNotZakatable: {
    source: 'Sahih Muslim 1015; AAOIFI Shariah Standard No. 35',
    note: 'Allah is pure and accepts only what is pure. Unlawful wealth is not owned in a way that attracts zakat; it is disposed of to those in need without expecting reward.',
    verified: true,
  },
  personalUseExempt: {
    source: 'Agreed by the four schools',
    note: 'Items of personal use (home, car, clothing, furniture) carry no zakat.',
    verified: true,
  },
  lawfulEarning: {
    source: "Qur'an 2:275, 4:29; Sahih al-Bukhari 2072",
    note: 'Trade and the earnings of one\'s own labour are lawful. The default for an ordinary occupation is permissibility.',
    verified: true,
  },
  giftsLawful: {
    source: 'Sahih al-Bukhari 2585',
    note: 'Gifts between people are encouraged and lawful to receive.',
    verified: true,
  },

  // Contemporary questions with no single classical answer. NEED SCHOLARLY REVIEW.
  employmentInHaramIndustry: {
    source: "Qur'an 5:2; contemporary rulings",
    note: 'Wages earned directly from a forbidden activity take the ruling of that activity, on the basis that one should not assist in sin.',
    verified: false,
  },
  conventionalBankingWork: {
    source: 'Point of difference among contemporary scholars',
    note: 'Scholars differ over employment at a conventional bank. Many distinguish roles that directly record or facilitate interest from support roles such as security or IT.',
    verified: false,
  },
  insuranceDifference: {
    source: 'Point of difference among contemporary scholars',
    note: 'Conventional insurance is widely held to contain gharar and riba, though positions differ where cover is legally required.',
    verified: false,
  },
  tobaccoWeaponsDifference: {
    source: 'Point of difference among contemporary scholars',
    note: 'Income from tobacco or arms is treated differently depending on the scholar and the circumstances.',
    verified: false,
  },

  // School-specific positions. NEED SCHOLARLY REVIEW before being stated as settled.
  hanafiLowerNisab: {
    source: 'Hanafi school; al-Hidayah, Kitab al-Zakat',
    note: 'Where a person holds mixed monetary wealth the lower of the two thresholds is applied, which in current prices is silver. This favours the recipient.',
    verified: false,
  },
  hanafiCombines: {
    source: 'Hanafi school; al-Hidayah, Kitab al-Zakat',
    note: 'Gold, silver, cash and trade goods are pooled together to reach nisab.',
    verified: false,
  },
  majoritySeparateNisab: {
    source: "Maliki, Shafi'i and Hanbali schools",
    note: 'Gold and silver are distinct categories and are not combined to reach nisab. Cash is attached to gold by analogy in contemporary practice.',
    verified: false,
  },
  hanafiHawlEndpoints: {
    source: 'Hanafi school',
    note: 'Nisab must be held at the start and end of the lunar year. Fluctuations in between do not restart it.',
    verified: false,
  },
  majorityHawlContinuous: {
    source: "Maliki, Shafi'i and Hanbali schools",
    note: 'Nisab must be maintained throughout the year. Falling below it restarts the hawl.',
    verified: false,
  },
  hanafiJewelryZakatable: {
    source: 'Hanafi school',
    note: "Gold and silver jewellery is zakatable regardless of whether it is worn, because the material remains a currency metal.",
    verified: false,
  },
  majorityJewelryExempt: {
    source: "Maliki, Shafi'i and Hanbali schools",
    note: "Jewellery kept for permissible personal adornment carries no zakat. The Shafi'i school qualifies this where the quantity is extravagant.",
    verified: false,
  },
  debtDeductible: {
    source: 'Hanafi and Hanbali schools',
    note: 'Debts due are deducted from zakatable wealth before the threshold is applied.',
    verified: false,
  },
  debtFromMonetary: {
    source: 'Maliki school',
    note: 'Debts are set against monetary assets rather than apparent wealth.',
    verified: false,
  },
  debtNotDeductible: {
    source: "Shafi'i school, dominant view",
    note: 'Debt does not prevent zakat becoming due on wealth in hand.',
    verified: false,
  },
  malikiTradeGoods: {
    source: 'Maliki school',
    note: 'The mudir (active trader) values stock each year. The muhtakir (one who holds for a rising market) pays for one year at the point of sale.',
    verified: false,
  },
  tradeGoodsZakatable: {
    source: 'Agreed by the four schools',
    note: 'Goods held for resale are valued at market price on the zakat date.',
    verified: false,
  },
  longTermDebtInstalments: {
    source: 'Contemporary position; AMJA, National Zakat Foundation',
    note: 'For a mortgage or other long-term debt only the instalments falling due within the year are deducted, not the whole outstanding balance.',
    verified: false,
  },
  retirementAccessible: {
    source: 'Contemporary position; AAOIFI Shariah Standard No. 35',
    note: 'Funds the holder can access are zakatable. Where access is restricted, scholars differ on whether zakat is due annually or on receipt.',
    verified: false,
  },
  mixedIncomePurification: {
    source: 'Contemporary position; AAOIFI Shariah Standard No. 21',
    note: 'Where an income stream is partly non-compliant, the non-compliant proportion is calculated and given away. Screening ratios are used where the exact figure is unknown.',
    verified: false,
  },
  solarYearAdjustment: {
    source: 'Contemporary position',
    note: 'A lunar year is about 354 days. Calculating on a solar year instead requires 2.577% rather than 2.5% to cover the extra days.',
    verified: false,
  },
  sellingToHaramUse: {
    source: 'Point of difference between the schools',
    note: 'Selling a permissible item to someone who will put it to a forbidden use is treated differently across the schools. Confirm with a scholar for your situation.',
    verified: false,
  },
} as const satisfies Record<string, Citation>

export type RefKey = keyof typeof REF

/** Rows still awaiting scholarly sign-off, surfaced in the app's review panel. */
export function unverifiedReferences(): { key: RefKey; citation: Citation }[] {
  return (Object.keys(REF) as RefKey[])
    .filter((k) => !REF[k].verified)
    .map((k) => ({ key: k, citation: REF[k] }))
}
