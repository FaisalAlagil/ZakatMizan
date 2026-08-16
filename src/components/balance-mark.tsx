'use client'

import { useEffect } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'

const PIVOT_X = 64
const PIVOT_Y = 26
/** Half the beam length: how far each pan hangs from the pivot. */
const ARM = 48

const line = {
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  fill: 'none',
}

/**
 * A balance that behaves like one. The beam pivots on the fulcrum, and the pans
 * hang from its ends, so they rise and fall but stay level rather than tipping
 * with the beam. The weights landing is what sets it swinging: the first tips
 * it, the second brings it level.
 */
export function BalanceMark({ className = '' }: { className?: string }) {
  const reduced = useReducedMotion()
  const rotate = useMotionValue(0)

  // A point on the beam at distance d from the pivot moves by d·sin(theta).
  const rise = (d: number) => (r: number) => d * Math.sin((r * Math.PI) / 180)
  const leftY = useTransform(rotate, rise(-ARM))
  const rightY = useTransform(rotate, rise(ARM))

  useEffect(() => {
    if (reduced) return
    const spring = { type: 'spring' as const, stiffness: 120, damping: 9, mass: 1 }
    const tipped = setTimeout(() => animate(rotate, -9, spring), 900)
    const levelled = setTimeout(() => animate(rotate, 0, { ...spring, damping: 12 }), 1450)
    return () => {
      clearTimeout(tipped)
      clearTimeout(levelled)
    }
  }, [rotate, reduced])

  const draw = (delay: number) => ({
    initial: reduced ? undefined : { pathLength: 0 },
    animate: reduced ? undefined : { pathLength: 1 },
    transition: { duration: 0.5, delay, ease: [0.65, 0, 0.35, 1] as const },
  })

  const weight = (delay: number) => ({
    initial: reduced ? undefined : { opacity: 0, y: -16 },
    animate: reduced ? undefined : { opacity: 1, y: 0 },
    transition: { type: 'spring' as const, stiffness: 260, damping: 18, delay },
  })

  /** One hanging pan: a cord, a dish, and the weight that sits in it. */
  const pan = (x: number, y: typeof leftY, weightDelay: number) => (
    <motion.g style={{ y }}>
      <motion.path d={`M${x} ${PIVOT_Y} L${x} ${PIVOT_Y + 15}`} strokeWidth={1.5} {...line} {...draw(0.42)} />
      <motion.path
        d={`M${x - 11} ${PIVOT_Y + 15} Q${x} ${PIVOT_Y + 31} ${x + 11} ${PIVOT_Y + 15}`}
        strokeWidth={2.5}
        {...line}
        {...draw(0.52)}
      />
      <motion.circle cx={x} cy={PIVOT_Y + 20} r={4} fill="var(--color-gold)" {...weight(weightDelay)} />
    </motion.g>
  )

  return (
    <svg viewBox="0 0 128 76" className={className} aria-hidden fill="none">
      {/* Fulcrum is fixed to the ground. */}
      <motion.path d={`M${PIVOT_X} ${PIVOT_Y} L56 58`} strokeWidth={2.5} {...line} {...draw(0.28)} />
      <motion.path d={`M${PIVOT_X} ${PIVOT_Y} L72 58`} strokeWidth={2.5} {...line} {...draw(0.28)} />
      <motion.path d="M48 58 L80 58" strokeWidth={2.5} {...line} {...draw(0.38)} />

      <motion.g style={{ rotate, transformOrigin: `${PIVOT_X}px ${PIVOT_Y}px` }}>
        <motion.path
          d={`M${PIVOT_X - ARM} ${PIVOT_Y} L${PIVOT_X + ARM} ${PIVOT_Y}`}
          strokeWidth={2.5}
          {...line}
          {...draw(0)}
        />
      </motion.g>

      {pan(PIVOT_X - ARM, leftY, 0.9)}
      {pan(PIVOT_X + ARM, rightY, 1.45)}
    </svg>
  )
}
