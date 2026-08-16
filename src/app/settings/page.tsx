'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { RefreshCw, RotateCcw } from 'lucide-react'
import { unverifiedReferences } from '@/lib/fiqh/fiqh-references'
import { effectivePrices, effectiveRates, nisabGrams, useStore } from '@/lib/store'
import { useHydrated } from '@/lib/use-hydrated'
import { Button, Card, Eyebrow, PageHeader, money } from '@/components/ui'
import { Segmented } from '@/components/picker'
import { CurrencySelect } from '@/components/currency-select'
import { SharePanel } from '@/components/share-panel'
import { MadhhabSwitcher } from '@/components/madhhab-switcher'

export default function Settings() {
  const hydrated = useHydrated()
  const store = useStore()
  const [status, setStatus] = useState<string | null>(null)

  const prices = effectivePrices(store)
  const rates = effectiveRates(store)
  const grams = nisabGrams(store.nisabPreset)

  useEffect(() => {
    if (!hydrated || store.prices || store.offlineMode) return
    fetch(`/api/prices?currency=${store.currency}`)
      .then((r) => r.json())
      .then(store.setPrices)
      .catch(() => undefined)
  }, [hydrated, store])

  useEffect(() => {
    if (!hydrated || store.rates || store.offlineMode) return
    fetch('/api/rates')
      .then((r) => r.json())
      .then(store.setRates)
      .catch(() => undefined)
  }, [hydrated, store])

  if (!hydrated) return null


  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <PageHeader title="Settings" />

      <section>
        <h2 className="display text-xl text-ink">School</h2>
        <div className="mt-3">
          <MadhhabSwitcher />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="display text-xl text-ink">What you hold</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          Run the setup questions again to update your savings, gold and debts. Anything you added by hand on
          the Zakat page is left alone.
        </p>
        <Link href="/setup" className="mt-3 inline-block">
          <Button variant="quiet">
            <RotateCcw size={15} /> Run setup again
          </Button>
        </Link>
      </section>

      <section className="mt-10">
        <h2 className="display text-xl text-ink">Main currency</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          Everything you enter is converted into this one, and it is what your zakat is shown in.
        </p>
        <Card className="mt-3 p-5">
          <CurrencySelect value={store.currency} onChange={store.setCurrency} />
          <p className="mt-3 text-xs text-mute">
            {rates.source === 'live'
              ? `Live rates as of ${rates.asOf}, from the European Central Bank where it publishes them and cached figures for the rest.`
              : 'Using cached rates. They refresh automatically when the feed is reachable.'}
          </p>
        </Card>
      </section>

      <section className="mt-10">
        <h2 className="display text-xl text-ink">Your zakat year</h2>
        <Card className="mt-3 space-y-4 p-5">
          <label className="block text-sm">
            <span className="text-ink">When did your wealth last cross the threshold?</span>
            <input
              type="date"
              value={store.hawlStartDate}
              onChange={(e) => store.setHawlStartDate(e.target.value)}
              className="tnum mt-1.5 rounded-xl border border-hair bg-canvas px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-xs text-mute">
              Zakat falls due one lunar year (354 days) after this date.
            </span>
          </label>

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={store.dippedBelowNisab}
              onChange={(e) => store.setDipped(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="text-ink">My wealth dropped below the threshold at some point this year</span>
              <span className="mt-0.5 block text-xs text-mute">
                This restarts the year in three of the four schools. The Hanafi school only checks the start and
                end.
              </span>
            </span>
          </label>
        </Card>
      </section>

      <section className="mt-10">
        <h2 className="display text-xl text-ink">Metal prices</h2>
        <Card className="mt-3 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Eyebrow>
              {prices.source === 'manual'
                ? 'Your own figures'
                : prices.source === 'live'
                  ? 'Live spot price'
                  : 'Cached fallback'}
            </Eyebrow>
            <Button
              variant="ghost"
              onClick={() => {
                store.setPriceOverride(null)
                fetch(`/api/prices?currency=${store.currency}`)
                  .then((r) => r.json())
                  .then(store.setPrices)
                  .catch(() => setStatus('Could not reach the price feed. Using the cached figures.'))
              }}
            >
              <RefreshCw size={14} /> Refresh
            </Button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(['goldPerGram', 'silverPerGram'] as const).map((field) => (
              <label key={field} className="text-sm">
                <span className="block text-xs text-mute">
                  {field === 'goldPerGram' ? 'Gold' : 'Silver'} per gram ({store.currency})
                </span>
                <input
                  value={prices[field].toFixed(2)}
                  onChange={(e) => {
                    const value = Number.parseFloat(e.target.value)
                    if (Number.isNaN(value)) return
                    store.setPriceOverride({
                      goldPerGram: prices.goldPerGram,
                      silverPerGram: prices.silverPerGram,
                      [field]: value,
                    })
                  }}
                  inputMode="decimal"
                  className="tnum mt-1 w-full rounded-xl border border-hair bg-canvas px-3 py-2 text-sm"
                />
              </label>
            ))}
          </div>

          <div className="mt-4 grid gap-2 border-t border-hair pt-4 text-sm sm:grid-cols-2">
            <p className="text-ink-soft">
              Gold threshold ({grams.gold}g):{' '}
              <span className="tnum text-ink">{money(grams.gold * prices.goldPerGram, store.currency, 0)}</span>
            </p>
            <p className="text-ink-soft">
              Silver threshold ({grams.silver}g):{' '}
              <span className="tnum text-ink">
                {money(grams.silver * prices.silverPerGram, store.currency, 0)}
              </span>
            </p>
          </div>

          <div className="mt-5">
            <Segmented
              label="Threshold weights"
              value={store.nisabPreset}
              onChange={(v) => store.setNisabPreset(v)}
              options={[
                { value: 'precise' as const, label: '87.48g / 612.36g' },
                { value: 'rounded' as const, label: '85g / 595g' },
              ]}
            />
            <p className="mt-2 text-xs text-mute">
              Both are conversions of the same classical figures. Different bodies round them differently.
            </p>
          </div>
          {status && <p className="mt-4 text-sm text-ink-soft">{status}</p>}
        </Card>
      </section>

      <section className="mt-10">
        <h2 className="display text-xl text-ink">Privacy</h2>
        <Card className="mt-3 p-5">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={store.offlineMode}
              onChange={(e) => store.setOfflineMode(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="text-ink">Rules only, no network</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-mute">
                Classification normally falls back to a model for descriptions the rules cannot read. Only the
                merchant name is sent, with digits and punctuation already stripped — never an amount, a date or
                an account number. Turn this on and nothing leaves the device at all.
              </span>
            </span>
          </label>
        </Card>
      </section>

      <section className="mt-10">
        <SharePanel />
      </section>

      <section className="mt-10">
        <h2 className="display text-xl text-ink">Where the rulings come from</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          Reference only, nothing to do here. Rulings that rest on an explicit primary text agreed by all four
          schools are treated as settled. The ones listed below are school-specific positions, so they carry an
          &ldquo;awaiting scholarly review&rdquo; badge wherever they appear until your own scholar confirms
          them.
        </p>
        <Card className="mt-3 divide-y divide-hair">
          {unverifiedReferences().map(({ key, citation }) => (
            <div key={key} className="p-4">
              <p className="text-sm font-medium text-ink">{citation.source}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{citation.note}</p>
            </div>
          ))}
        </Card>
      </section>
    </div>
  )
}
