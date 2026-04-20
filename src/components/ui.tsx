import clsx from 'clsx'
import type { ReactNode } from 'react'
import { motion, useMotionValue, useMotionTemplate, type HTMLMotionProps, type Variants } from 'framer-motion'

// Animation Primitives
export const baseEase = 'easeOut'
export const softEase = 'easeInOut'
export const snappyEase = 'easeIn'

export const entranceVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: baseEase } },
  exit: { opacity: 0, y: 16, transition: { duration: 0.35, ease: snappyEase } }
}

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
}

export const hoverVariants: Variants = {
  rest: { scale: 1, y: 0 },
  hover: { scale: 1.02, y: -4, transition: { duration: 0.3, ease: softEase } },
  tap: { scale: 0.98, y: 0 }
}

export const layoutTransition = {
  type: "spring",
  stiffness: 350,
  damping: 30,
  ease: baseEase
}

export function Panel({
  children,
  className,
  ...props
}: HTMLMotionProps<"section">) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect()
    mouseX.set(clientX - left)
    mouseY.set(clientY - top)
  }

  return (
    <motion.section
      variants={entranceVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={clsx(
        'group relative overflow-hidden rounded-[28px] border border-[rgb(var(--line))] bg-[rgb(var(--panel))] shadow-[var(--clay-shadow-medium)] backdrop-blur-xl transition-all duration-400 hover:shadow-[var(--clay-shadow-strong)]',
        className,
      )}
      onMouseMove={handleMouseMove}
      {...props}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-400 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              720px circle at ${mouseX}px ${mouseY}px,
              rgba(var(--accent), 0.06),
              transparent 75%
            )
          `,
        }}
      />
      <div className="relative z-10 p-5 md:p-7 h-full">
        {children as ReactNode}
      </div>
    </motion.section>
  )
}

export function SectionTitle({
  eyebrow,
  title,
  body,
  action,
}: {
  eyebrow?: string
  title: string
  body?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-[rgb(var(--line))] pb-5 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        {eyebrow ? (
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent))]"
          >
            {eyebrow}
          </motion.p>
        ) : null}
        <div className="space-y-1">
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-display font-semibold tracking-[-0.03em] text-[rgb(var(--text))] md:text-[1.95rem]"
          >
            {title}
          </motion.h2>
          {body ? (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="max-w-2xl text-sm leading-6 text-[rgb(var(--muted))] md:text-[0.98rem]"
            >
              {body}
            </motion.p>
          ) : null}
        </div>
      </div>
      {action ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="shrink-0"
        >
          {action}
        </motion.div>
      ) : null}
    </div>
  )
}

export function TabButton({
  active,
  children,
  className,
  ...props
}: HTMLMotionProps<"button"> & { active?: boolean }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={clsx(
        'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-200',
        active
          ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent))] text-white shadow-[0_4px_14px_rgba(var(--accent),0.3)]'
          : 'border-[rgb(var(--line))] bg-[rgb(var(--panel-strong))] text-[rgb(var(--muted))] hover:border-[rgb(var(--accent))] hover:text-[rgb(var(--text))]',
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  )
}

export function MetricCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string
  tone?: 'neutral' | 'accent' | 'positive' | 'negative'
}) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect()
    mouseX.set(clientX - left)
    mouseY.set(clientY - top)
  }



  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onMouseMove={handleMouseMove}
      className={clsx(
        'group rounded-[22px] border px-4 py-4 relative overflow-hidden transition-all duration-300',
        tone === 'accent'
          ? 'border-[rgb(var(--accent-border))] bg-gradient-to-br from-[rgb(var(--accent))] to-[rgb(var(--accent-strong))] shadow-[0_8px_24px_rgba(var(--accent),0.25)]'
          : 'border-[rgb(var(--line))] bg-[rgb(var(--panel-strong))] hover:border-[rgb(var(--accent-border))] hover:shadow-[0_8px_24px_rgba(var(--accent),0.1)]',
      )}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              300px circle at ${mouseX}px ${mouseY}px,
              rgba(255, 255, 255, 0.15),
              transparent 80%
            )
          `,
        }}
      />
      <div className="relative z-10">
        <p className={clsx(
          "text-[0.72rem] font-semibold uppercase tracking-[0.2em]",
          tone === 'accent' ? "text-white/80" : "text-[rgb(var(--muted))]"
        )}>
          {label}
        </p>
        <p className={clsx(
          "mt-2 text-3xl font-display font-bold tracking-[-0.04em]",
          tone === 'accent' ? "text-white" : "text-[rgb(var(--text))]"
        )}>
          {value}
        </p>
      </div>
      {tone === 'accent' && (
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/20 blur-2xl" />
      )}
    </motion.div>
  )
}

export function EmptyState({
  title,
  body,
  icon,
}: {
  title: string
  body: string
  icon?: ReactNode
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-[26px] border border-dashed border-[rgb(var(--accent-border))] bg-[rgb(var(--panel-strong))] px-5 py-8 text-center relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[rgb(var(--accent-soft))]/50 to-transparent pointer-events-none" />
      <div className="relative z-10">
        {icon ? (
          <motion.div 
            animate={{ 
              y: [0, -5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))] shadow-[0_0_20px_rgba(var(--accent),0.2)]"
          >
            {icon}
          </motion.div>
        ) : null}
        <h3 className="text-lg font-display font-semibold text-[rgb(var(--text))]">{title}</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[rgb(var(--muted))]">
          {body}
        </p>
      </div>
    </motion.div>
  )
}
