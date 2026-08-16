'use client'

import { useState } from 'react'
import { ArrowRight, HelpCircle } from 'lucide-react'
import { MADHHABS, type Madhhab } from '@/lib/types'
import { MADHHAB_PROFILES, diffProfiles, type RuleDiff } from '@/lib/fiqh/madhhab-profiles'
import { useStore } from '@/lib/store'
import { useZakat } from '@/lib/use-zakat'
import { Source, money } from './ui'
import { MadhhabInfoModal } from './madhhab-info-modal'

type Change = { from: Madhhab; to: Madhhab; before: number; after: number; rules: RuleDiff[] }

export function MadhhabSwitcher() {
  const madhhab = useStore((s) => s.madhhab)
  const setMadhhab = useStore((s) => s.setMadhhab)
  const { all, result } = useZakat()
  const [change, setChange] = useState<Change | null>(null)
  const [showModal, setShowModal] = useState(false)

  function pick(next: Madhhab) {
    if (next === madhhab) return
    setChange({
      from: madhhab,
      to: next,
      before: all[madhhab].zakatDue,
      after: all[next].zakatDue,
      rules: diffProfiles(madhhab, next),
    })
    setMadhhab(next)
  }

  return (
    <div>
      <div role="radiogroup" aria-label="Madhhab" className="flex flex-wrap gap-2">
        {MADHHABS.map((m) => {
          const active = m === madhhab
          return (
            <button
              key={m}
              role="radio"
              aria-checked={active}
              onClick={() => pick(m)}
              className={`rounded-full border px-4 py-2 text-sm transition-all duration-200 active:scale-[0.97] ${
                active
                  ? 'border-deep bg-deep text-white shadow-sm'
                  : 'border-hair bg-paper text-ink-soft hover:-translate-y-0.5 hover:border-ink-soft/35 hover:text-ink'
              }`}
            >
              {MADHHAB_PROFILES[m].label}
            </button>
          )
        })}
      </div>

      {change && change.to === madhhab && (
        <div
          key={`${change.from}-${change.to}`}
          className="rise mt-4 rounded-card border border-gold/35 bg-gold-wash p-4"
        >
          <p className="flex flex-wrap items-baseline gap-2 text-sm text-ink">
            <span className="font-medium">
              {MADHHAB_PROFILES[change.from].label} to {MADHHAB_PROFILES[change.to].label}:
            </span>
            <span className="tnum display text-lg">{money(change.before, result.currency)}</span>
            <ArrowRight size={14} className="text-gold" />
            <span className="tnum display text-lg text-gold">{money(change.after, result.currency)}</span>
          </p>

          {change.rules.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">
              These two schools apply the same rules to the wealth you have entered, so your figure does not
              change.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {change.rules.map((r) => (
                <li key={r.key}>
                  <p className="text-sm text-ink">
                    <span className="font-medium">{r.label}.</span> {r.explain}
                  </p>
                  <Source citation={r.citation} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{MADHHAB_PROFILES[madhhab].blurb}</p>

      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 text-xs text-gold-ink font-medium underline underline-offset-4 hover:text-ink transition-colors"
        >
          <HelpCircle size={13} /> Learn more about the differences between the four schools
        </button>
      </div>

      <MadhhabInfoModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSelect={(m) => pick(m)}
        selectedMadhhab={madhhab}
      />
    </div>
  )
}
