import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { cn } from '../../lib/utils'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  glowColor?: string
  disableTilt?: boolean
}

export function GlassCard({ children, className, glowColor = 'rgba(139, 92, 246, 0.15)', disableTilt = false }: GlassCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0.5)
  const mouseY = useMotionValue(0.5)

  const springConfig = { stiffness: 150, damping: 20 }
  const rotateX = useSpring(useTransform(mouseY, [0, 1], [3, -3]), springConfig)
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-3, 3]), springConfig)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disableTilt || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    mouseX.set((e.clientX - rect.left) / rect.width)
    mouseY.set((e.clientY - rect.top) / rect.height)
  }

  const handleMouseLeave = () => {
    mouseX.set(0.5)
    mouseY.set(0.5)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={disableTilt ? {} : {
        rotateX,
        rotateY,
        transformPerspective: 1200,
      }}
      className={cn(
        "relative rounded-xl glass-card overflow-hidden group",
        "transition-shadow duration-300 ease-out",
        "hover:shadow-[0_8px_40px_rgba(139,92,246,0.1)]",
        className
      )}
    >
      {/* Gradient border overlay on hover */}
      <div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${glowColor}, transparent 50%, rgba(99, 102, 241, 0.1))`,
          padding: '1px',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />
      {children}
    </motion.div>
  )
}
