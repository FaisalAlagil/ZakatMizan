'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import { useHydrated } from '@/lib/use-hydrated'

/**
 * Fetches metal prices and exchange rates once, wherever the app is opened, so
 * a conversion is never waiting on the user to visit Settings first. Both
 * endpoints fall back to cached figures, so failure is silent and harmless.
 */
export function DataBootstrap() {
  const hydrated = useHydrated()
  const offline = useStore((s) => s.offlineMode)
  const prices = useStore((s) => s.prices)
  const rates = useStore((s) => s.rates)
  const currency = useStore((s) => s.currency)
  const setPrices = useStore((s) => s.setPrices)
  const setRates = useStore((s) => s.setRates)

  useEffect(() => {
    if (!hydrated || offline) return
    if (prices && prices.currency === currency && prices.source === 'live') return
    fetch(`/api/prices?currency=${currency}`)
      .then((r) => r.json())
      .then(setPrices)
      .catch(() => undefined)
  }, [hydrated, offline, prices, currency, setPrices])

  useEffect(() => {
    if (!hydrated || offline || rates) return
    fetch('/api/rates')
      .then((r) => r.json())
      .then(setRates)
      .catch(() => undefined)
  }, [hydrated, offline, rates, setRates])

  return null
}
