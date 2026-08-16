'use client'

import { useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Coins,
  FileSpreadsheet,
  RotateCcw,
  Upload,
} from 'lucide-react'
import { extractBalancesFromCsv, parseCsv, toTransactions, type ColumnMap, type ExtractedBalances } from '@/lib/import/csv'
import type { Transaction, Verdict } from '@/lib/types'
import { Card, VERDICT_META, money } from './ui'

const SAMPLE_CSV_DATA = `date,description,amount,keyword
2025-08-18,Freelance Client Project Payment,3250.00,salary
2025-09-25,High Interest Savings Payout,74.50,interest_income
2025-10-14,Monthly Professional Consulting,4500.00,freelance
2025-11-08,Marketplace Payout (Mixed Sales),1800.00,mixed_income
2025-12-02,Dividend Distribution,380.00,dividend
2026-01-15,Tax Refund Deposit,1200.00,tax_refund`

export function SetupSpreadsheetImport({
  currency,
  onImportComplete,
  onBack,
  goldPricePerGram = 176,
  silverPricePerGram = 2.2,
}: {
  currency: string
  onImportComplete: (data: {
    transactions: Transaction[]
    balances: ExtractedBalances
    rawText: string
  }) => void
  onBack: () => void
  goldPricePerGram?: number
  silverPricePerGram?: number
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsedData, setParsedData] = useState<{
    transactions: Transaction[]
    balances: ExtractedBalances
    rawText: string
    rowCount: number
  } | null>(null)

  function processCsvText(text: string, sourceName = 'bank_statement.csv') {
    setError(null)
    try {
      const { rows, suggested, headers } = parseCsv(text)

      if (rows.length === 0) {
        setError('The uploaded CSV file is empty. Please provide a file with transaction rows.')
        return
      }

      if (!suggested.description && !suggested.amount && !suggested.credit) {
        setError(
          `Could not recognize transaction columns in this file. Found headers: ${headers.join(', ')}. Please ensure there is a Description and Amount/Credit column.`
        )
        return
      }

      const txs = toTransactions(rows, suggested as ColumnMap, currency)
      const balances = extractBalancesFromCsv(
        rows,
        suggested as ColumnMap,
        currency,
        goldPricePerGram,
        silverPricePerGram
      )

      if (txs.length === 0 && balances.cash === 0 && balances.goldGrams === 0 && balances.investments === 0) {
        setError('No valid data could be parsed from this file. Check that your CSV contains valid amounts.')
        return
      }

      setFileName(sourceName)
      setParsedData({
        transactions: txs,
        balances,
        rawText: text,
        rowCount: txs.length || rows.length,
      })
    } catch {
      setError('An unexpected error occurred while parsing the CSV. Please ensure the file is in valid CSV format.')
    }
  }

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    processCsvText(text, file.name)
    e.target.value = ''
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      const text = await file.text()
      processCsvText(text, file.name)
    }
  }

  function loadSampleData() {
    processCsvText(SAMPLE_CSV_DATA, 'sample_bank_statement.csv')
  }

  function handleProceed() {
    if (!parsedData) return
    onImportComplete({
      transactions: parsedData.transactions,
      balances: parsedData.balances,
      rawText: parsedData.rawText,
    })
  }

  const incomeTxs = parsedData ? parsedData.transactions.filter((t) => t.amount > 0) : []
  const halalCount = incomeTxs.filter((t) => t.verdict === 'HALAL').length
  const flaggedCount = incomeTxs.filter((t) => t.verdict === 'HARAM' || t.verdict === 'MIXED').length
  const needsReviewCount = incomeTxs.filter(
    (t) => t.verdict === 'NEEDS_INFO' || t.verdict === 'UNCERTAIN' || !t.verdict
  ).length

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 pt-6 sm:px-8">
        <button
          onClick={onBack}
          aria-label="Back"
          className="-ml-2 rounded-full p-2 text-ink-soft transition-colors hover:bg-paper"
        >
          <ChevronLeft size={22} />
        </button>
        <span className="eyebrow text-gold-ink">Step 1 of 2 • Spreadsheet Import</span>
      </header>

      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pt-6 pb-28 sm:px-8">
        <div className="stagger">
          <p className="eyebrow flex items-center gap-1.5 text-mute">
            <FileSpreadsheet size={14} className="text-gold-ink" /> Instant Data Import
          </p>

          <h1 className="display mt-2 text-[1.95rem] leading-[1.15] text-ink sm:text-3xl">
            Import your transaction spreadsheet
          </h1>

          <p className="mt-2.5 text-[0.95rem] leading-relaxed text-ink-soft">
            Upload your bank statement or CSV. We will calculate your cash balances and prepare income for Islamic purification checks.
          </p>

          {!parsedData ? (
            <div className="mt-7 space-y-4">
              {/* Dropzone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
                  dragActive
                    ? 'border-gold-ink bg-gold-wash/50 scale-[1.01]'
                    : 'border-hair bg-paper hover:border-ink-soft/30 hover:bg-paper/80'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  className="hidden"
                  onChange={handleFileInput}
                />

                <div className="flex size-14 items-center justify-center rounded-2xl bg-deep/[0.05] text-ink">
                  <Upload size={24} strokeWidth={2} />
                </div>

                <p className="mt-4 text-base font-semibold text-ink">
                  Click to select or drag &amp; drop your CSV
                </p>
                <p className="mt-1 text-xs text-mute">Standard .CSV exports up to 10 MB</p>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-ink-soft">
                  <span className="rounded-md bg-canvas px-2 py-0.5 border border-hair">TD</span>
                  <span className="rounded-md bg-canvas px-2 py-0.5 border border-hair">RBC</span>
                  <span className="rounded-md bg-canvas px-2 py-0.5 border border-hair">Scotiabank</span>
                  <span className="rounded-md bg-canvas px-2 py-0.5 border border-hair">CIBC</span>
                  <span className="rounded-md bg-canvas px-2 py-0.5 border border-hair">BMO</span>
                  <span className="rounded-md bg-canvas px-2 py-0.5 border border-hair">Chase</span>
                  <span className="rounded-md bg-canvas px-2 py-0.5 border border-hair">Custom CSV</span>
                </div>
              </div>

              {/* Sample loader */}
              <div className="flex items-center justify-between rounded-xl border border-hair bg-paper p-3.5">
                <div>
                  <p className="text-xs font-medium text-ink">Want to test how it works first?</p>
                  <p className="text-[11px] text-mute">Load a sample Canadian bank transaction dataset</p>
                </div>
                <button
                  type="button"
                  onClick={loadSampleData}
                  className="rounded-full bg-deep/[0.06] px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-deep hover:text-white"
                >
                  Try Sample CSV
                </button>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-haram/30 bg-haram/5 p-3.5 text-xs text-haram">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
            </div>
          ) : (
            /* Parsed Summary State */
            <div className="mt-6 space-y-5">
              {/* Success Badge */}
              <div className="flex items-center justify-between rounded-2xl border border-halal/30 bg-halal/5 p-4">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={20} className="text-halal" />
                  <div>
                    <p className="text-sm font-medium text-ink">Spreadsheet loaded successfully</p>
                    <p className="text-xs text-mute">
                      {fileName} • {parsedData.rowCount} transactions
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setParsedData(null)}
                  className="inline-flex items-center gap-1 text-xs text-ink-soft underline hover:text-ink"
                >
                  <RotateCcw size={12} /> Replace
                </button>
              </div>

              {/* Metrics Card */}
              <Card className="p-5 space-y-4">
                <div className="flex items-baseline justify-between border-b border-hair pb-4">
                  <div>
                    <span className="eyebrow text-mute">Calculated Net Cash</span>
                    <p className="display mt-1 text-3xl font-medium text-ink">
                      {money(parsedData.balances.cash, currency)}
                    </p>
                  </div>
                  <span className="rounded-full bg-halal/10 px-2.5 py-1 text-xs font-medium text-halal">
                    Auto-fills Setup Steps
                  </span>
                </div>

                {/* Additional Extracted Balances if present */}
                {(parsedData.balances.goldGrams > 0 ||
                  parsedData.balances.silverGrams > 0 ||
                  parsedData.balances.investments > 0 ||
                  parsedData.balances.savings > 0 ||
                  parsedData.balances.businessStock > 0 ||
                  parsedData.balances.debts > 0) && (
                  <div className="rounded-xl bg-canvas p-3 border border-hair/80 text-xs space-y-1.5">
                    <p className="font-semibold text-ink flex items-center gap-1.5">
                      <Coins size={14} className="text-gold-ink" /> Extracted Asset Balances:
                    </p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-ink-soft pt-1">
                      {parsedData.balances.goldGrams > 0 && (
                        <div>
                          Gold: <strong>{parsedData.balances.goldGrams.toFixed(2)}g</strong>
                        </div>
                      )}
                      {parsedData.balances.silverGrams > 0 && (
                        <div>
                          Silver: <strong>{parsedData.balances.silverGrams.toFixed(2)}g</strong>
                        </div>
                      )}
                      {parsedData.balances.investments > 0 && (
                        <div>
                          Investments: <strong>{money(parsedData.balances.investments, currency)}</strong>
                        </div>
                      )}
                      {parsedData.balances.savings > 0 && (
                        <div>
                          Savings/RRSP: <strong>{money(parsedData.balances.savings, currency)}</strong>
                        </div>
                      )}
                      {parsedData.balances.businessStock > 0 && (
                        <div>
                          Business Stock: <strong>{money(parsedData.balances.businessStock, currency)}</strong>
                        </div>
                      )}
                      {parsedData.balances.debts > 0 && (
                        <div>
                          Debts Due: <strong>{money(parsedData.balances.debts, currency)}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-canvas p-2.5 border border-hair/60">
                    <p className="text-xs text-mute">Halal</p>
                    <p className="mt-0.5 text-base font-semibold text-halal">{halalCount}</p>
                  </div>
                  <div className="rounded-xl bg-canvas p-2.5 border border-hair/60">
                    <p className="text-xs text-mute">Purification</p>
                    <p className="mt-0.5 text-base font-semibold text-haram">{flaggedCount}</p>
                  </div>
                  <div className="rounded-xl bg-canvas p-2.5 border border-hair/60">
                    <p className="text-xs text-mute">Pending Review</p>
                    <p className="mt-0.5 text-base font-semibold text-ink-soft">{needsReviewCount}</p>
                  </div>
                </div>
              </Card>

              {/* Preview Table */}
              {parsedData.transactions.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-mute mb-2">
                    Preview ({Math.min(4, parsedData.transactions.length)} of {parsedData.transactions.length} rows)
                  </p>
                  <div className="divide-y divide-hair rounded-xl border border-hair bg-paper overflow-hidden">
                    {parsedData.transactions.slice(0, 4).map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 text-xs">
                        <div className="max-w-[65%] truncate">
                          <p className="font-medium text-ink truncate">{tx.description}</p>
                          <p className="text-[11px] text-mute">{tx.date}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${tx.amount < 0 ? 'text-mute' : 'text-ink'}`}>
                            {money(tx.amount, currency)}
                          </p>
                          {tx.verdict && (
                            <span
                              className={`text-[10px] ${
                                VERDICT_META[tx.verdict as Verdict]?.color || 'text-mute'
                              }`}
                            >
                              {VERDICT_META[tx.verdict as Verdict]?.label || tx.verdict}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Sticky Bottom Actions */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-hair bg-canvas/95 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-2.5">
          {parsedData ? (
            <button
              onClick={handleProceed}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-deep py-4 text-base font-semibold text-white shadow-[0_4px_0_0_#000] transition-all duration-150 hover:bg-lift active:translate-y-[3px] active:shadow-[0_1px_0_0_#000]"
            >
              Continue with Imported Data <ArrowRight size={18} />
            </button>
          ) : (
            <button
              onClick={onBack}
              className="w-full rounded-full border border-hair bg-paper py-3.5 text-sm font-medium text-ink-soft transition-colors hover:bg-canvas hover:text-ink"
            >
              Back to method selection
            </button>
          )}
        </div>
      </footer>
    </div>
  )
}
