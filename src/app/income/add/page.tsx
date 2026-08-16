'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import type { EnrichmentQuestion, IncomeSourceType, Transaction } from '@/lib/types'
import { REF } from '@/lib/fiqh/fiqh-references'
import { employerQuestion } from '@/lib/classify/rules'
import { classify } from '@/lib/classify/engine'
import { useStore } from '@/lib/store'
import { useHydrated } from '@/lib/use-hydrated'
import { BigAmount, Choice, StepShell } from '@/components/step'
import { money } from '@/components/ui'

/**
 * Asking what kind of income it was up front tells the engine which rules apply.
 * Each source either settles immediately with full fiqh citations or leads to
 * the specific question that decides if it is Halal, Haram, Mixed, Tentative,
 * or Needs Information.
 */
type Source = {
  id: string
  label: string
  detail: string
  sourceType: IncomeSourceType
  settles?: Partial<Transaction>
  question?: EnrichmentQuestion
}

const tenantQuestion: EnrichmentQuestion = {
  key: 'tenant-use',
  prompt: 'What is the property used for?',
  options: [
    {
      value: 'home',
      label: 'Residential home, or ordinary permissible business',
      sets: { verdict: 'HALAL', basis: 'Rent from permissible property use is lawful.', citation: REF.lawfulEarning },
    },
    {
      value: 'mixed_commercial',
      label: 'Mixed commercial use (some non-permissible tenants)',
      sets: {
        verdict: 'MIXED',
        haramRatio: 0.1,
        haramRatioIsEstimate: true,
        mixedTreatment: 'disposed',
        basis: 'Rental income containing non-permissible portions must have the impermissible share purified.',
        citation: REF.mixedIncomePurification,
      },
    },
    {
      value: 'haram',
      label: 'A bar, casino, liquor store, or forbidden activity',
      sets: {
        verdict: 'HARAM',
        basis: 'Leasing property specifically for a forbidden activity is prohibited. Income must be purified in full.',
        citation: REF.employmentInHaramIndustry,
      },
    },
  ],
}

const holdingQuestion: EnrichmentQuestion = {
  key: 'holding-screen',
  prompt: 'What type of investment or dividend is this?',
  options: [
    {
      value: 'compliant',
      label: 'Shariah-screened shares or Islamic fund',
      sets: { verdict: 'HALAL', basis: 'Screened holdings pass Shariah compliance criteria.', citation: REF.lawfulEarning },
    },
    {
      value: 'conventional',
      label: 'Conventional equities or index fund (contains mixed revenue)',
      sets: {
        verdict: 'MIXED',
        haramRatio: 0.05,
        haramRatioIsEstimate: true,
        mixedTreatment: 'disposed',
        basis: 'Conventional funds typically contain non-compliant interest or revenue; standard purification is required.',
        citation: REF.mixedIncomePurification,
      },
    },
    {
      value: 'bond',
      label: 'Bonds, GICs, or guaranteed fixed-return savings product',
      sets: { verdict: 'HARAM', basis: 'A guaranteed return on a loan/deposit is riba, prohibited in Islam. 100% must be purified.', citation: REF.ribaProhibited },
    },
    {
      value: 'crypto',
      label: 'Permissible Cryptocurrency trading/staking profit',
      sets: { verdict: 'HALAL', basis: 'Cryptocurrency held as a permissible digital asset without interest mechanisms.', citation: REF.lawfulEarning },
    },
  ],
}

const businessQuestion: EnrichmentQuestion = {
  key: 'business-goods',
  prompt: 'What does your business sell or provide?',
  options: [
    {
      value: 'all',
      label: '100% permissible products and services',
      sets: { verdict: 'HALAL', basis: 'Proceeds of permissible trade and work are lawful.', citation: REF.lawfulEarning },
    },
    {
      value: 'some',
      label: 'Mixed products (contains some non-halal items)',
      sets: {
        verdict: 'MIXED',
        haramRatio: 0.05,
        haramRatioIsEstimate: true,
        mixedTreatment: 'disposed',
        basis: 'Income containing non-permissible sales requires separating and purifying the non-halal portion.',
        citation: REF.mixedIncomePurification,
      },
    },
    {
      value: 'haram_goods',
      label: 'Prohibited goods (alcohol, gambling, pork, adult services)',
      sets: {
        verdict: 'HARAM',
        basis: 'Trade in prohibited goods is unlawful under Islamic jurisprudence. Income must be disposed of.',
        citation: REF.khamrProhibited,
      },
    },
  ],
}

