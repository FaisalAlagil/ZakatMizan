'use client'

import { useEffect, useRef } from 'react'
import { useStore } from '@/lib/store'
import { useHydrated } from '@/lib/use-hydrated'

/**
 * Fetches metal prices and exchange rates once per currency on load.
 * Cached in store and edge-cached on Vercel so it never spams or loops.
 */
export function DataBootstrap() {
  const hydrated = useHydrated()
  const offline = useStore((s) => s.offlineMode)
  const currency = useStore((s) => s.currency)
  const setPrices = useStore((s) => s.setPrices)
  const setRates = useStore((s) => s.setRates)

  const fetchedPricesFor = useRef<Set<string>>(new Set())
  const fetchedRatesRef = useRef<boolean>(false)

  useEffect(() => {
    if (!hydrated || offline) return
    if (fetchedPricesFor.current.has(currency)) return

    fetchedPricesFor.current.add(currency)
    fetch(`/api/prices?currency=${currency}`)
      .then((r) => r.json())
      .then((data) => {
        setPrices(data)
      })
      .catch(() => undefined)
  }, [hydrated, offline, currency, setPrices])

  useEffect(() => {
    if (!hydrated || offline) return
    if (fetchedRatesRef.current) return

    fetchedRatesRef.current = true
    fetch('/api/rates')
      .then((r) => r.json())
      .then((data) => {
        setRates(data)
      })
      .catch(() => undefined)
  }, [hydrated, offline, setRates])

  return null
}
