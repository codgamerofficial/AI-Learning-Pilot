import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { NotebookPen, Sigma, BarChart3, Timer, Layers, Calendar } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const Dashboard = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    hover: {
      y: -8,
      scale: 1.02,
      transition: { duration: 0.3, ease: 'easeOut' as const },
    },
    tap: {
      scale: 0.97,
      transition: { duration: 0.15 },
    },
  }

  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  }

  const features = [
    {
      id: 'study',
      title: 'Study Copilot',
      description: 'Upload notes and transform them into flashcards and quizzes.',
      icon: NotebookPen,
      path: '/study',
    },
    {
      id: 'homework',
      title: 'Homework Solver',
      description: 'Get step-by-step logic and the underlying formulas.',
      icon: Sigma,
      path: '/homework',
    },
    {
      id: 'performance',
      title: 'Performance',
      description: 'Log your grades and let the AI find your weak spots.',
      icon: BarChart3,
      path: '/performance',
    },
    {
      id: 'flashcards',
      title: 'Flashcard Studio',
      description: 'Test your active recall and track your mastery.',
      icon: Layers,
      path: '/flashcards',
    },
    {
      id: 'focus',
      title: 'Focus Engine',
      description: 'Track deep work time and streaks with Pomodoro.',
      icon: Timer,
      path: '/focus',
    },
    {
      id: 'planner',
      title: 'Study Planner',
      description: 'Hit blockages? Get a balanced and tailored study plan.',
      icon: Calendar,
      path: '/planner',
    },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Area */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-[34px] border border-[rgb(var(--line))] bg-[rgb(var(--panel))] p-8 md:p-10 shadow-[var(--panel-shadow)] text-center md:text-left flex flex-col md:flex-row md:items-center justify-between"
      >
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-[rgb(var(--text))]">
            Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(' ')[0]}` : ''}
          </h1>
          <p className="mt-2 text-sm md:text-base text-[rgb(var(--muted))] leading-relaxed max-w-xl">
            Your centralized intelligence hub. Jump straight into an active study session or analyze your academic trajectory.
          </p>
        </div>
      </motion.div>

      {/* Modules Grid */}
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"
      >
        {features.map((feature) => {
          const Icon = feature.icon
          return (
            <motion.div
              key={feature.id}
              variants={cardVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={() => navigate(feature.path)}
              className="group relative cursor-pointer"
            >
              <div
                className="absolute inset-0 rounded-[28px] opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-40 shadow-[var(--panel-shadow)]"
              />
              <div
                className="relative h-full space-y-4 rounded-[28px] border border-[rgb(var(--line))] bg-[rgb(var(--panel))] p-6 shadow-sm transition-all duration-300 group-hover:border-[rgb(var(--accent-border))] group-hover:bg-[rgb(var(--panel-strong))] overflow-hidden"
              >
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-[rgb(var(--accent-soft))] opacity-50 blur-3xl transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-[20px] bg-[rgb(var(--accent-soft))] border border-[rgb(var(--accent-border))] text-[rgb(var(--accent-strong))] transition-transform duration-300 group-hover:scale-110 shadow-inner">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="relative z-10 space-y-2">
                  <h3 className="font-display text-xl font-bold text-[rgb(var(--text))]">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-6 text-[rgb(var(--muted))]">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}

export default Dashboard