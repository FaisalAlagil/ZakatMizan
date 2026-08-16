'use client'

import { ArrowRight, BookOpen, Scale, ShieldCheck } from 'lucide-react'
import { BalanceMark } from './balance-mark'

const POINTS = [
  {
    icon: Scale,
    title: 'Your school, not a flat 2.5%',
    body: 'Strict calculations following only the one madhhab you select.',
  },
  {
    icon: BookOpen,
    title: 'Every step with its source',
    body: 'Auditable traces with Quran, Hadith, and classical fiqh citations.',
  },
  {
    icon: ShieldCheck,
    title: '100% Private on device',
    body: 'No account required, and no financial data ever leaves your browser.',
  },
]

export function Welcome({
  onStart,
}: {
  onStart: () => void
}) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-6 sm:px-8">
        <div className="stagger">
          <BalanceMark className="h-[4.75rem] w-40 text-ink" />

          <p className="eyebrow mt-4 text-gold-ink">Mīzān</p>

          <h1 className="display mt-2 text-[2.4rem] leading-[1.05] text-ink sm:text-5xl">
            Zakat, worked out properly.
          </h1>

          <p className="mt-3 text-base leading-relaxed text-ink-soft sm:text-lg">
            Calculate your precise zakat obligation with classical fiqh compliance, or import your transaction records.
          </p>

          <ul className="mt-7 space-y-4">
            {POINTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex items-start gap-3.5">
                <span className="mt-px flex size-8 shrink-0 items-center justify-center rounded-full bg-deep/[0.06] text-ink">
                  <Icon size={16} strokeWidth={1.75} />
                </span>
                <span>
                  <span className="block text-[0.95rem] font-medium leading-snug text-ink">{title}</span>
                  <span className="mt-0.5 block text-sm leading-snug text-mute">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </main>

      <footer className="shrink-0 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 sm:px-8">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-3">
          <button
            onClick={onStart}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-deep py-4 text-base font-semibold text-white shadow-[0_4px_0_0_#000] transition-all duration-150 hover:bg-lift active:translate-y-[3px] active:shadow-[0_1px_0_0_#000]"
          >
            Get Started <ArrowRight size={18} />
          </button>

          <p className="text-center text-xs text-mute">Choose step-by-step questions or spreadsheet import on the next screen.</p>
        </div>
      </footer>
    </div>
  )
}
