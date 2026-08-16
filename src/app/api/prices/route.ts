import { NextResponse } from 'next/server'
import type { MetalPrices } from '@/lib/types'
import { FALLBACK_RATES } from '@/lib/currency'

const GRAMS_PER_TROY_OUNCE = 31.1034768

/**
 * Baseline fallback prices per gram in primary currencies (used if all live feeds are unreachable).
 */
const BASELINE_PRICES_PER_GRAM: Record<string, { goldPerGram: number; silverPerGram: number }> = {
  CAD: { goldPerGram: 176.0, silverPerGram: 2.2 },
  USD: { goldPerGram: 128.6, silverPerGram: 1.61 },
  GBP: { goldPerGram: 101.0, silverPerGram: 1.26 },
  EUR: { goldPerGram: 118.0, silverPerGram: 1.48 },
  AUD: { goldPerGram: 195.0, silverPerGram: 2.45 },
  SAR: { goldPerGram: 482.0, silverPerGram: 6.04 },
  AED: { goldPerGram: 472.0, silverPerGram: 5.91 },
  PKR: { goldPerGram: 35750.0, silverPerGram: 448.0 },
  INR: { goldPerGram: 10738.0, silverPerGram: 134.4 },
  BDT: { goldPerGram: 15175.0, silverPerGram: 190.0 },
  MYR: { goldPerGram: 604.0, silverPerGram: 7.57 },
  IDR: { goldPerGram: 2057600.0, silverPerGram: 25760.0 },
  EGP: { goldPerGram: 6172.0, silverPerGram: 77.3 },
  TRY: { goldPerGram: 4372.0, silverPerGram: 54.7 },
  NGN: { goldPerGram: 192900.0, silverPerGram: 2415.0 },
  ZAR: { goldPerGram: 2379.0, silverPerGram: 29.8 },
}

/**
 * Provider 1: gold-api.com
 */
async function fetchFromGoldApi(): Promise<{ goldUsdOz: number; silverUsdOz: number } | null> {
  try {
    const [resGold, resSilver] = await Promise.all([
      fetch('https://api.gold-api.com/price/XAU', {
        headers: { 'User-Agent': 'MizanZakat/1.0' },
        signal: AbortSignal.timeout(3000),
        next: { revalidate: 300 }, // Cache on Vercel for 5 minutes
      }),
      fetch('https://api.gold-api.com/price/XAG', {
        headers: { 'User-Agent': 'MizanZakat/1.0' },
        signal: AbortSignal.timeout(3000),
        next: { revalidate: 300 },
      }),
    ])

    if (!resGold.ok || !resSilver.ok) return null
    const dataGold = (await resGold.json()) as { price?: number }
    const dataSilver = (await resSilver.json()) as { price?: number }

    if (
      typeof dataGold.price === 'number' &&
      dataGold.price > 0 &&
      typeof dataSilver.price === 'number' &&
      dataSilver.price > 0
    ) {
      return { goldUsdOz: dataGold.price, silverUsdOz: dataSilver.price }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Provider 2: goldprice.org spot feed
 */
async function fetchFromGoldPriceOrg(): Promise<{ goldUsdOz: number; silverUsdOz: number } | null> {
  try {
    const res = await fetch('https://data-asg.goldprice.org/dbXRates/USD', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(3000),
      next: { revalidate: 300 },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { items?: { xauPrice?: number; xagPrice?: number }[] }
    const item = data.items?.[0]
    if (item && typeof item.xauPrice === 'number' && typeof item.xagPrice === 'number') {
      return { goldUsdOz: item.xauPrice, silverUsdOz: item.xagPrice }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Provider 3: Fawaz Ahmed currency and spot metals API (jsDelivr CDN backup)
 */
async function fetchFromCurrencyCdn(): Promise<{ goldUsdOz: number; silverUsdOz: number } | null> {
  try {
    const res = await fetch(
      'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
      {
        signal: AbortSignal.timeout(3000),
        next: { revalidate: 600 },
      }
    )
    if (!res.ok) return null
    const data = (await res.json()) as { usd?: Record<string, number> }
    const xau = data.usd?.xau // 1 USD = x XAU
    const xag = data.usd?.xag // 1 USD = x XAG
    if (xau && xag && xau > 0 && xag > 0) {
      // 1 / x gives USD per troy ounce
      return { goldUsdOz: 1 / xau, silverUsdOz: 1 / xag }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Live Spot Rate Resolver: queries multi-source spot APIs in priority order.
 */
async function getLiveSpotUsd(): Promise<{ goldUsdOz: number; silverUsdOz: number } | null> {
  const p1 = await fetchFromGoldApi()
  if (p1) return p1

  const p2 = await fetchFromGoldPriceOrg()
  if (p2) return p2

  const p3 = await fetchFromCurrencyCdn()
  if (p3) return p3

  return null
}

/**
 * Fetch live USD to target currency exchange rate.
 */
async function getExchangeRateTo(targetCurrency: string): Promise<number> {
  if (targetCurrency === 'USD') return 1

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/USD`, {
      signal: AbortSignal.timeout(3000),
      next: { revalidate: 3600 }, // 1 hour cache
    })
    if (res.ok) {
      const data = (await res.json()) as { rates?: Record<string, number> }
      if (data.rates && typeof data.rates[targetCurrency] === 'number') {
        return data.rates[targetCurrency]
      }
    }
  } catch {
    // fallback below
  }

  return FALLBACK_RATES.rates[targetCurrency] ?? 1
}

export async function GET(request: Request) {
  const currency = (new URL(request.url).searchParams.get('currency') ?? 'CAD').toUpperCase()
  const fallback = BASELINE_PRICES_PER_GRAM[currency] ?? BASELINE_PRICES_PER_GRAM.CAD

  try {
    const [spotUsd, exchangeRate] = await Promise.all([
      getLiveSpotUsd(),
      getExchangeRateTo(currency),
    ])

    if (spotUsd) {
      const goldPerGramUsd = spotUsd.goldUsdOz / GRAMS_PER_TROY_OUNCE
      const silverPerGramUsd = spotUsd.silverUsdOz / GRAMS_PER_TROY_OUNCE

      const prices: MetalPrices = {
        goldPerGram: Number((goldPerGramUsd * exchangeRate).toFixed(2)),
        silverPerGram: Number((silverPerGramUsd * exchangeRate).toFixed(2)),
        currency,
        asOf: new Date().toISOString(),
        source: 'live',
      }

      return NextResponse.json(prices, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      })
    }
  } catch {
    // Fallback to baseline
  }

  const fallbackPrices: MetalPrices = {
    goldPerGram: fallback.goldPerGram,
    silverPerGram: fallback.silverPerGram,
    currency,
    asOf: new Date().toISOString(),
    source: 'cached',
  }

  return NextResponse.json(fallbackPrices, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
