'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, ChevronDown, CircleAlert, HelpCircle, Plus, ShieldAlert, Upload, WandSparkles } from 'lucide-react'
import type { Transaction, Verdict } from '@/lib/types'
import { parseCsv, toTransactions, type ColumnMap } from '@/lib/import/csv'
import { needsAi, needsAnswer } from '@/lib/classify/engine'
import { enrichWithAi } from '@/lib/classify/ai-enrich'
import { convert } from '@/lib/currency'
import { effectiveRates, useStore } from '@/lib/store'
import { useHydrated } from '@/lib/use-hydrated'
import { Button, Card, Eyebrow, PageHeader, Source, VERDICT_META, VerdictChip, money } from '@/components/ui'

const OVERRIDES: { label: string; detail: string; verdict: Verdict }[] = [
  { label: 'Halal (Lawful)', detail: 'Counts in zakatable personal wealth', verdict: 'HALAL' },
  { label: 'Haram (Purify)', detail: '100% excluded from zakat, set aside for disposal', verdict: 'HARAM' },
  { label: 'Mixed (Purify share)', detail: 'Specify non-halal percentage to purify', verdict: 'MIXED' },
  { label: 'Tentative (Scholar Review)', detail: 'Park for qualified scholarly guidance', verdict: 'UNCERTAIN' },
  { label: 'Missing Information', detail: 'Origin unknown; needs more details', verdict: 'NEEDS_INFO' },
]

