'use client'

import { useEffect, useState } from 'react'

/** Persisted state only exists in the browser, so hold render until it is read. */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  return hydrated
}
