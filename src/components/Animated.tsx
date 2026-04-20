import { motion, AnimatePresence } from 'framer-motion'
import { 
  easing, durations, staggerContainer, slideUp, scaleIn, 
  itemHover, itemTap, textReveal, useSafeAnimation, useScrollReveal 
} from '../lib/animations'

export function AnimatedContainer({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { enabled } = useSafeAnimation()
  
  return (
    <motion.div
      initial={enabled ? "initial" : false}
      animate="animate"
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function AnimatedItem({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { enabled } = useSafeAnimation()
  
  return (
    <motion.div
      variants={slideUp}
      whileHover={enabled ? itemHover : undefined}
      whileTap={enabled ? itemTap : undefined}
      layout
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function AnimatedCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { enabled } = useSafeAnimation()
  
  return (
    <motion.div
      variants={scaleIn}
      whileHover={enabled ? { y: -4, transition: { duration: durations.hover, ease: easing.hover } } : undefined}
      whileTap={enabled ? { scale: 0.98 } : undefined}
      layout
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function ScrollReveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const reveal = useScrollReveal()
  
  return (
    <motion.div
      ref={reveal.ref}
      initial={reveal.initial}
      animate={reveal.animate}
      transition={reveal.transition}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function AnimatedText({ text, className = '' }: { text: string; className?: string }) {
  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className={className}>
      {text.split(' ').map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          variants={textReveal}
          className="inline-block"
          style={{ marginRight: '0.25em' }}
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  )
}

export { AnimatePresence }