const SOURCES: Source[] = [
  {
    id: 'employment',
    label: 'Wages or salary',
    detail: 'From an employer, contract, or job',
    sourceType: 'employment',
    question: employerQuestion,
  },
  {
    id: 'business',
    label: 'My own business / Freelancing',
    detail: 'Client fees, store sales, self-employment',
    sourceType: 'business',
    question: businessQuestion,
  },
  {
    id: 'rental',
    label: 'Rent from a property',
    detail: 'Tenants or commercial lease payments',
    sourceType: 'rental',
    question: tenantQuestion,
  },
  {
    id: 'investment',
    label: 'Investment or dividend',
    detail: 'Shares, mutual funds, ETFs, dividends',
    sourceType: 'investment',
    question: holdingQuestion,
  },
  {
    id: 'gift',
    label: 'Gift, family support, or inheritance',
    detail: 'Money received from family or relatives',
    sourceType: 'gift',
    settles: { verdict: 'HALAL', basis: 'Gifts and inheritances are lawful to receive.', citation: REF.giftsLawful },
  },
  {
    id: 'benefit',
    label: 'Government benefit or tax refund',
    detail: 'Child benefit, GST credit, EI, tax return',
    sourceType: 'benefit',
    settles: {
      verdict: 'HALAL',
      basis: 'Government assistance and tax refunds return lawful money to you.',
      citation: REF.lawfulEarning,
    },
  },
  {
    id: 'interest',
    label: 'Bank interest / APY return',
    detail: 'Interest paid on a savings or chequing balance',
    sourceType: 'interest',
    settles: {
      verdict: 'HARAM',
      basis: 'A return paid for the use of deposited money is riba. It must be set aside to purify in full and excluded from zakat.',
      citation: REF.ribaProhibited,
    },
  },
  {
    id: 'gambling',
    label: 'Lottery, casino, or betting prize',
    detail: 'Winnings from games of chance',
    sourceType: 'gambling',
    settles: {
      verdict: 'HARAM',
      basis: 'Winnings from gambling and betting are maysir. They must be disposed of in full and do not count as zakat.',
      citation: REF.maysirProhibited,
    },
  },
  {
    id: 'other',
    label: 'Something else / Uncategorized',
    detail: 'Describe the origin and we will classify it',
    sourceType: 'other',
  },
]

