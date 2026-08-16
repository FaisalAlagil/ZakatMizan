'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Play, Printer, Sparkles, Trash2 } from 'lucide-react'
import type { AssetKind, Madhhab } from '@/lib/types'
import { MADHHABS } from '@/lib/types'
import { MADHHAB_PROFILES } from '@/lib/fiqh/madhhab-profiles'
import { HACKATHON_TEST_CASES, type HackathonTestCase } from '@/lib/fiqh/test-cases'
import { effectiveRates, useStore } from '@/lib/store'
import { convert } from '@/lib/currency'
import { useZakat } from '@/lib/use-zakat'
import { useHydrated } from '@/lib/use-hydrated'
import { Button, Card, Eyebrow, PageHeader, Source, money } from '@/components/ui'
import { ListPicker, Segmented } from '@/components/picker'
import { CurrencySelect } from '@/components/currency-select'

const KINDS: { value: AssetKind; label: string; unit: 'currency' | 'grams' }[] = [
  { value: 'cash', label: 'Cash and bank balances', unit: 'currency' },
  { value: 'gold', label: 'Gold bullion / bars / coins', unit: 'grams' },
  { value: 'personal_jewelry', label: 'Personal jewelry (worn / adornment)', unit: 'grams' },
  { value: 'silver', label: 'Silver bars / coins / jewelry', unit: 'grams' },
  { value: 'business_inventory', label: 'Business merchandise / stock for sale', unit: 'currency' },
  { value: 'receivable', label: 'Money owed to you (expected repayment)', unit: 'currency' },
  { value: 'crypto', label: 'Cryptocurrency holdings', unit: 'currency' },
  { value: 'investment', label: 'Halal shares, ETFs, and funds', unit: 'currency' },
  { value: 'retirement', label: 'RRSP / TFSA / accessible savings', unit: 'currency' },
]

