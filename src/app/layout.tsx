import type { Metadata } from 'next'
import { Newsreader, Archivo } from 'next/font/google'
import './globals.css'
import { AppShell } from '@/components/app-shell'
import { DataBootstrap } from '@/components/data-bootstrap'

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-newsreader',
})

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-archivo',
})

export const metadata: Metadata = {
  title: 'Mīzān — halal income and zakat',
  description:
    'Track your income, see what needs purifying, and calculate zakat using the rules of your madhhab. Your data stays on your device.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${newsreader.variable} ${archivo.variable}`}>
      <body>
        <DataBootstrap />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