export default function AddIncome() {
  const hydrated = useHydrated()
  const router = useRouter()
  const { currency, addTransactions, updateTransaction, learned } = useStore()

  const [stage, setStage] = useState<'source' | 'amount' | 'who' | 'question' | 'mixed_config' | 'done'>('source')
  const [source, setSource] = useState<Source | null>(null)
  const [amount, setAmount] = useState('')
  const [who, setWho] = useState('')
  const [picked, setPicked] = useState<number | null>(null)
  const [mixedRatio, setMixedRatio] = useState('5')
  const [mixedTreatment, setMixedTreatment] = useState<'disposed' | 'retained'>('disposed')
  const [pickedCurrency, setPickedCurrency] = useState<string | null>(null)

  if (!hydrated) return null

  const entryCurrency = pickedCurrency ?? currency
  const needsWho = source?.id === 'employment' || source?.id === 'business' || source?.id === 'rental' || source?.id === 'investment' || source?.id === 'other'
  
  const stages: typeof stage[] = [
    'source',
    'amount',
    ...(needsWho ? (['who'] as const) : []),
    ...(source?.question ? (['question'] as const) : []),
  ]
  const total = source ? stages.length : 3
  const step = Math.max(1, stages.indexOf(stage) + 1)

  function save(extra: Partial<Transaction>) {
    if (!source) return null
    const id = `manual-${Date.now()}`
    const description = who.trim() || source.label
    const base: Transaction = {
      id,
      date: new Date().toISOString().slice(0, 10),
      description,
      amount: Number.parseFloat(amount) || 0,
      currency: entryCurrency,
      sourceType: source.sourceType,
    }

    const seeded = source.id === 'other' ? classify(base, learned) : base
    addTransactions([{ ...seeded, ...extra, classifiedBy: 'user' }])
    return id
  }

  const reset = () => {
    setStage('source')
    setSource(null)
    setAmount('')
    setWho('')
    setPicked(null)
    setMixedRatio('5')
    setMixedTreatment('disposed')
    setPickedCurrency(null)
  }

  if (stage === 'done') {
    return (
      <Saved
        amount={Number.parseFloat(amount) || 0}
        currency={entryCurrency}
        onAnother={reset}
        onDone={() => router.replace('/income')}
      />
    )
  }

  if (stage === 'source') {
    return (
      <StepShell
        step={step}
        total={total}
        onBack={() => router.replace('/income')}
        title="Where did this income come from?"
        hint="Pick the category of income. We will check whether the source is Halal, Haram, Mixed, Tentative, or requires more details."
        cta="Continue"
        ctaDisabled={!source}
        onCta={() => setStage('amount')}
      >
        <div className="space-y-2.5">
          {SOURCES.map((s) => (
            <Choice
              key={s.id}
              label={s.label}
              detail={s.detail}
              selected={source?.id === s.id}
              onClick={() => setSource(s)}
            />
          ))}
        </div>
      </StepShell>
    )
  }

  if (stage === 'amount') {
    return (
      <StepShell
        step={step}
        total={total}
        onBack={() => setStage('source')}
        title="How much was received?"
        hint="The total amount from this source. Tap the currency if it was received in another currency."
        cta="Continue"
        ctaDisabled={!amount}
        onCta={() => {
          if (needsWho) return setStage('who')
          if (source?.question) return setStage('question')
          save(source?.settles ?? {})
          setStage('done')
        }}
      >
        <BigAmount
          value={amount}
          onChange={setAmount}
          currency={entryCurrency}
          onCurrencyChange={setPickedCurrency}
        />
      </StepShell>
    )
  }

  if (stage === 'who') {
    const placeholder =
      source?.id === 'employment'
        ? 'Employer name (e.g. Acme Corp)'
        : source?.id === 'business'
          ? 'Business or client name'
          : source?.id === 'rental'
            ? 'Property or tenant name'
            : source?.id === 'investment'
              ? 'Fund, ticker, or brokerage'
              : 'Short description'

    return (
      <StepShell
        step={step}
        total={total}
        onBack={() => setStage('amount')}
        title={source?.id === 'employment' ? 'Who pays this income?' : 'What is the source or counterparty?'}
        hint="Naming the payer or business helps classify and verify the transaction origin."
        cta="Continue"
        ctaDisabled={false}
        onCta={() => {
          if (source?.question) return setStage('question')
          save(source?.settles ?? {})
          setStage('done')
        }}
      >
        <input
          autoFocus
          value={who}
          onChange={(e) => setWho(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl border-2 border-hair bg-paper px-4 py-4 text-base text-ink outline-none transition-colors placeholder:text-mute focus:border-deep"
        />
      </StepShell>
    )
  }

  if (stage === 'question') {
    const question = source!.question!
    return (
      <StepShell
        step={step}
        total={total}
        onBack={() => setStage(needsWho ? 'who' : 'amount')}
        title={question.prompt}
        hint="This determines the Islamic jurisprudence ruling for your income."
        cta="Save"
        ctaDisabled={picked === null}
        onCta={() => {
          if (picked === null) return
          const selectedOption = question.options[picked]
          if (selectedOption.sets.verdict === 'MIXED') {
            setStage('mixed_config')
            return
          }
          const id = save(selectedOption.sets)
          if (id) updateTransaction(id, selectedOption.sets, { learn: true })
          setStage('done')
        }}
      >
        <div className="space-y-3">
          {question.options.map((o, n) => (
            <Choice key={o.value} label={o.label} selected={picked === n} onClick={() => setPicked(n)} />
          ))}
        </div>
      </StepShell>
    )
  }

  // Mixed config stage
  const selectedOption = source!.question!.options[picked!]
  return (
    <StepShell
      step={step + 1}
      total={total + 1}
      onBack={() => setStage('question')}
      title="Mixed Income Treatment"
      hint="Specify the non-permissible percentage and whether you have separated/disposed of it."
      cta="Save Income"
      ctaDisabled={!mixedRatio}
      onCta={() => {
        const ratio = (Number.parseFloat(mixedRatio) || 5) / 100
        const patch: Partial<Transaction> = {
          ...selectedOption.sets,
          verdict: 'MIXED',
          haramRatio: ratio,
          haramRatioIsEstimate: false,
          mixedTreatment,
        }
        const id = save(patch)
        if (id) updateTransaction(id, patch, { learn: true })
        setStage('done')
      }}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink">
            Non-permissible share to purify (%)
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              value={mixedRatio}
              onChange={(e) => setMixedRatio(e.target.value.replace(/[^0-9.]/g, ''))}
              inputMode="decimal"
              className="tnum w-28 rounded-xl border border-hair bg-canvas px-3 py-2 text-base font-semibold text-ink"
            />
            <span className="text-sm font-medium text-ink-soft">%</span>
            <span className="ml-2 text-xs text-mute">(Standard estimate is 5%)</span>
          </div>
        </div>

        <div className="pt-2">
          <p className="text-sm font-medium text-ink">Did you separate & dispose of this haram portion?</p>
          <p className="mt-0.5 text-xs text-mute">
            Per hackathon fiqh rules: if disposed of, zakat is only calculated on the remaining halal portion. If retained, the full mixed wealth remains in the zakatable base.
          </p>
          <div className="mt-3 space-y-2">
            <Choice
              label="Yes, separated and given away in charity (Purified)"
              detail="Zakat is calculated only on the remaining lawful income."
              selected={mixedTreatment === 'disposed'}
              onClick={() => setMixedTreatment('disposed')}
            />
            <Choice
              label="No, still held with my wealth (Retained)"
              detail="The entire mixed amount remains included in your zakatable base."
              selected={mixedTreatment === 'retained'}
              onClick={() => setMixedTreatment('retained')}
            />
          </div>
        </div>
      </div>
    </StepShell>
  )
}

function Saved({
  amount,
  currency,
  onAnother,
  onDone,
}: {
  amount: number
  currency: string
  onAnother: () => void
  onDone: () => void
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-12 text-center sm:px-8">
        <div className="rise">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-halal/12 text-halal">
            <Check size={30} strokeWidth={2.5} />
          </div>
          <h1 className="display mt-6 text-3xl text-ink">{money(amount, currency)} recorded</h1>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">
            Income categorized, verified against Islamic rulings, and counted towards your zakat and purification totals.
          </p>
        </div>
      </main>

      <footer className="sticky bottom-0 border-t border-hair bg-canvas/90 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-3">
          <button
            onClick={onAnother}
            className="w-full rounded-full bg-deep py-4 text-base font-semibold text-white shadow-[0_4px_0_0_#000] transition-all duration-150 hover:bg-lift active:translate-y-[3px] active:shadow-[0_1px_0_0_#000]"
          >
            Add another income source
          </button>
          <button
            onClick={onDone}
            className="w-full rounded-full border border-hair bg-paper py-3.5 text-base font-medium text-ink transition-colors hover:bg-canvas"
          >
            View all income & results
          </button>
        </div>
      </footer>
    </div>
  )
}
