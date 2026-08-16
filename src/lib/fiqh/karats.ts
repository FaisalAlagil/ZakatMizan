export type GoldKarat = '24K' | '22K' | '21K' | '18K' | '14K' | '10K' | '9K'
export type SilverPurity = '999' | '925' | '900' | '800'
export type MetalUnit = 'g' | 'oz' | 'tola'

export const TROY_OZ_TO_GRAMS = 31.1034768
export const TOLA_TO_GRAMS = 11.6638

export const GOLD_KARAT_FACTORS: Record<
  GoldKarat,
  { factor: number; label: string; purityPct: number; description: string }
> = {
  '24K': {
    factor: 1.0,
    label: '24K (99.9% Pure Bullion)',
    purityPct: 99.9,
    description: 'Pure investment gold bars and coins (100% fine gold)',
  },
  '22K': {
    factor: 22 / 24,
    label: '22K (91.7% South Asian)',
    purityPct: 91.67,
    description: 'Traditional Indian/Pakistani 22-karat wedding jewelry',
  },
  '21K': {
    factor: 21 / 24,
    label: '21K (87.5% Arab/Middle East)',
    purityPct: 87.5,
    description: 'Traditional Gulf/Middle Eastern 21-karat jewelry',
  },
  '18K': {
    factor: 18 / 24,
    label: '18K (75.0% Fine Jewelry)',
    purityPct: 75.0,
    description: 'Standard fine jewelry and diamond settings',
  },
  '14K': {
    factor: 14 / 24,
    label: '14K (58.3% Everyday Jewelry)',
    purityPct: 58.33,
    description: 'Standard North American durable jewelry',
  },
  '10K': {
    factor: 10 / 24,
    label: '10K (41.7% Casual Jewelry)',
    purityPct: 41.67,
    description: 'Minimum legal gold standard in the US',
  },
  '9K': {
    factor: 9 / 24,
    label: '9K (37.5% UK/Commonwealth)',
    purityPct: 37.5,
    description: 'Common British and Commonwealth standard',
  },
}

export const SILVER_PURITY_FACTORS: Record<
  SilverPurity,
  { factor: number; label: string; purityPct: number; description: string }
> = {
  '999': {
    factor: 1.0,
    label: '999 Fine Silver (99.9% Bullion)',
    purityPct: 99.9,
    description: 'Pure investment silver bars and bullion coins',
  },
  '925': {
    factor: 0.925,
    label: '925 Sterling Silver (92.5%)',
    purityPct: 92.5,
    description: 'Standard sterling silverware and jewelry',
  },
  '900': {
    factor: 0.9,
    label: '900 Coin Silver (90.0%)',
    purityPct: 90.0,
    description: 'Historic silver currency and coins',
  },
  '800': {
    factor: 0.8,
    label: '800 European Silver (80.0%)',
    purityPct: 80.0,
    description: 'Continental European silverware',
  },
}

/**
 * Converts a weight in any unit and karat to pure 24K equivalent grams.
 */
export function calculatePureGoldGrams(rawWeight: number, unit: MetalUnit, karat: GoldKarat): number {
  if (rawWeight <= 0) return 0
  let inGrams = rawWeight
  if (unit === 'oz') inGrams = rawWeight * TROY_OZ_TO_GRAMS
  if (unit === 'tola') inGrams = rawWeight * TOLA_TO_GRAMS
  return inGrams * GOLD_KARAT_FACTORS[karat].factor
}

/**
 * Converts a weight in any unit and purity to pure 999 equivalent grams.
 */
export function calculatePureSilverGrams(rawWeight: number, unit: MetalUnit, purity: SilverPurity): number {
  if (rawWeight <= 0) return 0
  let inGrams = rawWeight
  if (unit === 'oz') inGrams = rawWeight * TROY_OZ_TO_GRAMS
  if (unit === 'tola') inGrams = rawWeight * TOLA_TO_GRAMS
  return inGrams * SILVER_PURITY_FACTORS[purity].factor
}
