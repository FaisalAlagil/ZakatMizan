import type { HawlStatus } from '@/lib/types'
import type { HawlRule } from './madhhab-profiles'

/** A lunar year, rounded to whole days. */
export const LUNAR_YEAR_DAYS = 354

const MS_PER_DAY = 86_400_000

export function formatHijri(date: Date): string {
  return new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY)
}

export function computeHawl(
  startDate: string,
  today: string,
  rule: HawlRule,
  dippedBelowNisab: boolean,
): HawlStatus {
  const start = new Date(startDate)
  const now = new Date(today)
  const daysElapsed = Math.floor((now.getTime() - start.getTime()) / MS_PER_DAY)
  const daysRemaining = Math.max(0, LUNAR_YEAR_DAYS - daysElapsed)
  const due = addDays(start, LUNAR_YEAR_DAYS)

  return {
    startDate,
    daysElapsed,
    daysRemaining,
    lunarYearDays: LUNAR_YEAR_DAYS,
    complete: daysElapsed >= LUNAR_YEAR_DAYS,
    dippedBelowNisab,
    // The Hanafi rule only looks at the two endpoints, so a dip in between is ignored.
    brokenByDip: dippedBelowNisab && rule === 'continuous',
    hijriToday: formatHijri(now),
    hijriDue: formatHijri(due),
  }
}
