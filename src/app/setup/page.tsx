'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, RotateCcw, Sparkles, Upload } from 'lucide-react'
import { MADHHABS, type Asset, type Madhhab } from '@/lib/types'
import { MADHHAB_PROFILES } from '@/lib/fiqh/madhhab-profiles'
import { extractBalancesFromCsv, parseCsv, toTransactions, type ColumnMap, type ExtractedBalances } from '@/lib/import/csv'
import { useStore } from '@/lib/store'
import { useZakat } from '@/lib/use-zakat'
import { useHydrated } from '@/lib/use-hydrated'
import { BigAmount, Choice, StepShell } from '@/components/step'
import { AnimatedMoney } from '@/components/animated-number'
import { money } from '@/components/ui'
import { CurrencySelect } from '@/components/currency-select'
import { Welcome } from '@/components/welcome'
import { SetupMethodChoice } from '@/components/setup-method-choice'
import { SetupSpreadsheetImport } from '@/components/setup-spreadsheet-import'
import { MadhhabInfoModal } from '@/components/madhhab-info-modal'
import { MetalAmountInput } from '@/components/metal-amount-input'
import { InvestmentScreeningInput } from '@/components/investment-screening-input'

/**
 * Setup wizard supporting both guided step-by-step questions and spreadsheet import.
 * Gold and Silver have separate dedicated inputs in grams.
 */
const STEPS = ['madhhab', 'cash', 'gold', 'silver', 'business', 'savings', 'debt', 'reveal'] as const
type Step = (typeof STEPS)[number]
type Stage = 'welcome' | 'method' | 'import' | 'wizard'

