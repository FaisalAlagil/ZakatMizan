'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ChevronDown,
  Plus,
  ShieldAlert,
  Upload,
} from 'lucide-react'
import { REF } from '@/lib/fiqh/fiqh-references'
import { needsAnswer } from '@/lib/classify/engine'
import { convert, FALLBACK_RATES } from '@/lib/currency'
import { parseCsv, toTransactions, type ColumnMap } from '@/lib/import/csv'
import { useStore } from '@/lib/store'
import type { Citation, Transaction, Verdict } from '@/lib/types'
import { useHydrated } from '@/lib/use-hydrated'
import { Button, Card, Eyebrow, PageHeader, Source, VerdictChip, money } from '@/components/ui'

export default function IncomePage() {
  const hydrated = useHydrated()
  const store = useStore()
  const { transactions, currency, addTransactions } = store
  const rates = store.rates ?? FALLBACK_RATES
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{
    rows: Record<string, string>[]
    map: ColumnMap
    headers: string[]
  } | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [filter, setFilter] = useState<'ALL' | Verdict>('ALL')

  if (!hydrated) return null

  const income = transactions.filter((t) => t.amount > 0)
  const missingInfo = transactions.filter(
    (t) => (t.verdict === 'NEEDS_INFO' || needsAnswer(t) || !t.verdict) && t.amount > 0
  )
  const tentative = income.filter((t) => t.verdict === 'UNCERTAIN')
  const haram = income.filter((t) => t.verdict === 'HARAM')
  const mixed = income.filter((t) => t.verdict === 'MIXED')
  const halal = income.filter((t) => t.verdict === 'HALAL')

  const total = income.reduce((s, t) => s + convert(t.amount, t.currency || currency, currency, rates), 0)
  const totalHalal = halal.reduce((s, t) => s + convert(t.amount, t.currency || currency, currency, rates), 0)
  const totalHaram = haram.reduce((s, t) => s + convert(t.amount, t.currency || currency, currency, rates), 0)
  const totalMixedHaram = mixed.reduce(
    (s, t) => s + convert(t.amount * (t.haramRatio ?? 0.05), t.currency || currency, currency, rates),
    0
  )
  const totalPurification = totalHaram + totalMixedHaram

  const filteredIncome =
    filter === 'ALL'
      ? transactions
      : filter === 'NEEDS_INFO'
        ? transactions.filter(
            (t) => (t.verdict === 'NEEDS_INFO' || needsAnswer(t) || !t.verdict) && t.amount > 0
          )
        : transactions.filter((t) => t.verdict === filter)

  async function onFile(file: File) {
    const { rows, suggested, headers } = parseCsv(await file.text())
    if (!suggested.description) {
      setStatus('We could not find a description column in that file.')
      return
    }
    setPending({ rows, headers, map: suggested as ColumnMap })
    setStatus(null)
  }

  const csvInput = (
    <input
      ref={fileInput}
      type="file"
      accept=".csv,text/csv"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0]
        if (file) void onFile(file)
        e.target.value = ''
      }}
    />
  )

  if (income.length === 0) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-16 sm:px-8">
        <div className="stagger">
          <h1 className="display text-3xl leading-tight text-ink">Income &amp; Origin Tracking</h1>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">
            Track what came in and where it originated. Mīzān checks whether each source is Halal, Haram, Mixed, Tentative (Scholar Review), or Missing Information.
          </p>

          <Link href="/income/add" className="mt-8 block">
            <button className="w-full rounded-full bg-deep py-4 text-base font-semibold text-white shadow-[0_4px_0_0_#000] transition-all duration-150 hover:bg-lift active:translate-y-[3px] active:shadow-[0_1px_0_0_#000]">
              Add my first income source
            </button>
          </Link>
          <button
            onClick={() => fileInput.current?.click()}
            className="mt-3 w-full rounded-full border border-hair bg-paper py-3.5 text-base font-medium text-ink transition-colors hover:bg-canvas"
          >
            Or upload a spreadsheet / bank CSV
          </button>
          {csvInput}
          {status && <p className="mt-4 text-sm text-ink-soft">{status}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <div className="stagger">
        <PageHeader
          title="Income &amp; Classifications"
          lead="Every source of income is verified against Islamic jurisprudence rulings. Impermissible income is separated from your zakatable wealth and marked for purification."
          action={
            <Link href="/income/add">
              <Button>
                <Plus size={16} /> Add Income
              </Button>
            </Link>
          }
        />

        {/* Missing Information Warning Banner */}
        {missingInfo.length > 0 && (
          <div
            onClick={() => setFilter('NEEDS_INFO')}
            className="mb-6 cursor-pointer rounded-2xl border border-missing/40 bg-missing/10 p-5 transition-all hover:border-missing hover:shadow-sm"
          >
            <div className="flex items-start gap-3.5">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-missing" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink">
                    Missing Information Warning ({missingInfo.length} {missingInfo.length === 1 ? 'entry' : 'entries'})
                  </p>
                  <span className="text-xs font-semibold text-missing underline">View all {missingInfo.length}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  We cannot complete the Halal/Haram classification without knowing where these funds originated. Tap to specify origin and resolve them.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Summary Stats Grid */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="p-4">
            <Eyebrow>Total Income</Eyebrow>
            <p className="tnum display mt-1 text-xl text-ink sm:text-2xl">{money(total, currency)}</p>
            <p className="mt-0.5 text-xs text-mute">{income.length} sources</p>
          </Card>

          <Card className="p-4">
            <Eyebrow className="!text-halal">Halal Wealth</Eyebrow>
            <p className="tnum display mt-1 text-xl text-halal sm:text-2xl">{money(totalHalal, currency)}</p>
            <p className="mt-0.5 text-xs text-mute">{halal.length} verified</p>
          </Card>

          <Card className="p-4">
            <Eyebrow className="!text-haram">To Purify (Disposal)</Eyebrow>
            <p className="tnum display mt-1 text-xl text-haram sm:text-2xl">{money(totalPurification, currency)}</p>
            <p className="mt-0.5 text-xs text-mute">Not zakatable</p>
          </Card>

          <Card className="p-4">
            <Eyebrow className="!text-uncertain">Scholar Review</Eyebrow>
            <p className="tnum display mt-1 text-xl text-uncertain sm:text-2xl">{tentative.length}</p>
            <p className="mt-0.5 text-xs text-mute">
              {tentative.length === 1 ? 'tentative entry' : 'tentative entries'}
            </p>
          </Card>
        </div>

        {/* Filter Pills */}
        <div className="mb-4 flex flex-wrap gap-1.5 border-b border-hair pb-3 text-xs">
          {(['ALL', 'HALAL', 'MIXED', 'HARAM', 'UNCERTAIN', 'NEEDS_INFO'] as const).map((f) => {
            const active = filter === f
            const label =
              f === 'ALL'
                ? `All (${transactions.length})`
                : f === 'HALAL'
                  ? `Halal (${halal.length})`
                  : f === 'MIXED'
                    ? `Mixed (${mixed.length})`
                    : f === 'HARAM'
                      ? `Haram (${haram.length})`
                      : f === 'UNCERTAIN'
                        ? `Tentative (${tentative.length})`
                        : `Needs Info (${missingInfo.length})`
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 font-medium transition-colors ${
                  active
                    ? 'bg-deep text-white shadow-sm'
                    : 'border border-hair bg-paper text-ink-soft hover:bg-canvas hover:text-ink'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>

        {pending && (
          <Card className="mb-4 p-5">
            <Eyebrow>Check the columns</Eyebrow>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {(['date', 'description', 'amount', 'credit', 'debit'] as const).map((field) => (
                <label key={field} className="text-sm">
                  <span className="block text-xs capitalize text-mute">{field}</span>
                  <select
                    value={pending.map[field] ?? ''}
                    onChange={(e) =>
                      setPending({ ...pending, map: { ...pending.map, [field]: e.target.value || undefined } })
                    }
                    className="mt-1 w-full appearance-none rounded-xl border border-hair bg-paper py-2 pl-3 pr-8 text-sm text-ink transition-colors focus:border-deep"
                  >
                    <option value="">—</option>
                    {pending.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                onClick={() => {
                  const txs = toTransactions(pending.rows, pending.map, currency)
                  addTransactions(txs)
                  setPending(null)
                  setStatus(`Imported ${txs.length} rows.`)
                }}
              >
                Import {pending.rows.length} rows
              </Button>
              <Button variant="ghost" onClick={() => setPending(null)}>
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {status && <p className="mb-4 text-sm text-ink-soft">{status}</p>}

        <ul className="space-y-2.5">
          {filteredIncome.map((t) => (
            <Row
              key={t.id}
              tx={t}
              main={currency}
              rates={rates}
              expanded={open === t.id}
              onToggle={() => setOpen(open === t.id ? null : t.id)}
              onClose={() => setOpen(null)}
            />
          ))}
        </ul>

        <div className="mt-8 flex justify-center">
          <button
            onClick={() => fileInput.current?.click()}
            className="inline-flex items-center gap-2 text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
          >
            <Upload size={14} /> Import bank CSV / spreadsheet
          </button>
          {csvInput}
        </div>
      </div>
    </div>
  )
}

function Row({
  tx,
  main,
  rates,
  expanded,
  onToggle,
  onClose,
}: {
  tx: Transaction
  main: string
  rates: typeof FALLBACK_RATES
  expanded: boolean
  onToggle: () => void
  onClose: () => void
}) {
  const update = useStore((s) => s.updateTransaction)
  const [ratio, setRatio] = useState(String(Math.round((tx.haramRatio ?? 0.05) * 100)))
  const [customOrigin, setCustomOrigin] = useState(tx.counterparty || '')

  const attention = needsAnswer(tx) || tx.verdict === 'NEEDS_INFO' || !tx.verdict
  const outgoing = tx.amount <= 0
  const converted = tx.currency && tx.currency !== main ? convert(tx.amount, tx.currency, main, rates) : null

  function applyOriginResolution(verdict: Verdict, basis: string, citation?: Citation) {
    update(
      tx.id,
      {
        verdict,
        basis: customOrigin ? `${basis} (Origin: ${customOrigin})` : basis,
        counterparty: customOrigin || tx.counterparty,
        citation,
        haramRatio: verdict === 'MIXED' ? (Number.parseFloat(ratio) || 5) / 100 : undefined,
        mixedTreatment: 'disposed', // Haram portion is always purified/disposed
        uncertaintyKind: verdict === 'UNCERTAIN' ? 'scholarly' : undefined,
      },
      { learn: true }
    )
    if (verdict !== 'MIXED') onClose()
  }

  return (
    <li>
      <div
        className={`overflow-hidden rounded-2xl border transition-colors duration-200 ${
          attention
            ? 'border-missing/50 bg-missing/5 shadow-sm'
            : tx.verdict === 'HARAM'
              ? 'border-haram/25 bg-paper'
              : 'border-hair bg-paper'
        }`}
      >
        <button
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-canvas/60"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-ink max-w-[280px] sm:max-w-md">{tx.description}</p>
              {attention && (
                <span className="shrink-0 rounded bg-missing/15 px-1.5 py-0.2 text-[10px] font-semibold text-missing">
                  PROVIDE INFO
                </span>
              )}
            </div>
            <p className="tnum mt-0.5 text-xs text-mute truncate">
              {tx.date} {tx.counterparty ? `• ${tx.counterparty}` : tx.sourceType ? `• ${tx.sourceType}` : ''}
            </p>
          </div>

          <VerdictChip verdict={tx.verdict} />

          <div className="w-24 shrink-0 text-right sm:w-28">
            <p className={`tnum text-sm ${outgoing ? 'text-mute' : 'font-medium text-ink'}`}>
              {money(tx.amount, tx.currency || main)}
            </p>
            {converted !== null && <p className="tnum text-xs text-mute">{money(converted, main)}</p>}
          </div>

          <ChevronDown
            size={16}
            className={`shrink-0 text-mute transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
          />
        </button>

        <div
          className="grid transition-[grid-template-rows] duration-300 ease-out"
          style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
        >
          <div className="overflow-hidden">
            <div className="border-t border-hair/70 px-4 py-4">
              {outgoing ? (
                <p className="text-sm text-ink-soft">
                  Money going out is an expense/transfer, so it is excluded from your zakat obligation.
                </p>
              ) : (
                <>
                  {tx.basis && (
                    <div className="mb-3 rounded-xl bg-canvas p-3">
                      <p className="text-xs font-medium text-mute">Fiqh Ruling &amp; Basis:</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-ink">{tx.basis}</p>
                    </div>
                  )}

                  <Source citation={tx.citation} />

                  {/* 100% Haram Notice */}
                  {tx.verdict === 'HARAM' && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-haram/25 bg-haram/10 p-3 text-xs leading-relaxed text-haram">
                      <ShieldAlert className="size-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Purification Requirement:</span> 100% of this amount ({money(tx.amount, tx.currency || main)}) must be given away in charity without expecting reward. It does not count towards your 2.5% zakat obligation.
                      </div>
                    </div>
                  )}

                  {/* Mixed Income Breakdown (Always Purified) */}
                  {tx.verdict === 'MIXED' && (
                    <div className="mt-4 rounded-xl border border-mixed/25 bg-mixed/5 p-4 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-mixed">Mixed Income Breakdown</p>
                      
                      <div className="flex flex-wrap items-end gap-3">
                        <label className="text-sm">
                          <span className="block text-xs text-mute">
                            Non-permissible share to purify:
                          </span>
                          <span className="mt-1 flex items-center gap-2">
                            <input
                              value={ratio}
                              onChange={(e) => setRatio(e.target.value.replace(/[^0-9.]/g, ''))}
                              inputMode="decimal"
                              className="tnum w-20 rounded-xl border border-hair bg-paper px-2.5 py-1.5 text-sm font-semibold text-ink"
                            />
                            <span className="text-sm text-ink-soft">%</span>
                          </span>
                        </label>
                        <Button
                          variant="quiet"
                          onClick={() => {
                            update(tx.id, {
                              haramRatio: (Number.parseFloat(ratio) || 0) / 100,
                              haramRatioIsEstimate: false,
                              mixedTreatment: 'disposed',
                            })
                          }}
                        >
                          Save Ratio
                        </Button>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 text-xs pt-1">
                        <p className="text-ink-soft">
                          Halal share: <strong className="text-halal">{money(Math.abs(tx.amount) * (1 - (tx.haramRatio ?? 0.05)), tx.currency || main)}</strong> (Zakatable)
                        </p>
                        <p className="text-ink-soft">
                          Purification share: <strong className="text-haram">{money(Math.abs(tx.amount) * (tx.haramRatio ?? 0.05), tx.currency || main)}</strong> (Must be donated)
                        </p>
                      </div>

                      <div className="rounded-lg bg-canvas p-2 text-[11px] text-mute border border-hair">
                        ✓ Haram portion is separated for purification and excluded from your zakat payment.
                      </div>
                    </div>
                  )}

                  {/* Origin Specification & Resolution Panel for Needs Info */}
                  {attention && (
                    <div className="mt-4 rounded-xl border border-missing/40 bg-missing/5 p-4 space-y-3">
                      <p className="text-xs font-semibold text-missing uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle size={14} /> Provide Origin Details to Complete Classification
                      </p>

                      <div>
                        <label className="block text-[11px] font-medium text-mute mb-1">
                          Merchant / Payer / Context (Optional):
                        </label>
                        <input
                          type="text"
                          value={customOrigin}
                          onChange={(e) => setCustomOrigin(e.target.value)}
                          placeholder="e.g. Consulting Client, Dividend Payout, Online Store"
                          className="w-full rounded-xl border border-hair bg-paper px-3 py-2 text-xs text-ink outline-none focus:border-deep"
                        />
                      </div>

                      <p className="text-xs font-medium text-ink pt-1">Select the nature of this transaction:</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() =>
                            applyOriginResolution(
                              'HALAL',
                              'Proceeds from permissible trade, services, or earnings.',
                              REF.lawfulEarning
                            )
                          }
                          className="rounded-xl border border-halal/40 bg-paper p-3 text-left hover:border-halal hover:bg-halal/5 transition-all"
                        >
                          <span className="block text-xs font-semibold text-halal">🟢 Permissible Income / Salary</span>
                          <span className="mt-0.5 block text-[11px] text-mute">Salary, freelance, consulting, sales, rent</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            applyOriginResolution(
                              'HALAL',
                              'Gift, personal remittance, or lawful grant.',
                              REF.lawfulEarning
                            )
                          }
                          className="rounded-xl border border-halal/40 bg-paper p-3 text-left hover:border-halal hover:bg-halal/5 transition-all"
                        >
                          <span className="block text-xs font-semibold text-halal">🟢 Gift / Grant / Transfer</span>
                          <span className="mt-0.5 block text-[11px] text-mute">Family gift, inheritance, scholarship, tax refund</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            applyOriginResolution(
                              'MIXED',
                              'Mixed business income. Permissible portion is zakatable, non-permissible portion is purified.',
                              REF.mixedIncomePurification
                            )
                          }
                          className="rounded-xl border border-mixed/40 bg-paper p-3 text-left hover:border-mixed hover:bg-mixed/5 transition-all"
                        >
                          <span className="block text-xs font-semibold text-mixed">🟡 Mixed Sales / Revenue</span>
                          <span className="mt-0.5 block text-[11px] text-mute">Revenue with both permissible and non-halal parts</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            applyOriginResolution(
                              'HARAM',
                              'Impermissible revenue. 100% must be separated for disposal and excluded from zakat.',
                              REF.ribaProhibited
                            )
                          }
                          className="rounded-xl border border-haram/40 bg-paper p-3 text-left hover:border-haram hover:bg-haram/5 transition-all"
                        >
                          <span className="block text-xs font-semibold text-haram">🔴 Interest / Bank Payout</span>
                          <span className="mt-0.5 block text-[11px] text-mute">Riba, interest yield, prohibited industry revenue</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  )
}
