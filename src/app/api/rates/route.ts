import { NextResponse } from 'next/server'
import { CURRENCY_CODES, FALLBACK_RATES, type Rates } from '@/lib/currency'

/**
 * Multi-provider exchange rate feed.
 * Primary: open.er-api.com (160+ currencies, updated daily, free, no API key required)
 * Secondary: api.frankfurter.app (ECB European Central Bank rates)
 * Fallback: cached table
 */
async function fetchFromOpenErApi(): Promise<Record<string, number> | null> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: AbortSignal.timeout(3000),
      next: { revalidate: 3600 }, // 1 hour edge cache
    })
    if (!res.ok) return null
    const data = (await res.json()) as { rates?: Record<string, number> }
    return data.rates && Object.keys(data.rates).length > 0 ? data.rates : null
  } catch {
    return null
  }
}

async function fetchFromFrankfurter(): Promise<Record<string, number> | null> {
  try {
    const symbols = CURRENCY_CODES.filter((c) => c !== 'USD').join(',')
    const res = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${symbols}`, {
      signal: AbortSignal.timeout(3000),
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { rates?: Record<string, number> }
    return data.rates && Object.keys(data.rates).length > 0 ? data.rates : null
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const liveRates = (await fetchFromOpenErApi()) || (await fetchFromFrankfurter())

    if (liveRates) {
      const rates: Rates = {
        base: 'USD',
        asOf: new Date().toISOString().slice(0, 10),
        source: 'live',
        rates: { ...FALLBACK_RATES.rates, ...liveRates, USD: 1 },
      }

      return NextResponse.json(rates, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      })
    }
  } catch {
    // Fallback below
  }

  return NextResponse.json(
    { ...FALLBACK_RATES, asOf: new Date().toISOString().slice(0, 10) },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    }
  )
}
