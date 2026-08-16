'use client'

import { BookOpen, Check, Globe, X } from 'lucide-react'
import { MADHHABS, type Madhhab } from '@/lib/types'
import { MADHHAB_PROFILES } from '@/lib/fiqh/madhhab-profiles'
import { Button } from './ui'

export function MadhhabInfoModal({
  isOpen,
  onClose,
  onSelect,
  selectedMadhhab,
}: {
  isOpen: boolean
  onClose: () => void
  onSelect: (m: Madhhab) => void
  selectedMadhhab?: Madhhab | null
}) {
  if (!isOpen) return null

  const SCHOOL_GEOGRAPHY: Record<Madhhab, { regions: string; summary: string }> = {
    hanafi: {
      regions: 'South Asia (Pakistan, India, Bangladesh), Turkey, Central Asia, Balkans, parts of Middle East',
      summary: 'Applies the lower threshold (silver) and pools your wealth together. Counts worn jewelry and checks wealth at year start and end.',
    },
    maliki: {
      regions: 'North & West Africa (Morocco, Algeria, Tunisia, Mauritania, Senegal, Nigeria, Sudan)',
      summary: 'Uses the gold threshold for cash and separates gold and silver pools. Personal jewelry is exempt. Requires maintaining Nisab continuously for 1 year.',
    },
    shafii: {
      regions: 'Southeast Asia (Indonesia, Malaysia, Singapore), East Africa (Somalia, Kenya), Egypt, Yemen',
      summary: 'Uses the gold threshold. Personal jewelry is exempt. Strictest on debt: personal debts are not deducted from zakatable wealth.',
    },
    hanbali: {
      regions: 'Arabian Peninsula (Saudi Arabia, Qatar, UAE, Kuwait, Oman, Bahrain)',
      summary: 'Uses the gold threshold. Personal jewelry is exempt. Deducts total outstanding debts owed to creditors before zakat is assessed.',
    },
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-hair bg-paper shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="madhhab-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hair px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-full bg-gold-wash text-gold-ink">
              <BookOpen size={16} />
            </div>
            <div>
              <h2 id="madhhab-modal-title" className="display text-lg font-bold text-ink">
                The Four Sunni Schools (Madhāhib)
              </h2>
              <p className="text-xs text-mute">Understand the differences to choose your school</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full border border-hair text-mute transition-colors hover:bg-canvas hover:text-ink"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="rounded-2xl bg-canvas p-4 text-xs leading-relaxed text-ink-soft">
            <p className="font-semibold text-ink">How should you choose?</p>
            <p className="mt-1">
              Muslims typically follow the school dominant in their region of origin or the school followed by their local community and teachers. Mīzān calculates zakat strictly by the rules of whichever school you select without blending rules.
            </p>
          </div>

          <div className="space-y-3">
            {MADHHABS.map((m) => {
              const profile = MADHHAB_PROFILES[m]
              const geo = SCHOOL_GEOGRAPHY[m]
              const isSelected = selectedMadhhab === m

              return (
                <div
                  key={m}
                  className={`rounded-2xl border p-4 transition-all ${
                    isSelected
                      ? 'border-deep bg-deep/5 shadow-sm'
                      : 'border-hair bg-paper hover:border-ink-soft/40'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="display text-base font-semibold text-ink">{profile.label} School</h3>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-deep px-2 py-0.5 text-[10px] font-semibold text-white">
                          <Check size={10} /> Selected
                        </span>
                      )}
                    </div>
                    <Button
                      variant={isSelected ? 'primary' : 'quiet'}
                      className="text-xs !py-1.5 !px-3"
                      onClick={() => {
                        onSelect(m)
                        onClose()
                      }}
                    >
                      {isSelected ? 'Keep this school' : `Select ${profile.label}`}
                    </Button>
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-ink-soft">{geo.summary}</p>

                  <div className="mt-3 flex items-start gap-1.5 text-[11px] text-mute border-t border-hair/60 pt-2.5">
                    <Globe size={13} className="shrink-0 mt-0.5 text-gold-ink" />
                    <span>
                      <strong className="text-ink-soft">Common in:</strong> {geo.regions}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-hair bg-canvas/60 px-6 py-3.5 flex justify-end">
          <Button variant="quiet" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