export default function Income() {
  const hydrated = useHydrated()
  const store = useStore()
  const { transactions, currency, offlineMode, addTransactions, replaceTransactions } = store
  const rates = effectiveRates(store)
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{
    rows: Record<string, string>[]
    map: ColumnMap
    headers: string[]
  } | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [filter, setFilter] = useState<'ALL' | Verdict>('ALL')

  if (!hydrated) return null

  const income = transactions.filter((t) => t.amount > 0)
  const missingInfo = income.filter((t) => t.verdict === 'NEEDS_INFO' || needsAnswer(t))
  const tentative = income.filter((t) => t.verdict === 'UNCERTAIN')
  const haram = income.filter((t) => t.verdict === 'HARAM')
  const mixed = income.filter((t) => t.verdict === 'MIXED')
  const halal = income.filter((t) => t.verdict === 'HALAL')
  const unresolved = transactions.filter(needsAi)

  const total = income.reduce((s, t) => s + convert(t.amount, t.currency || currency, currency, rates), 0)
  const totalHalal = halal.reduce((s, t) => s + convert(t.amount, t.currency || currency, currency, rates), 0)
  const totalHaram = haram.reduce((s, t) => s + convert(t.amount, t.currency || currency, currency, rates), 0)
  const totalMixedHaram = mixed.reduce((s, t) => s + convert(t.amount * (t.haramRatio ?? 0.05), t.currency || currency, currency, rates), 0)
  const totalPurification = totalHaram + totalMixedHaram

  const filteredIncome = filter === 'ALL' ? transactions : transactions.filter((t) => t.verdict === filter)

  async function onFile(file: File) {
    const { rows, suggested, headers } = parseCsv(await file.text())
    if (!suggested.description) {
      setStatus('We could not find a description column in that file.')
      return
    }
    setPending({ rows, headers, map: suggested as ColumnMap })
    setStatus(null)
  }

  async function runEnrichment() {
    setBusy(true)
    setStatus(null)
    try {
      const outcome = await enrichWithAi(unresolved)
      if (outcome.unavailable) {
        setStatus(outcome.reason ?? 'Model unavailable. Everything still works on the rules alone.')
      } else {
        const byId = new Map(outcome.transactions.map((t) => [t.id, t]))
        replaceTransactions(transactions.map((t) => byId.get(t.id) ?? t))
        setStatus(`Identified and classified ${outcome.transactions.length} entries.`)
      }
    } finally {
      setBusy(false)
    }
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
          <h1 className="display text-3xl leading-tight text-ink">Income & Origin Tracking</h1>
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
          title="Income & Classifications"
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
          <Card className="mb-6 border-missing/40 bg-missing/10 p-5">
            <div className="flex items-start gap-3.5">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-missing" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-ink">
                  Missing Information Warning ({missingInfo.length} {missingInfo.length === 1 ? 'entry' : 'entries'})
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  We cannot complete the Halal/Haram classification without knowing where these funds originated. Tap the flagged items below to specify their origin.
                </p>
              </div>
            </div>
          </Card>
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
            <p className="mt-0.5 text-xs text-mute">{tentative.length === 1 ? 'tentative entry' : 'tentative entries'}</p>
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

        {unresolved.length > 0 && !offlineMode && (
          <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-5">
            <p className="flex-1 text-sm text-ink-soft">
              <span className="font-medium text-ink">{unresolved.length} imported entries</span> the rules could
              not place. We can identify merchant strings automatically.
            </p>
            <Button variant="quiet" onClick={runEnrichment} disabled={busy}>
              <WandSparkles size={15} /> {busy ? 'Identifying…' : 'Identify them'}
            </Button>
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
  rates: ReturnType<typeof effectiveRates>
  expanded: boolean
  onToggle: () => void
  onClose: () => void
}) {
  const update = useStore((s) => s.updateTransaction)
  const [ratio, setRatio] = useState(String(Math.round((tx.haramRatio ?? 0.05) * 100)))

  const attention = needsAnswer(tx) || tx.verdict === 'NEEDS_INFO'
  const outgoing = tx.amount <= 0
  const converted = tx.currency && tx.currency !== main ? convert(tx.amount, tx.currency, main, rates) : null

  function answer(patch: Partial<Transaction>) {
    update(tx.id, patch, { learn: true })
    if (patch.verdict !== 'MIXED') onClose()
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
              <p className="truncate text-sm font-medium text-ink">{tx.description}</p>
              {attention && (
                <span className="rounded bg-missing/15 px-1.5 py-0.2 text-[10px] font-semibold text-missing">
                  ACTION NEEDED
                </span>
              )}
            </div>
            <p className="tnum mt-0.5 text-xs text-mute">
              {tx.date} {tx.sourceType && `• ${tx.sourceType}`}
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
                  Money going out is not classified, so it does not affect your zakat.
                </p>
              ) : (
                <>
                  {tx.basis && (
                    <div className="mb-2 rounded-xl bg-canvas p-3">
                      <p className="text-xs font-medium text-mute">Fiqh Ruling & Basis:</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-ink">{tx.basis}</p>
                    </div>
                  )}

                  <Source citation={tx.citation} />

                  {tx.verdict === 'HARAM' && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-haram/25 bg-haram/10 p-3 text-xs leading-relaxed text-haram">
                      <ShieldAlert className="size-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Purification Requirement:</span> 100% of this amount ({money(tx.amount, tx.currency || main)}) must be given away in charity without expecting reward. It does not count towards your 2.5% zakat obligation.
                      </div>
                    </div>
                  )}

                  {tx.verdict === 'MIXED' && (
                    <div className="mt-4 rounded-xl border border-mixed/25 bg-mixed/5 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-mixed">Mixed Income Breakdown</p>
                      <div className="mt-3 flex flex-wrap items-end gap-3">
                        <label className="text-sm">
                          <span className="block text-xs text-mute">
                            Non-permissible share to purify {tx.haramRatioIsEstimate && '(estimated)'}
                          </span>
                          <span className="mt-1 flex items-center gap-2">
                            <input
                              value={ratio}
                              onChange={(e) => setRatio(e.target.value.replace(/[^0-9.]/g, ''))}
                              inputMode="decimal"
                              className="tnum w-20 rounded-xl border border-hair bg-paper px-2 py-1.5 text-sm"
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
                            })
                          }}
                        >
                          Save share
                        </Button>
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs">
                        <p className="text-ink-soft">
                          Halal share: <span className="font-semibold text-halal">{money(Math.abs(tx.amount) * (1 - (tx.haramRatio ?? 0.05)), tx.currency || main)}</span> (Zakatable)
                        </p>
                        <p className="text-ink-soft">
                          Haram share: <span className="font-semibold text-haram">{money(Math.abs(tx.amount) * (tx.haramRatio ?? 0.05), tx.currency || main)}</span> (Purify)
                        </p>
                      </div>

                      <div className="mt-3 border-t border-hair/60 pt-3">
                        <p className="text-xs font-medium text-ink">Treatment of Haram Portion:</p>
                        <div className="mt-1.5 flex gap-2">
                          <button
                            onClick={() => update(tx.id, { mixedTreatment: 'disposed' })}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                              tx.mixedTreatment !== 'retained'
                                ? 'bg-deep text-white'
                                : 'border border-hair bg-paper text-ink-soft'
                            }`}
                          >
                            Disposed / Purified (Zakat on halal only)
                          </button>
                          <button
                            onClick={() => update(tx.id, { mixedTreatment: 'retained' })}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                              tx.mixedTreatment === 'retained'
                                ? 'bg-deep text-white'
                                : 'border border-hair bg-paper text-ink-soft'
                            }`}
                          >
                            Retained (Full mixed wealth zakatable)
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 border-t border-hair pt-4">
                    <p className="text-xs font-medium text-mute">
                      {tx.question ? tx.question.prompt : 'Change classification or specify origin:'}
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {tx.question
                        ? tx.question.options.map((o) => (
                            <button
                              key={o.value}
                              onClick={() => answer(o.sets)}
                              className="rounded-xl border-2 border-hair bg-paper px-3 py-2.5 text-left text-sm font-medium text-ink transition-all duration-150 hover:border-ink-soft/30 active:scale-[0.985]"
                            >
                              {o.label}
                            </button>
                          ))
                        : OVERRIDES.map((o) => (
                            <button
                              key={o.verdict}
                              onClick={() =>
                                answer({
                                  verdict: o.verdict,
                                  basis: `You manually classified this entry as ${o.label}.`,
                                  citation: undefined,
                                  uncertaintyKind: o.verdict === 'UNCERTAIN' ? 'scholarly' : undefined,
                                  haramRatio: o.verdict === 'MIXED' ? (tx.haramRatio ?? 0.05) : undefined,
                                })
                              }
                              className={`rounded-xl border-2 px-3 py-2.5 text-left transition-all duration-150 active:scale-[0.985] ${
                                tx.verdict === o.verdict
                                  ? VERDICT_META[o.verdict].chip
                                  : 'border-hair bg-paper hover:border-ink-soft/30'
                              }`}
                            >
                              <span className="block text-sm font-medium text-ink">{o.label}</span>
                              <span className="mt-0.5 block text-xs text-mute">{o.detail}</span>
                            </button>
                          ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  )
}
