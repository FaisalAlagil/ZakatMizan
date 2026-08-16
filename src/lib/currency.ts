/** Rates are expressed as "units of this currency per 1 unit of `base`". */
export type Rates = {
  base: string
  rates: Record<string, number>
  asOf: string
  source: 'live' | 'cached' | 'manual'
}

export type Currency = { code: string; name: string; symbol: string }

/** Kept short and relevant rather than exhaustive. */
export const CURRENCIES: Currency[] = [
  { code: 'CAD', name: 'Canadian dollar', symbol: '$' },
  { code: 'USD', name: 'US dollar', symbol: '$' },
  { code: 'GBP', name: 'British pound', symbol: '£' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'AUD', name: 'Australian dollar', symbol: '$' },
  { code: 'PKR', name: 'Pakistani rupee', symbol: '₨' },
  { code: 'INR', name: 'Indian rupee', symbol: '₹' },
  { code: 'BDT', name: 'Bangladeshi taka', symbol: '৳' },
  { code: 'MYR', name: 'Malaysian ringgit', symbol: 'RM' },
  { code: 'IDR', name: 'Indonesian rupiah', symbol: 'Rp' },
  { code: 'SAR', name: 'Saudi riyal', symbol: '﷼' },
  { code: 'AED', name: 'UAE dirham', symbol: 'د.إ' },
  { code: 'EGP', name: 'Egyptian pound', symbol: 'E£' },
  { code: 'TRY', name: 'Turkish lira', symbol: '₺' },
  { code: 'NGN', name: 'Nigerian naira', symbol: '₦' },
  { code: 'ZAR', name: 'South African rand', symbol: 'R' },
]

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code)

export function currencyName(code: string) {
  return CURRENCIES.find((c) => c.code === code)?.name ?? code
}

/**
 * Approximate rates per 1 USD. Used when the live feed cannot be reached, so a
 * conversion always produces a figure rather than failing. The app labels these
 * as cached and lets the user override them.
 */
export const FALLBACK_RATES: Rates = {
  base: 'USD',
  asOf: '',
  source: 'cached',
  rates: {
    USD: 1,
    CAD: 1.37,
    GBP: 0.79,
    EUR: 0.92,
    AUD: 1.52,
    PKR: 278,
    INR: 83.5,
    BDT: 118,
    MYR: 4.7,
    IDR: 16000,
    SAR: 3.75,
    AED: 3.67,
    EGP: 48,
    TRY: 34,
    NGN: 1500,
    ZAR: 18.5,
  },
}

/**
 * Converts between two currencies via the rate table's base. Returns the amount
 * unchanged when the currencies match, and when a rate is missing, so a gap in
 * the table can never silently turn someone's savings into a different number.
 */
export function convert(amount: number, from: string, to: string, rates: Rates): number {
  if (from === to) return amount
  const fromRate = rates.rates[from]
  const toRate = rates.rates[to]
  if (!fromRate || !toRate) return amount
  return (amount / fromRate) * toRate
}

/** True when we hold a usable rate for both sides of a conversion. */
export function canConvert(from: string, to: string, rates: Rates): boolean {
  return from === to || Boolean(rates.rates[from] && rates.rates[to])
}

export function formatMoney(amount: number, currency: string, dp = 2) {
  try {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency,
      minimumFractionDigits: dp,
      maximumFractionDigits: dp,
    }).format(amount)
  } catch {
    return `${amount.toFixed(dp)} ${currency}`
  }
}
