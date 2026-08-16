'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useZakat } from '@/lib/use-zakat'
import { useHydrated } from '@/lib/use-hydrated'
import { needsAi } from '@/lib/classify/engine'
import { ThresholdRule } from '@/components/threshold-rule'
import { AnimatedMoney } from '@/components/animated-number'
import { Button, Card, Eyebrow, money } from '@/components/ui'

export default function Dashboard() {
  const hydrated = useHydrated()
  const router = useRouter()
  const onboarded = useStore((s) => s.onboarded)
  const transactions = useStore((s) => s.transactions)
  const assets = useStore((s) => s.assets)
  const { result, axisMax } = useZakat()

  useEffect(() => {
    if (hydrated && !onboarded) router.replace('/setup')
  }, [hydrated, onboarded, router])

  if (!hydrated) return null

  const pool = result.pools[0]
  const income = transactions.filter((t) => t.amount > 0)
  const open = transactions.filter((t) => t.verdict === 'NEEDS_INFO' || t.verdict === 'UNCERTAIN' || needsAi(t))

  if (assets.length === 0 && transactions.length === 0) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-16 sm:px-8">
        <div className="stagger">
          <h1 className="display text-4xl leading-[1.15] text-ink">Work out your zakat, properly.</h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">
            Six short questions about what you hold. Then a figure you can actually check, worked out using
            your school&apos;s rules, with the reason for every step.
          </p>
          <Link href="/setup" className="mt-8 block">
            <button className="w-full rounded-full bg-deep py-4 text-base font-semibold text-white shadow-[0_4px_0_0_#000] transition-all duration-150 hover:bg-lift active:translate-y-[3px] active:shadow-[0_1px_0_0_#000]">
              Get started
            </button>
          </Link>
          <p className="mt-5 text-sm text-mute">
            Takes about a minute. Everything stays on this device, with no account and nothing uploaded.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
      <div className="stagger">
        <section className="hero rounded-card p-6 text-white sm:p-8">
          <div className="relative flex flex-wrap items-baseline justify-between gap-2">
            <Eyebrow className="!text-white/50">Zakat due</Eyebrow>
            <p className="text-xs text-white/50">
              {result.hawl.complete
                ? `Due since ${result.hawl.hijriDue}`
                : `${result.hawl.daysRemaining} days left`}
            </p>
          </div>

          <AnimatedMoney
            value={result.zakatDue || result.projectedZakat}
            currency={result.currency}
            className="display relative mt-2 block text-[3.5rem] leading-[0.95] text-gold sm:text-6xl"
          />
          <p className="relative mt-3 text-sm leading-relaxed text-white/60">
            2.5% of the wealth you have held for a lunar year.
          </p>

          {pool && (
            <div className="relative mt-7 border-t border-white/10 pt-6">
              <ThresholdRule
                wealth={pool.net}
                nisab={pool.nisabValue}
                axisMax={axisMax}
                currency={result.currency}
              />
            </div>
          )}
        </section>

        {result.purificationDue > 0 && (
          <Card className="mt-3 flex items-center justify-between gap-4 p-5">
            <div>
              <p className="text-sm font-medium text-ink">Set aside to purify</p>
              <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">
                Income that was not lawfully yours. Given away separately, and it does not count as zakat.
              </p>
            </div>
            <p className="tnum display shrink-0 text-2xl text-haram">
              {money(result.purificationDue, result.currency)}
            </p>
          </Card>
        )}

        {open.length > 0 ? (
          <Link href="/income" className="mt-3 block">
            <Card interactive className="group flex items-center gap-3 bg-gold-wash p-5">
              <div className="flex-1">
                <p className="text-sm font-medium text-ink">
                  {open.length} {open.length === 1 ? 'entry needs' : 'entries need'} a quick answer
                </p>
                <p className="mt-0.5 text-sm text-ink-soft">One tap each. Takes about a minute.</p>
              </div>
              <ArrowRight
                size={18}
                className="shrink-0 text-gold-ink transition-transform duration-200 group-hover:translate-x-1"
              />
            </Card>
          </Link>
        ) : (
          <Link href="/income/add" className="mt-3 block">
            <Card interactive className="group flex items-center gap-3 p-5">
              <div className="flex-1">
                <p className="text-sm font-medium text-ink">
                  {income.length === 0 ? 'Add the income you received' : 'Add another income source'}
                </p>
                <p className="mt-0.5 text-sm text-ink-soft">
                  {income.length === 0
                    ? 'So Mīzān can flag anything that needs purifying.'
                    : `${income.length} ${income.length === 1 ? 'source' : 'sources'} recorded so far, all sorted.`}
                </p>
              </div>
              <ArrowRight
                size={18}
                className="shrink-0 text-mute transition-transform duration-200 group-hover:translate-x-1"
              />
            </Card>
          </Link>
        )}


        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/zakat">
            <Button variant="quiet">
              How was this worked out? <ArrowRight size={15} />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