export default function Zakat() {
  const hydrated = useHydrated()
  const store = useStore()
  const { result, all } = useZakat()
  const rates = effectiveRates(store)
  const [kind, setKind] = useState<AssetKind>('cash')
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [pickedCurrency, setPickedCurrency] = useState<string | null>(null)
  const [activeTestCase, setActiveTestCase] = useState<string | null>(null)

  if (!hydrated) return null

  const assetCurrency = pickedCurrency ?? store.currency
  const unit = KINDS.find((k) => k.value === kind)!.unit
  const profile = MADHHAB_PROFILES[store.madhhab]
  const pool = result.pools[0]

  function applyTestCase(tc: HackathonTestCase) {
    setActiveTestCase(tc.id)
    store.setHawlStartDate(tc.hawlStartDate)
    store.setDipped(tc.dippedBelowNisab)
    store.replaceTransactions(tc.transactions)
    store.replaceSetupData(store.madhhab, tc.assets, tc.liabilities)
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <PageHeader
        title="Zakat & Statement"
        lead={`Calculated strictly according to ${profile.label} school rules. Zakat is 2.5% of net qualifying wealth held for a complete lunar year (Hawl).`}
        action={
          <div className="flex gap-2">
            <Button variant="quiet" onClick={() => window.print()}>
              <Printer size={15} /> Print Statement
            </Button>
          </div>
        }
      />

      {/* Final Results Summary Card */}
      <section className="mb-8 overflow-hidden rounded-card border border-hair bg-paper p-6 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="rounded-full bg-gold-wash px-2.5 py-0.5 text-xs font-semibold text-gold-ink">
            {profile.label} Madhhab Statement
          </span>
          <p className="text-xs text-mute">
            {result.hawl.complete
              ? `Hawl Complete (Due since ${result.hawl.hijriDue})`
              : `${result.hawl.daysRemaining} days remaining in Hawl`}
          </p>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-canvas p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-mute">Estimated Zakat Due (2.5%)</p>
            <p className="tnum display mt-1 text-4xl text-ink">
              {money(result.zakatDue || result.projectedZakat, result.currency)}
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              {result.meetsNisab
                ? `Assessed on ${money(result.zakatableBase, result.currency)} net zakatable wealth.`
                : 'Wealth is below the Nisab threshold this year.'}
            </p>
          </div>

          <div className="rounded-2xl bg-canvas p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-mute">Purification Due (Not Zakat)</p>
            <p className="tnum display mt-1 text-4xl text-haram">
              {money(result.purificationDue, result.currency)}
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              Haram &amp; non-permissible mixed portions separated for disposal.
            </p>
          </div>
        </div>

        {pool && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-hair pt-4 text-xs text-ink-soft">
            <div>
              <span className="font-medium text-ink">Nisab Threshold ({pool.nisabBasis}): </span>
              <span className="tnum font-semibold text-ink">{money(pool.nisabValue, result.currency, 0)} CAD</span>
            </div>
            <div>
              <span className="font-medium text-ink">Status: </span>
              <span className={result.meetsNisab ? 'font-semibold text-halal' : 'text-mute'}>
                {result.meetsNisab ? 'Above Nisab (Obligation active)' : 'Below Nisab (No zakat due)'}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Interactive Hackathon Test Cases Loader */}
      <section className="mb-10 rounded-card border border-gold/30 bg-gold-wash/20 p-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gold-ink">
              Hackathon Evaluation: Pre-Built Test Cases
            </p>
            <p className="text-xs text-ink-soft">
              Click any scenario to instantly load test data and verify the calculation breakdown:
            </p>
          </div>
          <Link href="/submission#test-cases" className="text-xs font-medium text-gold-ink underline">
            Full breakdowns
          </Link>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {Object.values(HACKATHON_TEST_CASES).map((tc) => {
            const active = activeTestCase === tc.id
            return (
              <button
                key={tc.id}
                onClick={() => applyTestCase(tc)}
                className={`rounded-xl border p-3 text-left transition-all active:scale-[0.98] ${
                  active
                    ? 'border-deep bg-deep text-white shadow-sm'
                    : 'border-hair bg-paper hover:bg-canvas text-ink'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">{tc.category}</p>
                  <Play size={12} className={active ? 'text-gold' : 'text-mute'} />
                </div>
                <p className={`mt-1 text-[11px] line-clamp-2 ${active ? 'text-white/75' : 'text-ink-soft'}`}>
                  {tc.subtitle}
                </p>
              </button>
            )
          })}
        </div>
      </section>

      {/* What You Hold (Assets) */}
      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="display text-xl text-ink">What you hold (Assets)</h2>
          <p className="text-xs text-mute">Counted towards qualifying wealth</p>
        </div>

        <Card className="mt-3 p-5">
          <form
            className="grid gap-3 sm:grid-cols-[1fr_1fr_8rem]"
            onSubmit={(e) => {
              e.preventDefault()
              const value = Number.parseFloat(amount)
              if (Number.isNaN(value) || !label.trim()) return
              store.addAsset({
                id: `a-${Date.now()}`,
                kind,
                label: label.trim(),
                amount: value,
                ...(unit === 'currency' ? { currency: assetCurrency } : {}),
                ...(kind === 'business_inventory' ? { traderType: 'mudir' as const } : {}),
                ...(kind === 'retirement' ? { accessible: true } : {}),
              })
              setLabel('')
              setAmount('')
            }}
          >
            <div className="sm:col-span-3">
              <ListPicker
                label="Asset Category"
                value={kind}
                onChange={setKind}
                options={KINDS.map((k) => ({ value: k.value, label: k.label }))}
              />
            </div>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Description (e.g. Scotiabank chequing)"
              className="rounded-xl border border-hair bg-canvas px-3 py-2 text-sm placeholder:text-mute"
            />
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder={unit === 'grams' ? 'grams' : assetCurrency}
              className="tnum rounded-xl border border-hair bg-canvas px-3 py-2 text-sm placeholder:text-mute"
            />
            {unit === 'currency' && (
              <div className="sm:col-span-3">
                <CurrencySelect value={assetCurrency} onChange={setPickedCurrency} />
              </div>
            )}
            <Button type="submit" className="sm:col-span-3 sm:justify-self-start">
              Add Asset
            </Button>
          </form>

          {store.assets.length > 0 && (
            <ul className="mt-4 divide-y divide-hair border-t border-hair">
              {store.assets.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{a.label}</span>

                  {a.kind === 'business_inventory' && (
                    <Segmented
                      size="sm"
                      value={a.traderType ?? 'mudir'}
                      onChange={(traderType) => {
                        store.removeAsset(a.id)
                        store.addAsset({ ...a, traderType })
                      }}
                      options={[
                        { value: 'mudir' as const, label: 'selling (active)' },
                        { value: 'muhtakir' as const, label: 'holding (resale)' },
                      ]}
                    />
                  )}

                  {a.kind === 'retirement' && (
                    <Segmented
                      size="sm"
                      value={a.accessible === false ? 'locked' : 'open'}
                      onChange={(v) => {
                        store.removeAsset(a.id)
                        store.addAsset({ ...a, accessible: v === 'open' })
                      }}
                      options={[
                        { value: 'open' as const, label: 'accessible' },
                        { value: 'locked' as const, label: 'locked in' },
                      ]}
                    />
                  )}

                  <span className="tnum w-32 text-right text-sm text-ink-soft">
                    {a.kind === 'gold' || a.kind === 'silver' || a.kind === 'personal_jewelry' ? (
                      `${a.amount} g`
                    ) : (
                      <>
                        {money(a.amount, a.currency ?? store.currency, 0)}
                        {a.currency && a.currency !== store.currency && (
                          <span className="block text-xs text-mute">
                            {money(convert(a.amount, a.currency, store.currency, rates), store.currency, 0)}
                          </span>
                        )}
                      </>
                    )}
                  </span>
                  <button
                    onClick={() => store.removeAsset(a.id)}
                    aria-label={`Remove ${a.label}`}
                    className="text-mute hover:text-haram"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* What You Owe (Debts) */}
      <section className="mt-8">
        <h2 className="display text-xl text-ink">What you owe (Debts)</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {profile.debtDeduction.explain}
        </p>
        <Card className="mt-3 p-5">
          <form
            className="grid gap-3 sm:grid-cols-[1fr_10rem]"
            onSubmit={(e) => {
              e.preventDefault()
              const data = new FormData(e.currentTarget)
              const name = String(data.get('label') ?? '').trim()
              const due = Number.parseFloat(String(data.get('due') ?? ''))
              if (!name || Number.isNaN(due)) return
              store.addLiability({ id: `l-${Date.now()}`, label: name, amount: due, dueWithinYear: due })
              e.currentTarget.reset()
            }}
          >
            <input
              name="label"
              placeholder="Credit card, car loan, rent due…"
              className="rounded-xl border border-hair bg-canvas px-3 py-2 text-sm placeholder:text-mute"
            />
            <input
              name="due"
              inputMode="decimal"
              placeholder="Due this year (CAD)"
              className="tnum rounded-xl border border-hair bg-canvas px-3 py-2 text-sm placeholder:text-mute"
            />
            <Button type="submit" className="sm:col-span-2 sm:justify-self-start">
              Add Debt
            </Button>
          </form>

          {store.liabilities.length > 0 && (
            <ul className="mt-4 divide-y divide-hair border-t border-hair">
              {store.liabilities.map((l) => (
                <li key={l.id} className="flex items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{l.label}</span>
                  <span className="tnum text-sm text-ink-soft">{money(l.dueWithinYear, store.currency, 0)}</span>
                  <button
                    onClick={() => store.removeLiability(l.id)}
                    aria-label={`Remove ${l.label}`}
                    className="text-mute hover:text-haram"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {profile.debtDeduction.value === 'none' && store.liabilities.length > 0 && (
            <p className="mt-4 rounded-md bg-canvas p-3 text-xs leading-relaxed text-ink-soft">
              On the dominant {profile.label} view these debts are recorded for personal tracking but not deducted from zakatable wealth. {profile.debtDeduction.explain}
            </p>
          )}
        </Card>
      </section>

      {/* Step-by-Step Calculation Trace */}
      <section className="mt-10">
        <h2 className="display text-xl text-ink">Step-by-Step Calculation Breakdown</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Complete transparent trace of the calculation with Islamic legal justifications and citations:
        </p>

        <ol className="stagger mt-4 space-y-3">
          {result.trace.map((step) => (
            <li key={step.id} className="rounded-card border border-hair bg-paper p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium text-ink">
                  {step.label}
                  {step.madhhabSpecific && (
                    <span className="ml-2 rounded bg-gold-wash px-1.5 py-0.5 text-[10px] font-medium text-gold-ink">
                      {profile.label}
                    </span>
                  )}
                </p>
                {step.amount !== undefined && (
                  <span className="tnum shrink-0 text-sm font-semibold text-ink">
                    {money(step.amount, result.currency)}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{step.detail}</p>
              <Source citation={step.citation} />
            </li>
          ))}
        </ol>

        {result.excluded.length > 0 && (
          <Card className="mt-4 p-5">
            <Eyebrow>Left out of the calculation ({profile.label} rules)</Eyebrow>
            <ul className="mt-3 space-y-2">
              {result.excluded.map((e, i) => (
                <li key={i} className="text-xs">
                  <span className="font-medium text-ink">{e.label}</span>{' '}
                  <span className="tnum text-mute">({money(e.amount, result.currency, 0)})</span>
                  <span className="block text-ink-soft">{e.reason}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      {/* Side-by-Side School Comparison */}
      <section className="mt-10">
        <h2 className="display text-xl text-ink">All Four Schools (Comparative Reference)</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Comparing the exact same financial assets and debts across the four classical madhāhib:
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[30rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-hair text-left text-xs">
                <th className="pb-2 font-semibold text-mute">School</th>
                <th className="pb-2 text-right font-semibold text-mute">Nisab Threshold</th>
                <th className="pb-2 text-right font-semibold text-mute">Counted Wealth</th>
                <th className="pb-2 text-right font-semibold text-mute">Zakat Due</th>
              </tr>
            </thead>
            <tbody>
              {MADHHABS.map((m) => {
                const r = all[m]
                const active = m === store.madhhab
                return (
                  <tr key={m} className={`border-b border-hair ${active ? 'bg-gold-wash/50 font-medium' : ''}`}>
                    <td className="py-3 text-ink">
                      {MADHHAB_PROFILES[m].label} {active && <span className="text-xs text-gold-ink">(Selected)</span>}
                    </td>
                    <td className="tnum py-3 text-right text-ink-soft">
                      {money(r.pools[0]?.nisabValue ?? 0, r.currency, 0)}
                    </td>
                    <td className="tnum py-3 text-right text-ink-soft">
                      {money(r.zakatableBase, r.currency, 0)}
                    </td>
                    <td className={`tnum py-3 text-right ${active ? 'font-bold text-gold-ink' : 'text-ink'}`}>
                      {money(r.zakatDue, r.currency)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-card border border-hair bg-paper p-4 text-xs leading-relaxed text-mute">
        <p className="max-w-xl">
          Mīzān applies the organizer-provided rules for educational and community compliance. Unresolved cases should be reviewed with a qualified local scholar.
        </p>
        <Link href="/submission">
          <Button variant="quiet" className="text-xs">
            Hackathon Submission Deck <ArrowRight size={13} />
          </Button>
        </Link>
      </div>
    </div>
  )
}
