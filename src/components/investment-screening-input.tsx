'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  POPULAR_INVESTMENT_PRESETS,
  screenInvestment,
  type InvestmentHolding,
  type ShariahInvestmentStatus,
} from '@/lib/fiqh/investments'
import { money } from './ui'

export function InvestmentScreeningInput({
  value,
  onChangeValue,
  currency,
}: {
  value: string
  onChangeValue: (val: string) => void
  currency: string
}) {
  const [mode, setMode] = useState<'simple' | 'portfolio'>('simple')
  const [holdings, setHoldings] = useState<InvestmentHolding[]>([
    {
      id: 'inv-1',
      name: 'SP Funds S&P 500 Sharia ETF (SPUS)',
      ticker: 'SPUS',
      marketValue: Number.parseFloat(value) || 0,
      shariahStatus: 'halal',
      halalRatio: 1.0,
      purificationRatio: 0.0,
      annualDividend: 0,
      purificationDue: 0,
      notes: 'Certified Shariah-compliant US large-cap equities.',
    },
  ])

  function updateHoldings(newHoldings: InvestmentHolding[]) {
    setHoldings(newHoldings)
    const totalVal = newHoldings.reduce((sum, h) => sum + (h.marketValue || 0), 0)
    onChangeValue(totalVal > 0 ? totalVal.toFixed(2).replace(/\.00$/, '') : '')
  }

  function addPresetHolding(ticker: string) {
    const preset = screenInvestment(ticker, 0, 0)
    updateHoldings([...holdings, preset])
  }

  function addCustomHolding() {
    const nextIdx = holdings.length + 1
    const newH: InvestmentHolding = {
      id: `inv-${Date.now()}`,
      name: `Investment Holding ${nextIdx}`,
      marketValue: 0,
      shariahStatus: 'mixed',
      halalRatio: 0.96, // Default 96% halal, 4% purification
      purificationRatio: 0.04,
      annualDividend: 0,
      purificationDue: 0,
      notes: '96% Halal revenue (4% dividend purification required).',
    }
    updateHoldings([...holdings, newH])
  }

  function removeHolding(id: string) {
    if (holdings.length <= 1) {
      updateHoldings([{ ...holdings[0], marketValue: 0 }])
      return
    }
    updateHoldings(holdings.filter((h) => h.id !== id))
  }

  function updateHolding(id: string, patch: Partial<InvestmentHolding>) {
    const next = holdings.map((h) => {
      if (h.id !== id) return h
      const updated = { ...h, ...patch }
      if ('halalRatio' in patch) {
        updated.purificationRatio = Math.max(0, 1 - (patch.halalRatio ?? 1))
      }
      if ('annualDividend' in patch || 'halalRatio' in patch) {
        const div = updated.annualDividend || 0
        updated.purificationDue = div * updated.purificationRatio
      }
      return updated
    })
    updateHoldings(next)
  }

  const totalMarketVal = holdings.reduce((s, h) => s + (h.marketValue || 0), 0)
  const totalHalalVal = holdings.reduce((s, h) => s + (h.marketValue || 0) * h.halalRatio, 0)
  const totalPurification = holdings.reduce((s, h) => s + (h.purificationDue || 0), 0)

  return (
    <div className="space-y-5">
      {/* Mode Switcher */}
      <div className="flex items-center justify-between border-b border-hair pb-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode('simple')}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              mode === 'simple'
                ? 'bg-deep text-white shadow-sm'
                : 'text-ink-soft hover:bg-paper hover:text-ink'
            }`}
          >
            Simple Total
          </button>
          <button
            type="button"
            onClick={() => setMode('portfolio')}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              mode === 'portfolio'
                ? 'bg-deep text-white shadow-sm'
                : 'text-ink-soft hover:bg-paper hover:text-ink'
            }`}
          >
            + Portfolio Screener ({holdings.length})
          </button>
        </div>

        <span className="text-[11px] text-mute">AAOIFI Screening &amp; Purification</span>
      </div>

      {mode === 'simple' ? (
        /* Simple Amount Input */
        <div className="space-y-4">
          <div className="flex items-baseline justify-center gap-2 border-b-2 border-hair pb-4 transition-colors focus-within:border-deep">
            <span className="shrink-0 text-3xl font-light text-mute">$</span>
            <input
              autoFocus
              value={value}
              onChange={(e) => onChangeValue(e.target.value.replace(/[^0-9.]/g, ''))}
              inputMode="decimal"
              placeholder="0"
              aria-label="Investments and savings value"
              size={Math.max(1, value.length || 1)}
              className="tnum display w-auto bg-transparent p-0 text-center text-5xl leading-none text-ink outline-none placeholder:text-hair sm:text-6xl"
            />
            <span className="shrink-0 text-xl font-medium text-mute">{currency}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            {[1000, 5000, 10000, 25000, 50000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => {
                  const curr = Number.parseFloat(value) || 0
                  onChangeValue((curr + amt).toFixed(0))
                }}
                className="rounded-full border border-hair bg-paper px-3 py-1 text-xs font-medium text-ink transition-colors hover:border-ink-soft/40 hover:bg-canvas active:scale-95"
              >
                +{money(amt, currency, 0)}
              </button>
            ))}
            {Number.parseFloat(value) > 0 && (
              <button
                type="button"
                onClick={() => onChangeValue('')}
                className="rounded-full border border-hair bg-paper px-2.5 py-1 text-xs text-mute hover:text-haram"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Multi-Holding Portfolio Screener */
        <div className="space-y-3.5">
          {/* Quick Preset Chips */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-mute uppercase tracking-wider">
              Quick Add Popular Funds &amp; Equities:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {['SPUS', 'HLAL', 'WSHR', 'AAPL', 'VOO', 'QQQ'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => addPresetHolding(t)}
                  className="rounded-full border border-hair bg-paper px-2.5 py-1 text-xs font-medium text-ink hover:border-gold-ink hover:bg-gold-wash/30 transition-colors"
                >
                  +{t}
                </button>
              ))}
            </div>
          </div>

          {/* Holdings List */}
          <div className="space-y-3">
            {holdings.map((h, idx) => (
              <div
                key={h.id}
                className="flex flex-col gap-2.5 rounded-2xl border border-hair bg-paper p-3.5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={h.name}
                    onChange={(e) => updateHolding(h.id, { name: e.target.value })}
                    placeholder={`Holding ${idx + 1}`}
                    className="text-xs font-semibold text-ink bg-transparent outline-none focus:underline w-full max-w-[70%]"
                  />
                  <button
                    type="button"
                    onClick={() => removeHolding(h.id)}
                    aria-label={`Remove ${h.name}`}
                    className="text-mute hover:text-haram p-1"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="grid grid-cols-12 gap-2 items-center">
                  {/* Market Value */}
                  <div className="col-span-6 flex items-center border border-hair rounded-xl px-2.5 py-1.5 bg-canvas focus-within:border-deep">
                    <span className="text-xs text-mute mr-1">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={h.marketValue || ''}
                      onChange={(e) =>
                        updateHolding(h.id, {
                          marketValue: Number.parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0,
                        })
                      }
                      placeholder="Market value"
                      className="tnum text-xs font-semibold text-ink bg-transparent outline-none w-full"
                    />
                  </div>

                  {/* Shariah Status Selector */}
                  <div className="col-span-6">
                    <select
                      value={h.shariahStatus}
                      onChange={(e) => {
                        const status = e.target.value as ShariahInvestmentStatus
                        const halalRatio = status === 'halal' ? 1.0 : status === 'haram' ? 0 : 0.96
                        updateHolding(h.id, { shariahStatus: status, halalRatio })
                      }}
                      className="w-full rounded-xl border border-hair bg-paper px-2 py-1.5 text-xs font-medium text-ink outline-none"
                    >
                      <option value="halal">100% Halal Compliant</option>
                      <option value="mixed">Mixed (Purification Req.)</option>
                      <option value="haram">Haram (100% Disposal)</option>
                      <option value="tentative">Tentative / Unscreened</option>
                    </select>
                  </div>
                </div>

                {/* Mixed Income Halal Percentage & Dividend Purification */}
                {h.shariahStatus === 'mixed' && (
                  <div className="rounded-xl bg-canvas p-2.5 border border-hair/80 text-[11px] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-ink-soft">
                        Halal Portion:{' '}
                        <strong className="text-halal">{(h.halalRatio * 100).toFixed(0)}%</strong>
                      </span>
                      <span className="text-mute">
                        Purification:{' '}
                        <strong className="text-haram">
                          {((1 - h.halalRatio) * 100).toFixed(0)}%
                        </strong>
                      </span>
                    </div>

                    <input
                      type="range"
                      min="50"
                      max="99"
                      step="1"
                      value={Math.round(h.halalRatio * 100)}
                      onChange={(e) =>
                        updateHolding(h.id, { halalRatio: Number.parseInt(e.target.value) / 100 })
                      }
                      className="w-full accent-deep cursor-pointer"
                    />

                    <div className="flex items-center justify-between pt-1 border-t border-hair/50">
                      <span className="text-mute">Annual Dividend (optional):</span>
                      <div className="flex items-center gap-1 w-28 border border-hair rounded-lg px-2 py-0.5 bg-paper">
                        <span className="text-mute">$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={h.annualDividend || ''}
                          onChange={(e) =>
                            updateHolding(h.id, {
                              annualDividend:
                                Number.parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0,
                            })
                          }
                          placeholder="0"
                          className="tnum text-xs text-ink bg-transparent outline-none w-full"
                        />
                      </div>
                    </div>

                    {h.purificationDue > 0 && (
                      <p className="text-haram font-medium text-right">
                        Purification Due: {money(h.purificationDue, currency, 2)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addCustomHolding}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-hair py-2.5 text-xs font-medium text-ink-soft hover:border-ink-soft/40 hover:bg-paper transition-all"
          >
            <Plus size={14} /> Add Another Investment Holding
          </button>
        </div>
      )}

      {/* Portfolio Summary Card */}
      <div className="rounded-2xl border border-hair bg-paper p-4 text-center space-y-1.5 shadow-sm">
        <div className="flex items-baseline justify-center gap-2">
          <span className="eyebrow text-mute">Total Investment Value:</span>
          <span className="display text-2xl font-semibold text-ink">
            {money(totalMarketVal || Number.parseFloat(value) || 0, currency, 2)}
          </span>
        </div>

        {totalPurification > 0 && (
          <div className="rounded-xl bg-haram/5 border border-haram/20 p-2 text-xs text-haram">
            <strong>{money(totalPurification, currency, 2)}</strong> dividend purification must be separated &amp; donated to charity.
          </div>
        )}
      </div>
    </div>
  )
}
