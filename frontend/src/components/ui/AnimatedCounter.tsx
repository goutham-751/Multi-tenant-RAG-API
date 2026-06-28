import { useEffect, useRef } from 'react'
import { useMotionValue, useSpring, motion } from 'framer-motion'

interface AnimatedCounterProps {
  value: number
  duration?: number
  className?: string
  format?: (n: number) => string
}

export function AnimatedCounter({ value, duration = 1.5, className = '', format }: AnimatedCounterProps) {
  const motionValue = useMotionValue(0)
  const springValue = useSpring(motionValue, {
    stiffness: 50,
    damping: 20,
    duration: duration * 1000,
  })
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    motionValue.set(value)
  }, [value, motionValue])

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      if (ref.current) {
        const rounded = Math.round(latest)
        ref.current.textContent = format ? format(rounded) : rounded.toLocaleString()
      }
    })
    return unsubscribe
  }, [springValue, format])

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      0
    </motion.span>
  )
}
