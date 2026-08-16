'use client'

import type { Citation, Verdict } from '@/lib/types'
import { formatMoney } from '@/lib/currency'

export function money(amount: number, currency = 'CAD', dp = 2) {
  return formatMoney(amount, currency, dp)
}

export function Card({
  children,
  className = '',
  as: Tag = 'section',
  interactive = false,
}: {
  children: React.ReactNode
  className?: string
  as?: 'section' | 'div' | 'li'
  interactive?: boolean
}) {
  return (
    <Tag
      className={`rounded-card border border-hair bg-paper shadow-[0_1px_2px_rgb(11_42_38/0.04)] ${
        interactive ? 'lift' : ''
      } ${className}`}
    >
      {children}
    </Tag>
  )
}

export function Eyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`eyebrow text-mute ${className}`}>{children}</p>
}

export function PageHeader({
  title,
  lead,
  action,
}: {
  title: string
  lead?: string
  action?: React.ReactNode
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-xl">
        <h1 className="display text-3xl text-ink sm:text-4xl">{title}</h1>
        {lead && <p className="mt-2 text-sm leading-relaxed text-ink-soft">{lead}</p>}
      </div>
      {action}
    </header>
  )
}

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100'

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'quiet' | 'ghost' }) {
  const styles = {
    primary: 'bg-deep text-white shadow-sm hover:bg-lift hover:shadow-md',
    quiet: 'border border-hair bg-paper text-ink hover:border-ink-soft/35 hover:bg-canvas',
    ghost: 'text-ink-soft hover:bg-canvas hover:text-ink',
  }[variant]
  return <button className={`${BUTTON_BASE} ${styles} ${className}`} {...props} />
}

export const VERDICT_META: Record<Verdict, { label: string; color: string; chip: string; description: string }> = {
  HALAL: {
    label: 'Halal',
    color: 'text-halal',
    chip: 'bg-halal/10 text-halal border-halal/25',
    description: 'Lawful income included in zakatable personal wealth.',
  },
  HARAM: {
    label: 'Haram (Purify)',
    color: 'text-haram',
    chip: 'bg-haram/10 text-haram border-haram/25',
    description: 'Impermissible income separated from halal wealth, 100% excluded from zakat base and set aside for disposal.',
  },
  MIXED: {
    label: 'Mixed',
    color: 'text-mixed',
    chip: 'bg-mixed/10 text-mixed border-mixed/25',
    description: 'Contains both permissible and impermissible portions. The haram share is purified.',
  },
  UNCERTAIN: {
    label: 'Tentative (Scholar Review)',
    color: 'text-uncertain',
    chip: 'bg-uncertain/10 text-uncertain border-uncertain/25',
    description: 'Provisional or unresolved case requiring qualified scholarly guidance.',
  },
  NEEDS_INFO: {
    label: 'Missing Information',
    color: 'text-missing',
    chip: 'border-dashed bg-missing/10 text-missing border-missing/50 font-medium',
    description: 'Income origin is unknown or incomplete; more details are required to complete classification.',
  },
}

export function VerdictChip({ verdict }: { verdict?: Verdict }) {
  if (!verdict) return <span className="text-xs text-mute">Not income</span>
  const meta = VERDICT_META[verdict]
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.chip}`}>
      {meta.label}
    </span>
  )
}

export function Source({ citation }: { citation?: Citation }) {
  if (!citation) return null
  return (
    <p className="mt-2 border-l-2 border-gold/60 pl-3 text-xs leading-relaxed text-mute">
      <span className="font-medium text-ink-soft">{citation.source}</span>
      {citation.note && <> — {citation.note}</>}
      {!citation.verified && (
        <span className="ml-2 rounded-full bg-gold-wash px-2 py-0.5 text-[10px] font-medium text-gold-ink">
          awaiting scholarly review
        </span>
      )}
    </p>
  )
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-hair bg-paper/60 px-6 py-12 text-center">
      <p className="display text-lg text-ink">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">{children}</div>}
    </div>
  )
}
