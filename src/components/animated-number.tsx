'use client'

import { useEffect, useRef, useState } from 'react'
import { money } from './ui'

const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - 2 ** (-10 * t))

/** Counts from the previous value to the new one so a change is felt, not just seen. */
export function useAnimatedNumber(value: number, duration = 900) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  const frame = useRef<number>(undefined)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value)
      return
    }

    const start = performance.now()
    const origin = from.current

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      setShown(origin + (value - origin) * easeOutExpo(t))
      if (t < 1) frame.current = requestAnimationFrame(tick)
      else from.current = value
    }

    frame.current = requestAnimationFrame(tick)
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current)
      from.current = value
    }
  }, [value, duration])

  return shown
}

export function AnimatedMoney({
  value,
  currency,
  className = '',
}: {
  value: number
  currency: string
  className?: string
}) {
  const shown = useAnimatedNumber(value)
  return (
    <span className={`tnum ${className}`}>{money(shown, currency)}</span>
  )
}
