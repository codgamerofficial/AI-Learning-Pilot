import { motion, useReducedMotion } from 'framer-motion'
import { easing } from '../lib/animations'

export function AnimatedBackground() {
  const reducedMotion = useReducedMotion()

  if (reducedMotion) return null

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Primary Accent Orb */}
      <motion.div
        animate={{
          x: ['0%', '12%', '-4%', '0%'],
          y: ['0%', '-12%', '8%', '0%'],
          scale: [1, 1.12, 0.94, 1],
          opacity: [0.28, 0.42, 0.28],
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: easing.state,
          repeatType: 'loop',
        }}
        className="absolute -top-[20%] -left-[10%] h-[80vh] w-[80vw]"
        style={{ 
          background: 'radial-gradient(circle, rgba(var(--accent), 0.15) 0%, transparent 60%)',
          willChange: 'transform, opacity',
          filter: 'blur(60px)'
        }}
      />
      
      {/* Secondary Soft Blue Orb */}
      <motion.div
        animate={{
          x: ['0%', '-16%', '12%', '0%'],
          y: ['0%', '16%', '-8%', '0%'],
          scale: [0.85, 1.08, 0.92, 0.85],
          opacity: [0.22, 0.35, 0.22],
        }}
        transition={{
          duration: 38,
          repeat: Infinity,
          ease: easing.state,
          repeatType: 'loop',
          delay: 2,
        }}
        className="absolute bottom-[0%] right-[0%] h-[80vh] w-[80vw]"
        style={{ 
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.12) 0%, transparent 60%)',
          willChange: 'transform, opacity',
          filter: 'blur(70px)'
        }}
      />

      {/* Tertiary Ambient Orb */}
      <motion.div
        animate={{
          x: ['0%', '8%', '-16%', '0%'],
          y: ['0%', '8%', '-12%', '0%'],
          scale: [1, 0.94, 1.08, 1],
          opacity: [0.15, 0.26, 0.15],
        }}
        transition={{
          duration: 32,
          repeat: Infinity,
          ease: easing.state,
          repeatType: 'loop',
          delay: 4,
        }}
        className="absolute top-[30%] left-[20%] h-[60vh] w-[60vw]"
        style={{ 
          background: 'radial-gradient(circle, rgba(147, 51, 234, 0.08) 0%, transparent 60%)',
          willChange: 'transform, opacity',
          filter: 'blur(80px)'
        }}
      />

      {/* Fine grain parallax dots */}
      <motion.div
        animate={{
          y: [0, -2, 0],
          opacity: [0.06, 0.12, 0.06],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: easing.state,
        }}
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(var(--text), 0.08) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          willChange: 'transform, opacity'
        }}
      />
    </div>
  )
}
