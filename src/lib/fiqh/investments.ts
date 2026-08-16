export type ShariahInvestmentStatus = 'halal' | 'mixed' | 'haram' | 'tentative'

export type InvestmentHolding = {
  id: string
  name: string
  ticker?: string
  marketValue: number
  shariahStatus: ShariahInvestmentStatus
  /** Proportion (0 to 1) of the investment that complies with Shariah standards. Default 1.0 for Halal */
  halalRatio: number
  /** Proportion (0 to 1) of non-compliant revenue (e.g. 0.04 for 4% purification) */
  purificationRatio: number
  /** Estimated or actual annual dividend received */
  annualDividend?: number
  /** Amount to be purified and disposed of to charity: annualDividend * purificationRatio */
  purificationDue: number
  notes?: string
}

export type TickerPreset = {
  ticker: string
  name: string
  shariahStatus: ShariahInvestmentStatus
  halalPct: number
  notes: string
}

export const POPULAR_INVESTMENT_PRESETS: TickerPreset[] = [
  {
    ticker: 'SPUS',
    name: 'SP Funds S&P 500 Sharia ETF',
    shariahStatus: 'halal',
    halalPct: 100,
    notes: 'Certified Shariah-compliant US large-cap equities (AAOIFI screened).',
  },
  {
    ticker: 'HLAL',
    name: 'Wahed FTSE USA Shariah ETF',
    shariahStatus: 'halal',
    halalPct: 100,
    notes: 'Certified Shariah-compliant US equities index fund.',
  },
  {
    ticker: 'UMMA',
    name: 'Wahed Dow Jones Islamic World ETF',
    shariahStatus: 'halal',
    halalPct: 100,
    notes: 'Global Shariah-compliant equities excluding US.',
  },
  {
    ticker: 'WSHR',
    name: 'Wealthsimple Shariah World Equity ETF',
    shariahStatus: 'halal',
    halalPct: 100,
    notes: 'Canadian TSX-listed global Shariah-compliant portfolio.',
  },
  {
    ticker: 'ISUS',
    name: 'iShares MSCI USA Islamic UCITS ETF',
    shariahStatus: 'halal',
    halalPct: 100,
    notes: 'Shariah-compliant US equities tracking MSCI Islamic Index.',
  },
  {
    ticker: 'SPSK',
    name: 'SP Funds Dow Jones Global Sukuk ETF',
    shariahStatus: 'halal',
    halalPct: 100,
    notes: 'Islamic fixed-income Sukuk portfolio.',
  },
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    shariahStatus: 'halal',
    halalPct: 97,
    notes: 'Shariah screened. ~3% non-operating cash interest purification recommended.',
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft Corporation',
    shariahStatus: 'halal',
    halalPct: 98,
    notes: 'Shariah screened. ~2% interest income purification recommended.',
  },
  {
    ticker: 'TSLA',
    name: 'Tesla Inc.',
    shariahStatus: 'halal',
    halalPct: 100,
    notes: 'Shariah compliant automotive & clean energy manufacturing.',
  },
  {
    ticker: 'VOO',
    name: 'Vanguard S&P 500 ETF',
    shariahStatus: 'mixed',
    halalPct: 95,
    notes: 'Broad market index containing ~5% non-compliant sector revenues. 5% dividend purification required.',
  },
  {
    ticker: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    shariahStatus: 'mixed',
    halalPct: 95,
    notes: 'Broad market index fund. 5% dividend purification required.',
  },
  {
    ticker: 'VTI',
    name: 'Vanguard Total Stock Market ETF',
    shariahStatus: 'mixed',
    halalPct: 94,
    notes: 'All-cap US equities with ~6% non-compliant financial/debt revenue.',
  },
  {
    ticker: 'QQQ',
    name: 'Invesco QQQ Trust (Nasdaq 100)',
    shariahStatus: 'mixed',
    halalPct: 96,
    notes: 'Tech-heavy index with ~4% purification on mixed revenues.',
  },
  {
    ticker: 'RY',
    name: 'Royal Bank of Canada (Conventional Banking)',
    shariahStatus: 'haram',
    halalPct: 0,
    notes: 'Conventional interest-based banking. 100% of dividends and gains must be disposed of.',
  },
  {
    ticker: 'TD',
    name: 'TD Bank (Conventional Banking)',
    shariahStatus: 'haram',
    halalPct: 0,
    notes: 'Conventional interest-based banking. 100% impermissible.',
  },
  {
    ticker: 'JPM',
    name: 'JPMorgan Chase & Co.',
    shariahStatus: 'haram',
    halalPct: 0,
    notes: 'Conventional banking & financial derivatives. 100% impermissible.',
  },
]

/**
 * Screens an investment name or ticker against known Shariah guidelines.
 */
export function screenInvestment(
  query: string,
  marketValue = 0,
  annualDividend = 0
): InvestmentHolding {
  const clean = query.trim().toUpperCase()
  const match = POPULAR_INVESTMENT_PRESETS.find(
    (p) => p.ticker === clean || query.toLowerCase().includes(p.name.toLowerCase()) || query.toLowerCase().includes(p.ticker.toLowerCase())
  )

  if (match) {
    const purificationRatio = (100 - match.halalPct) / 100
    const purificationDue = annualDividend * purificationRatio

    return {
      id: `inv-${Date.now()}-${match.ticker}`,
      name: match.name,
      ticker: match.ticker,
      marketValue,
      shariahStatus: match.shariahStatus,
      halalRatio: match.halalPct / 100,
      purificationRatio,
      annualDividend,
      purificationDue,
      notes: match.notes,
    }
  }

  // Check for common halal/haram keyword signals
  const lower = query.toLowerCase()
  let status: ShariahInvestmentStatus = 'tentative'
  let halalPct = 100
  let notes = 'Unscreened investment. Review company revenue breakdown.'

  if (lower.includes('halal') || lower.includes('sharia') || lower.includes('islamic') || lower.includes('sukuk')) {
    status = 'halal'
    halalPct = 100
    notes = 'Identified as Shariah-screened investment.'
  } else if (
    lower.includes('bank') ||
    lower.includes('casino') ||
    lower.includes('gambling') ||
    lower.includes('brewery') ||
    lower.includes('tobacco') ||
    lower.includes('alcohol')
  ) {
    status = 'haram'
    halalPct = 0
    notes = 'Core business revenue is in an impermissible sector.'
  } else if (lower.includes('index') || lower.includes('etf') || lower.includes('fund') || lower.includes('s&p')) {
    status = 'mixed'
    halalPct = 95
    notes = 'Conventional broad fund. Standard 5% dividend purification applied.'
  }

  const purificationRatio = (100 - halalPct) / 100
  const purificationDue = annualDividend * purificationRatio

  return {
    id: `inv-${Date.now()}`,
    name: query.trim() || 'Custom Investment Holding',
    marketValue,
    shariahStatus: status,
    halalRatio: halalPct / 100,
    purificationRatio,
    annualDividend,
    purificationDue,
    notes,
  }
}

/**
 * Calculates total purification required for an investment portfolio.
 */
export function calculatePortfolioPurification(holdings: InvestmentHolding[]): {
  totalMarketValue: number
  totalHalalValue: number
  totalPurificationDue: number
} {
  return holdings.reduce(
    (acc, h) => {
      acc.totalMarketValue += h.marketValue
      acc.totalHalalValue += h.marketValue * h.halalRatio
      acc.totalPurificationDue += h.purificationDue || 0
      return acc
    },
    { totalMarketValue: 0, totalHalalValue: 0, totalPurificationDue: 0 }
  )
}