export default function Setup() {
  const hydrated = useHydrated()
  const router = useRouter()
  const store = useStore()
  const { prices } = useZakat()
  const fileInput = useRef<HTMLInputElement>(null)

  const [stage, setStage] = useState<Stage>('welcome')
  const [index, setIndex] = useState(0)
  const [madhhab, setMadhhab] = useState<Madhhab | null>(null)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [cash, setCash] = useState('')
  const [gold, setGold] = useState('')
  const [silver, setSilver] = useState('')
  const [business, setBusiness] = useState('')
  const [savings, setSavings] = useState('')
  const [debt, setDebt] = useState('')
  const [importStatus, setImportStatus] = useState<string | null>(null)

  const current: Step = STEPS[Math.min(index, STEPS.length - 1)]
  const total = STEPS.length - 1
  const currency = store.currency

  function handleCsvText(text: string) {
    const { rows, suggested } = parseCsv(text)
    if (suggested.description || suggested.amount || suggested.credit) {
      const txs = toTransactions(rows, suggested as ColumnMap, currency)
      const balances = extractBalancesFromCsv(
        rows,
        suggested as ColumnMap,
        currency,
        prices.goldPerGram,
        prices.silverPerGram
      )
      store.replaceTransactions(txs)
      if (balances.cash > 0) setCash(balances.cash.toFixed(2))
      if (balances.goldGrams > 0) setGold(balances.goldGrams.toFixed(2))
      if (balances.silverGrams > 0) setSilver(balances.silverGrams.toFixed(2))
      if (balances.businessStock > 0) setBusiness(balances.businessStock.toFixed(2))
      if (balances.investments > 0 || balances.savings > 0) {
        setSavings((balances.investments + balances.savings).toFixed(2))
      }
      if (balances.debts > 0) setDebt(balances.debts.toFixed(2))

      setImportStatus(`Imported ${txs.length} transactions from spreadsheet.`)
      setStage('wizard')
      setIndex(0) // Go to Madhhab selection
    }
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    handleCsvText(await file.text())
    e.target.value = ''
  }

  useEffect(() => {
    if (stage !== 'wizard' || current !== 'reveal' || !madhhab) return
    const num = (v: string) => Number.parseFloat(v) || 0
    const assets: Asset[] = []

    const entered = store.currency
    if (num(cash) > 0)
      assets.push({ id: 'setup-cash', kind: 'cash', label: 'Cash and bank', amount: num(cash), currency: entered })
    if (num(gold) > 0)
      assets.push({ id: 'setup-gold', kind: 'personal_jewelry', label: 'Gold you own', amount: num(gold) })
    if (num(silver) > 0)
      assets.push({ id: 'setup-silver', kind: 'silver', label: 'Silver you own', amount: num(silver) })
    if (num(business) > 0)
      assets.push({
        id: 'setup-business',
        kind: 'business_inventory',
        label: 'Business stock',
        amount: num(business),
        currency: entered,
        traderType: 'mudir',
      })
    if (num(savings) > 0)
      assets.push({
        id: 'setup-savings',
        kind: 'retirement',
        label: 'Investments and savings',
        amount: num(savings),
        currency: entered,
        accessible: true,
      })

    store.replaceSetupData(
      madhhab,
      assets,
      num(debt) > 0
        ? [
            {
              id: 'setup-debt',
              label: 'Debts due this year',
              amount: num(debt),
              dueWithinYear: num(debt),
              currency: entered,
            },
          ]
        : [],
    )
    // Runs once, on arrival at the result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, stage])

  if (!hydrated) return null

  // 1. Initial Welcome screen
  if (stage === 'welcome' && !store.onboarded) {
    return <Welcome onStart={() => setStage('method')} />
  }

  // 2. Method Selection screen: Ask if user wants to answer questions or import CSV
  if (stage === 'method' || (stage === 'welcome' && store.onboarded)) {
    return (
      <SetupMethodChoice
        onSelectQuestions={() => {
          setStage('wizard')
          setIndex(0)
        }}
        onSelectImport={() => {
          setStage('import')
        }}
        onBack={() => {
          if (store.onboarded) {
            router.replace('/settings')
          } else {
            setStage('welcome')
          }
        }}
      />
    )
  }

  // 3. Dedicated Spreadsheet Import Screen
  if (stage === 'import') {
    return (
      <SetupSpreadsheetImport
        currency={currency}
        goldPricePerGram={prices.goldPerGram}
        silverPricePerGram={prices.silverPerGram}
        onImportComplete={({ transactions, balances }) => {
          // Replace existing transactions cleanly without stacking duplicates
          store.replaceTransactions(transactions)

          // Pre-populate all extracted asset balances
          if (balances.cash > 0) setCash(balances.cash.toFixed(2))
          if (balances.goldGrams > 0) setGold(balances.goldGrams.toFixed(2))
          if (balances.silverGrams > 0) setSilver(balances.silverGrams.toFixed(2))
          if (balances.businessStock > 0) setBusiness(balances.businessStock.toFixed(2))
          if (balances.investments > 0 || balances.savings > 0) {
            setSavings((balances.investments + balances.savings).toFixed(2))
          }
          if (balances.debts > 0) setDebt(balances.debts.toFixed(2))

          const itemsFound: string[] = []
          if (balances.cash > 0) itemsFound.push('Cash')
          if (balances.goldGrams > 0) itemsFound.push('Gold')
          if (balances.silverGrams > 0) itemsFound.push('Silver')
          if (balances.investments > 0 || balances.savings > 0) itemsFound.push('Investments')
          if (balances.businessStock > 0) itemsFound.push('Business')
          if (balances.debts > 0) itemsFound.push('Debts')

          const summaryMsg =
            itemsFound.length > 0
              ? `Imported ${transactions.length} transactions (${itemsFound.join(', ')} auto-filled).`
              : `Imported ${transactions.length} transactions from spreadsheet.`

          setImportStatus(summaryMsg)
          setStage('wizard')
          setIndex(0)
        }}
        onBack={() => setStage('method')}
      />
    )
  }

  // 4. Wizard steps
  const next = () => setIndex((i) => i + 1)
  const shell = {
    step: index + 1,
    total,
    onBack:
      index > 0
        ? () => setIndex((i) => i - 1)
        : () => setStage('method'),
    onCta: next,
  }
  const skip = (clear: () => void) => (
    <button onClick={() => { clear(); next() }} className="text-sm text-ink-soft underline underline-offset-4">
      I don&apos;t have any
    </button>
  )

  switch (current) {
    case 'madhhab':
      return (
        <>
          <StepShell
            {...shell}
            title="Which madhhab (school of thought) do you follow?"
            hint={
              importStatus
                ? `${importStatus} Select your madhhab to apply its classical jurisprudence rulings.`
                : "The four classical madhāhib (schools of thought) work zakat out differently. Mīzān uses only the one you pick, and you can change it later."
            }
            cta="Continue"
            ctaDisabled={!madhhab}
            secondary={
              <button
                type="button"
                onClick={() => setShowInfoModal(true)}
                className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink transition-colors"
              >
                I&apos;m not sure (Learn more about the madhāhib / schools)
              </button>
            }
          >
            <div className="space-y-3">
              {MADHHABS.map((m) => (
                <Choice
                  key={m}
                  label={MADHHAB_PROFILES[m].label}
                  selected={madhhab === m}
                  onClick={() => setMadhhab(m)}
                />
              ))}
            </div>
          </StepShell>

          <MadhhabInfoModal
            isOpen={showInfoModal}
            onClose={() => setShowInfoModal(false)}
            onSelect={(m) => {
              setMadhhab(m)
              setShowInfoModal(false)
            }}
            selectedMadhhab={madhhab}
          />
        </>
      )

    case 'cash':
      return (
        <StepShell
          {...shell}
          title="How much do you have in cash?"
          hint="Chequing, savings and cash at home, added together. A rough figure is fine."
          cta="Continue"
          ctaDisabled={!cash}
          secondary={
            importStatus ? (
              <button
                onClick={() => setStage('import')}
                className="inline-flex items-center gap-1.5 text-xs text-ink-soft underline underline-offset-4 hover:text-ink"
              >
                <RotateCcw size={12} /> Re-import or replace spreadsheet
              </button>
            ) : (
              <button
                onClick={() => setStage('import')}
                className="inline-flex items-center gap-1.5 text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
              >
                <Upload size={13} /> Or import a spreadsheet
              </button>
            )
          }
        >
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={onFileSelected}
          />
          {importStatus && (
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-halal/30 bg-halal/10 px-3 py-1 text-xs text-halal">
              <Check size={13} />
              <span>Pre-filled from imported spreadsheet ({importStatus})</span>
            </div>
          )}
          <BigAmount value={cash} onChange={setCash} currency={currency} />
        </StepShell>
      )

    case 'gold':
      return (
        <StepShell
          {...shell}
          title="How much gold do you own?"
          hint="Including jewellery you wear, coins, or gold bullion. A typical wedding set is around 40 grams. Whether personal jewellery counts depends on your madhhab (school of thought)."
          cta="Continue"
          ctaDisabled={!gold}
          secondary={skip(() => setGold(''))}
        >
          <MetalAmountInput
            metal="gold"
            grams={gold}
            onChangeGrams={setGold}
            pricePerGram={prices.goldPerGram}
            currency={currency}
            nisabGrams={store.nisabPreset === 'precise' ? 87.48 : 85}
          />
        </StepShell>
      )

    case 'silver':
      return (
        <StepShell
          {...shell}
          title="How much silver do you own?"
          hint="Including silver jewellery, silverware, coins, or silver bars. Silver has its own Nisab threshold."
          cta="Continue"
          ctaDisabled={!silver}
          secondary={skip(() => setSilver(''))}
        >
          <MetalAmountInput
            metal="silver"
            grams={silver}
            onChangeGrams={setSilver}
            pricePerGram={prices.silverPerGram}
            currency={currency}
            nisabGrams={store.nisabPreset === 'precise' ? 612.36 : 595}
          />
        </StepShell>
      )

    case 'business':
      return (
        <StepShell
          {...shell}
          title="What is your business stock worth?"
          hint="Goods you bought to resell, valued at what you could sell them for today."
          cta="Continue"
          ctaDisabled={!business}
          secondary={skip(() => setBusiness(''))}
        >
          <BigAmount value={business} onChange={setBusiness} currency={currency} />
        </StepShell>
      )

    case 'savings':
      return (
        <StepShell
          {...shell}
          title="How much is in investments or savings?"
          hint="TFSA, RRSP, shares, Shariah ETFs or index funds. Screen for Halal compliance and dividend purification."
          cta="Continue"
          ctaDisabled={!savings}
          secondary={skip(() => setSavings(''))}
        >
          <InvestmentScreeningInput value={savings} onChangeValue={setSavings} currency={currency} />
        </StepShell>
      )

    case 'debt':
      return (
        <StepShell
          {...shell}
          title="How much do you owe this year?"
          hint="Loan or card payments, rent owed, bills due. Not a whole mortgage, just this year's part."
          cta="See my zakat"
          ctaDisabled={!debt}
          secondary={skip(() => setDebt(''))}
        >
          <BigAmount value={debt} onChange={setDebt} currency={currency} />
        </StepShell>
      )

    default:
      return <Reveal onDone={() => router.replace('/')} />
  }
}

/** The payoff. One number, counted up, with the reason underneath. */
function Reveal({ onDone }: { onDone: () => void }) {
  const store = useStore()
  const { result } = useZakat()
  const [shown, setShown] = useState(0)

  useEffect(() => {
    const id = setTimeout(() => setShown(result.projectedZakat || result.zakatDue), 250)
    return () => clearTimeout(id)
  }, [result])

  const pool = result.pools[0]
  const formatted = money(shown, result.currency)
  const nisab = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: result.currency,
    maximumFractionDigits: 0,
  }).format(pool?.nisabValue ?? 0)

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-12 sm:px-8">
        <div className="rise">
          <p className="eyebrow flex items-center gap-2 text-halal">
            <Sparkles size={14} /> Your zakat
          </p>

          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-4">
            <AnimatedMoney
              value={shown}
              currency={result.currency}
              className={`display leading-none text-ink ${
                formatted.length > 15 ? 'text-4xl' : formatted.length > 11 ? 'text-5xl' : 'text-6xl sm:text-7xl'
              }`}
            />
            <CurrencySelect value={store.currency} onChange={store.setCurrency} />
          </div>
          <p className="mt-2 text-xs text-mute">
            Not your currency? Change it above and everything is converted.
          </p>

          <p className="mt-5 text-[0.95rem] leading-relaxed text-ink-soft">
            {result.meetsNisab ? (
              <>
                That is 2.5% of the wealth you hold above the threshold of{' '}
                <span className="tnum font-medium text-ink">{nisab}</span>, worked out using{' '}
                {MADHHAB_PROFILES[result.madhhab].label} rules.
              </>
            ) : (
              <>
                You are below the {MADHHAB_PROFILES[result.madhhab].label} threshold of{' '}
                <span className="tnum font-medium text-ink">{nisab}</span> this year, so no zakat is due.
              </>
            )}
          </p>
        </div>
      </main>

      <footer className="sticky bottom-0 border-t border-hair bg-canvas/90 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-3">
          <button
            onClick={onDone}
            className="w-full rounded-full bg-deep py-4 text-base font-semibold text-white shadow-[0_4px_0_0_#000] transition-all duration-150 hover:bg-lift active:translate-y-[3px] active:shadow-[0_1px_0_0_#000]"
          >
            Done
          </button>
          <Link href="/income" className="w-full">
            <button className="w-full rounded-full border border-hair bg-paper py-3.5 text-base font-medium text-ink transition-colors hover:bg-canvas">
              View Income &amp; Purifications
            </button>
          </Link>
        </div>
      </footer>
    </div>
  )
}
