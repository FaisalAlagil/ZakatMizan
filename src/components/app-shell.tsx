'use client'

import { usePathname } from 'next/navigation'
import { Nav, FULL_SCREEN_ROUTES } from './nav'

/**
 * The mobile nav bar is fixed, so pages normally need bottom clearance for it.
 * On the routes where the nav is hidden that clearance would make the document
 * taller than the viewport and introduce a scrollbar, so it is dropped there.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const fullScreen = FULL_SCREEN_ROUTES.includes(pathname)

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Nav />
      <main className={`flex-1 ${fullScreen ? '' : 'pb-24 md:pb-0'}`}>{children}</main>
    </div>
  )
}
