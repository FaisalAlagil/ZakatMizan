'use client'

import { ArrowRight, ChevronLeft, FileSpreadsheet, ListChecks, Lock, Sparkles } from 'lucide-react'

export function SetupMethodChoice({
  onSelectQuestions,
  onSelectImport,
  onBack,
}: {
  onSelectQuestions: () => void
  onSelectImport: () => void
  onBack: () => void
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 pt-6 sm:px-8">
        <button
          onClick={onBack}
          aria-label="Back to welcome"
          className="-ml-2 rounded-full p-2 text-ink-soft transition-colors hover:bg-paper"
        >
          <ChevronLeft size={22} />
        </button>
        <span className="eyebrow text-gold-ink">Step 1 of 2 • Getting Started</span>
      </header>

      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pt-8 sm:px-8">
        <div className="stagger">
          <p className="eyebrow flex items-center gap-1.5 text-mute">
            <Sparkles size={13} className="text-gold-ink" /> Calculation method
          </p>

          <h1 className="display mt-2 text-[1.95rem] leading-[1.15] text-ink sm:text-3xl">
            How would you like to calculate your zakat?
          </h1>

          <p className="mt-2.5 text-[0.95rem] leading-relaxed text-ink-soft">
            Choose how you want to provide your financial details. Both approaches use the exact same scholarly fiqh rules.
          </p>

          <div className="mt-8 space-y-4">
            {/* Option 1: Step-by-step questions */}
            <button
              onClick={onSelectQuestions}
              className="group relative flex w-full flex-col rounded-2xl border-2 border-hair bg-paper p-5 text-left transition-all duration-200 hover:border-deep/30 hover:shadow-md active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-deep/[0.06] text-ink transition-colors group-hover:bg-deep group-hover:text-white">
                    <ListChecks size={22} strokeWidth={2} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-ink">Step-by-step questions</span>
                    </div>
                    <span className="inline-block rounded-full bg-deep/[0.05] px-2.5 py-0.5 text-[11px] font-medium text-ink-soft">
                      Guided • ~2 minutes
                    </span>
                  </div>
                </div>
                <ArrowRight
                  size={19}
                  className="shrink-0 text-mute transition-all duration-200 group-hover:translate-x-1 group-hover:text-ink"
                />
              </div>

              <p className="mt-3.5 text-sm leading-relaxed text-ink-soft">
                Answer 6 clear questions covering your cash, gold, silver, investments, business stock, and debts. Perfect if you know your rough balances.
              </p>
            </button>

            {/* Option 2: Import bank spreadsheet / CSV */}
            <button
              onClick={onSelectImport}
              className="group relative flex w-full flex-col rounded-2xl border-2 border-hair bg-paper p-5 text-left transition-all duration-200 hover:border-gold-ink/50 hover:bg-gold-wash/30 hover:shadow-md active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gold-wash text-gold-ink transition-colors group-hover:bg-gold-ink group-hover:text-white">
                    <FileSpreadsheet size={22} strokeWidth={2} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-ink">Import bank spreadsheet / CSV</span>
                    </div>
                    <span className="inline-block rounded-full bg-gold-wash px-2.5 py-0.5 text-[11px] font-medium text-gold-ink">
                      Automated statement breakdown
                    </span>
                  </div>
                </div>
                <ArrowRight
                  size={19}
                  className="shrink-0 text-mute transition-all duration-200 group-hover:translate-x-1 group-hover:text-gold-ink"
                />
              </div>

              <p className="mt-3.5 text-sm leading-relaxed text-ink-soft">
                Upload a CSV export from your bank or bookkeeping tool. Mīzān will auto-tally your balances and screen income for purification.
              </p>
            </button>
          </div>

          {/* Privacy Guarantee Note */}
          <div className="mt-8 flex items-center justify-center gap-2 rounded-xl border border-hair/80 bg-deep/[0.02] p-3 text-xs text-mute">
            <Lock size={14} className="shrink-0 text-halal" />
            <span>100% Private on device. Files and calculations never leave your browser.</span>
          </div>
        </div>
      </main>
    </div>
  )
}
