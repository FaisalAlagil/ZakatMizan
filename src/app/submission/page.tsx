'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, FileText, Play, ShieldAlert, Sparkles, UserCheck } from 'lucide-react'
import { MADHHAB_PROFILES } from '@/lib/fiqh/madhhab-profiles'
import { HACKATHON_TEST_CASES, type HackathonTestCase } from '@/lib/fiqh/test-cases'
import { useStore } from '@/lib/store'
import { useZakat } from '@/lib/use-zakat'
import { useHydrated } from '@/lib/use-hydrated'
import { Button, Card, Eyebrow, PageHeader, money } from '@/components/ui'
import { MADHHABS, type Madhhab } from '@/lib/types'

export default function SubmissionPage() {
  const hydrated = useHydrated()
  const store = useStore()
  const { result } = useZakat()
  const [selectedCase, setSelectedCase] = useState<string>('case1')

  if (!hydrated) return null

  const activeProfile = MADHHAB_PROFILES[store.madhhab]
  const currentCase = HACKATHON_TEST_CASES[selectedCase]

  function loadTestCase(tc: HackathonTestCase) {
    store.setMadhhab(store.madhhab)
    store.setHawlStartDate(tc.hawlStartDate)
    store.setDipped(tc.dippedBelowNisab)
    store.replaceTransactions(tc.transactions)
    store.replaceSetupData(store.madhhab, tc.assets, tc.liabilities)
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
      <div className="stagger">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold-wash px-3 py-1 text-xs font-semibold text-gold-ink">
          <Sparkles size={13} /> Hackathon Final Submission Package
        </div>

        <PageHeader
          title="Mīzān: Halal Income & Zakat"
          lead="A verified, rule-based calculator built for the Halal Income and Zakat Calculator Hackathon. Follows organizer rules with zero AI hallucinations in fiqh calculations."
        />

        {/* Navigation Tabs to Hackathon Deliverables */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <a href="#test-cases" className="rounded-xl border border-hair bg-paper p-3 transition-colors hover:bg-canvas">
            <p className="text-xs font-semibold text-ink">1. Test Cases</p>
            <p className="text-[11px] text-mute">3 pre-built scenarios</p>
          </a>
          <a href="#classification-system" className="rounded-xl border border-hair bg-paper p-3 transition-colors hover:bg-canvas">
            <p className="text-xs font-semibold text-ink">2. Classification</p>
            <p className="text-[11px] text-mute">5-state engine</p>
          </a>
          <a href="#madhhab-rationale" className="rounded-xl border border-hair bg-paper p-3 transition-colors hover:bg-canvas">
            <p className="text-xs font-semibold text-ink">3. Madhhab Rules</p>
            <p className="text-[11px] text-mute">Strict single-school logic</p>
          </a>
          <a href="#presentation-script" className="rounded-xl border border-hair bg-paper p-3 transition-colors hover:bg-canvas">
            <p className="text-xs font-semibold text-ink">4. Presentation</p>
            <p className="text-[11px] text-mute">3-5 min pitch & future</p>
          </a>
        </div>

        {/* Section 1: Three Test Cases */}
        <section id="test-cases" className="mb-12 scroll-mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hair pb-3">
            <div>
              <h2 className="display text-2xl text-ink">Three Required Test Cases</h2>
              <p className="text-sm text-ink-soft">
                Live interactive test cases evaluated using your active school ({activeProfile.label}).
              </p>
            </div>
            <div className="flex gap-2">
              {Object.keys(HACKATHON_TEST_CASES).map((k, i) => (
                <button
                  key={k}
                  onClick={() => setSelectedCase(k)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedCase === k
                      ? 'bg-deep text-white shadow-sm'
                      : 'border border-hair bg-paper text-ink-soft hover:bg-canvas'
                  }`}
                >
                  Case {i + 1}
                </button>
              ))}
            </div>
          </div>

          <Card className="mt-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="rounded-full bg-gold-wash px-2.5 py-0.5 text-xs font-semibold text-gold-ink">
                  {currentCase.category}
                </span>
                <h3 className="display mt-2 text-xl text-ink">{currentCase.title}</h3>
                <p className="text-sm text-ink-soft">{currentCase.subtitle}</p>
              </div>

              <Button
                variant="primary"
                onClick={() => {
                  loadTestCase(currentCase)
                  window.location.href = '/zakat'
                }}
              >
                <Play size={15} /> Load into Calculator &amp; View
              </Button>
            </div>

            <p className="mt-4 rounded-xl bg-canvas p-3.5 text-xs leading-relaxed text-ink-soft">
              {currentCase.description}
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-hair bg-paper p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-mute">Assets &amp; Holdings</p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {currentCase.assets.map((a) => (
                    <li key={a.id} className="flex justify-between">
                      <span className="text-ink">{a.label}:</span>
                      <span className="font-medium text-ink-soft">
                        {a.kind === 'personal_jewelry' ? `${a.amount}g gold` : money(a.amount, a.currency || 'CAD')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-hair bg-paper p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-mute">Income &amp; Sources</p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {currentCase.transactions.map((t) => (
                    <li key={t.id} className="flex justify-between">
                      <span className="truncate text-ink">{t.description}:</span>
                      <span className="shrink-0 font-medium text-ink-soft">
                        {money(t.amount, t.currency || 'CAD')} ({t.verdict})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-hair bg-paper p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-mute">Debts &amp; Hawl</p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {currentCase.liabilities.map((l) => (
                    <li key={l.id} className="flex justify-between">
                      <span className="text-ink">{l.label}:</span>
                      <span className="font-medium text-ink-soft">{money(l.dueWithinYear, 'CAD')}</span>
                    </li>
                  ))}
                  <li className="flex justify-between pt-1 border-t border-hair">
                    <span className="text-ink">Mid-year dip:</span>
                    <span className="font-medium text-ink-soft">{currentCase.dippedBelowNisab ? 'Yes (Dipped)' : 'No (Maintained)'}</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-gold/30 bg-gold-wash/30 p-3.5 text-xs leading-relaxed text-ink">
              <span className="font-semibold text-gold-ink">Fiqh Calculation Breakdown: </span>
              {currentCase.keyTakeaway}
            </div>
          </Card>
        </section>

        {/* Section 2: Explanation of Classification System */}
        <section id="classification-system" className="mb-12 scroll-mt-10">
          <div className="border-b border-hair pb-3">
            <h2 className="display text-2xl text-ink">5-State Income Classification System</h2>
            <p className="text-sm text-ink-soft">
              Every income transaction is categorized into one of five rigorous states with citations:
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Card className="p-4 border-halal/30">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-halal/10 px-2.5 py-0.5 text-xs font-semibold text-halal">1. Halal</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                Lawful income from permissible employment, trade, gifts, or benefits. Fully included in personal zakatable wealth when reaching Nisab.
              </p>
            </Card>

            <Card className="p-4 border-haram/30">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-haram/10 px-2.5 py-0.5 text-xs font-semibold text-haram">2. Haram (Purify)</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                Unlawful income (bank interest/riba, gambling/maysir, alcohol trade). 100% excluded from zakatable personal wealth and set aside for disposal without tax credit. Removing haram income does NOT count as paying zakat.
              </p>
            </Card>

            <Card className="p-4 border-mixed/30">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-mixed/10 px-2.5 py-0.5 text-xs font-semibold text-mixed">3. Mixed Income</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                Income containing permissible and non-compliant shares (e.g. conventional dividends). If the haram portion is separated &amp; disposed of, zakat is only calculated on the remaining halal portion. If retained, the full mixed wealth remains in the zakatable base.
              </p>
            </Card>

            <Card className="p-4 border-uncertain/30">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-uncertain/10 px-2.5 py-0.5 text-xs font-semibold text-uncertain">4. Tentative (Scholar Review)</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                Provisional or unresolved cases (disputed banking jobs, doubtful loan repayments, crypto nuances). Explicitly flagged as awaiting qualified scholar review.
              </p>
            </Card>

            <Card className="p-4 border-missing/40 bg-missing/5 sm:col-span-2">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-missing/15 px-2.5 py-0.5 text-xs font-semibold text-missing">5. Missing Information Warning</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                When a description or CSV entry does not specify the origin of funds, the tool displays a warning banner and prompts the user with guided questions to settle the origin.
              </p>
            </Card>
          </div>
        </section>

        {/* Section 3: Selected Madhhab & Fiqh Profile */}
        <section id="madhhab-rationale" className="mb-12 scroll-mt-10">
          <div className="border-b border-hair pb-3">
            <h2 className="display text-2xl text-ink">Selected Madhhab &amp; Fiqh Engine</h2>
            <p className="text-sm text-ink-soft">
              Active Selection: <span className="font-semibold text-ink">{activeProfile.label} Madhhab</span>. Strict rules applied throughout without mixing.
            </p>
          </div>

          <Card className="mt-4 p-5">
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-xl bg-canvas p-3">
                <p className="font-semibold text-ink">Nisab Basis</p>
                <p className="mt-1 text-ink-soft">{activeProfile.nisabBasis.explain}</p>
              </div>
              <div className="rounded-xl bg-canvas p-3">
                <p className="font-semibold text-ink">Asset Pooling</p>
                <p className="mt-1 text-ink-soft">{activeProfile.combineAssetClasses.explain}</p>
              </div>
              <div className="rounded-xl bg-canvas p-3">
                <p className="font-semibold text-ink">Holding Period (Hawl)</p>
                <p className="mt-1 text-ink-soft">{activeProfile.hawl.explain}</p>
              </div>
              <div className="rounded-xl bg-canvas p-3">
                <p className="font-semibold text-ink">Personal Jewelry</p>
                <p className="mt-1 text-ink-soft">{activeProfile.personalJewelryZakatable.explain}</p>
              </div>
              <div className="rounded-xl bg-canvas p-3">
                <p className="font-semibold text-ink">Debt Deductions</p>
                <p className="mt-1 text-ink-soft">{activeProfile.debtDeduction.explain}</p>
              </div>
              <div className="rounded-xl bg-canvas p-3">
                <p className="font-semibold text-ink">Business Stock (Trade Goods)</p>
                <p className="mt-1 text-ink-soft">{activeProfile.tradeGoods.explain}</p>
              </div>
            </div>
          </Card>
        </section>

        {/* Section 4: 3-5 Minute Presentation Script */}
        <section id="presentation-script" className="mb-12 scroll-mt-10">
          <div className="border-b border-hair pb-3">
            <h2 className="display text-2xl text-ink">3-to-5-Minute Presentation Outline</h2>
            <p className="text-sm text-ink-soft">
              Structured talking points and pitch for the hackathon judging panel:
            </p>
          </div>

          <div className="mt-4 space-y-3 text-xs leading-relaxed text-ink-soft">
            <Card className="p-4">
              <p className="font-semibold text-ink">Minute 1: The Problem &amp; Core Distinction</p>
              <p className="mt-1">
                Most zakat tools treat zakat as an income tax or lump all earnings together. In Islamic jurisprudence, Zakat is 2.5% of net qualifying wealth held for a lunar year, while impermissible income must be separated in full for purification and never zakated.
              </p>
            </Card>

            <Card className="p-4">
              <p className="font-semibold text-ink">Minute 2: The Income &amp; Origin Classifier</p>
              <p className="mt-1">
                When entering income, Mīzān asks where it came from (employment, business, rental, dividends, interest). It sorts every entry into 5 states: Halal, Haram, Mixed (with purification % and disposed vs retained status), Tentative (Scholar Review), and Missing Information warnings.
              </p>
            </Card>

            <Card className="p-4">
              <p className="font-semibold text-ink">Minute 3: Madhhab-Specific Mathematical Precision</p>
              <p className="mt-1">
                Rather than blending schools, Mīzān executes the exact rules of the chosen Madhhab (Hanafi, Maliki, Shafi&apos;i, or Hanbali) across gold jewelry, debt deductions, receivables, and continuous vs endpoint hawl, providing an auditable step-by-step trace with primary citations.
              </p>
            </Card>

            <Card className="p-4">
              <p className="font-semibold text-ink">Minute 4: Live Demo &amp; 3 Verification Scenarios</p>
              <p className="mt-1">
                Showcase the 3 test cases: (1) Salaried Professional with Screened Equities; (2) Mixed Freelancer with Dividend Purification and Riba separation; (3) Merchant with Trade Goods and broken hawl continuity.
              </p>
            </Card>

            <Card className="p-4">
              <p className="font-semibold text-ink">Minute 5: Privacy, Limitations &amp; Future Scope</p>
              <p className="mt-1">
                100% client-side privacy (no bank credentials stored), fixed CAD Nisab values, automated CSV upload, and clear scholar handoff badges for provisional rulings.
              </p>
            </Card>
          </div>
        </section>

        {/* Section 5: Limitations & Future Improvements */}
        <section className="mb-12">
          <div className="border-b border-hair pb-3">
            <h2 className="display text-2xl text-ink">Limitations &amp; Future Improvements</h2>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
            <Card className="p-4">
              <p className="font-semibold text-ink">Current Limitations</p>
              <ul className="mt-2 space-y-1 text-ink-soft list-disc list-inside">
                <li>Fixed CAD metal benchmarks as requested by hackathon rules.</li>
                <li>Complex agricultural zakat (Ushr) and livestock (An&apos;am) are out of scope.</li>
                <li>Tentative rulings require offline consultation with a local scholar.</li>
              </ul>
            </Card>

            <Card className="p-4">
              <p className="font-semibold text-ink">Future Improvements</p>
              <ul className="mt-2 space-y-1 text-ink-soft list-disc list-inside">
                <li>Direct integration with AAOIFI Shariah screening APIs for corporate 10-K filings.</li>
                <li>Multi-year historical zakat audit for missed prior years.</li>
                <li>Open-source scholarly verification portal for local imams and muftis.</li>
              </ul>
            </Card>
          </div>
        </section>

        <div className="flex justify-center">
          <Link href="/zakat">
            <Button variant="primary">
              Return to Calculator &amp; Statement <ArrowRight size={15} />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
