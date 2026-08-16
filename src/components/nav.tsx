'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Coins, Scale, Settings, Wallet } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useHydrated } from '@/lib/use-hydrated'
import { needsAnswer } from '@/lib/classify/engine'

/** Routes that take the whole screen, where the nav is hidden. */
export const FULL_SCREEN_ROUTES = ['/setup', '/income/add']

const LINKS = [
  { href: '/', label: 'Balance', icon: Scale },
  { href: '/income', label: 'Income', icon: Wallet },
  { href: '/zakat', label: 'Zakat', icon: Coins },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Nav() {
  const pathname = usePathname()
  const hydrated = useHydrated()
  const transactions = useStore((s) => s.transactions)

  // The setup and add flows are one-thing-at-a-time, so they take the whole screen.
  if (FULL_SCREEN_ROUTES.includes(pathname)) return null

  const outstanding = hydrated ? transactions.filter(needsAnswer).length : 0
  const badgeFor = (href: string) => (href === '/income' && outstanding > 0 ? outstanding : null)

  return (
    <>
      {/* Desktop rail */}
      <nav className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col bg-deep px-4 py-6 text-white md:flex">
        <Link href="/" className="mb-10 block px-2">
          <span className="display block text-2xl leading-none text-gold">Mīzān</span>
          <span className="eyebrow mt-1 block text-white/35">zakat &amp; purification</span>
        </Link>

        <ul className="flex flex-col gap-1">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            const badge = badgeFor(href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex items-center gap-3 rounded-full px-3.5 py-2.5 text-sm transition-all duration-200 ${
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-white/55 hover:translate-x-0.5 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-gold" />
                  )}
                  <Icon size={17} strokeWidth={1.75} />
                  {label}
                  {badge && (
                    <span className="tnum ml-auto rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-semibold text-deep">
                      {badge}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>

        <p className="mt-auto px-3 text-xs leading-relaxed text-white/35">
          Your figures stay on this device. Nothing is uploaded to an account.
        </p>
      </nav>

      {/* Mobile bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex bg-deep pb-[env(safe-area-inset-bottom)] md:hidden">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          const badge = badgeFor(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-1 flex-col items-center gap-1 py-3 text-[11px] transition-colors ${
                active ? 'text-gold' : 'text-white/50'
              }`}
            >
              {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-gold" />}
              <span className="relative">
                <Icon size={19} strokeWidth={1.75} />
                {badge && (
                  <span className="tnum absolute -right-2.5 -top-1.5 rounded-full bg-gold px-1 py-px text-[9px] font-semibold text-deep">
                    {badge}
                  </span>
                )}
              </span>
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
