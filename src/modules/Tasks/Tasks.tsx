import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, ExternalLink, CheckCircle, Loader2, Clock, MapPin, IndianRupee } from 'lucide-react'
import clsx from 'clsx'
import { Panel, SectionTitle, EmptyState, TabButton } from '../../components/ui.tsx'
import { useTasks } from '../../hooks/useTasks.ts'
import type { Task, TaskCategory, TaskApplication } from '../../types.ts'
import { toast } from '../../lib/toast.ts'

const categories: { id: TaskCategory; label: string }[] = [
  { id: 'all', label: 'All Tasks' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'tutoring', label: 'Tutoring' },
  { id: 'errands', label: 'Errands' },
  { id: 'tech', label: 'Tech' },
  { id: 'other', label: 'Other' }
]

function TaskCard({ task, onSelect }: { task: Task; onSelect: (task: Task) => void }) {
  const categoryColors: Record<string, string> = {
    delivery: 'from-blue-500 to-cyan-500',
    tutoring: 'from-purple-500 to-pink-500',
    errands: 'from-orange-500 to-amber-500',
    tech: 'from-indigo-500 to-violet-500',
    other: 'from-emerald-500 to-teal-500'
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -6, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="group"
    >
      <Panel className="h-full cursor-pointer" onClick={() => onSelect(task)}>
        <div className="flex flex-col h-full gap-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[rgb(var(--text))] group-hover:text-[rgb(var(--accent))] transition-colors">
                {task.title}
              </h3>
              <span className={clsx(
                "inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r text-white",
                categoryColors[task.category] || categoryColors.other
              )}>
                {task.category.charAt(0).toUpperCase() + task.category.slice(1)}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[rgb(var(--accent))] font-bold text-xl">
              <IndianRupee size={18} />
              {task.price}
            </div>
          </div>

          <p className="text-sm text-[rgb(var(--muted))] line-clamp-2">
            {task.description}
          </p>

          <div className="flex flex-wrap gap-3 text-xs text-[rgb(var(--muted))]">
            {task.location && (
              <div className="flex items-center gap-1">
                <MapPin size={14} />
                {task.location}
              </div>
            )}
            {task.deadline && (
              <div className="flex items-center gap-1">
                <Clock size={14} />
                {new Date(task.deadline).toLocaleDateString('en-IN')}
              </div>
            )}
            {task.applicantCount !== undefined && (
              <div className="ml-auto">
                {task.applicantCount} applicants
              </div>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(task)
            }}
            className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium text-sm shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-shadow"
          >
            View & Apply
          </motion.button>
        </div>
      </Panel>
    </motion.div>
  )
}

function TaskDetailModal({ task, onClose, onApply }: { 
  task: Task
  onClose: () => void
  onApply: (data: Omit<TaskApplication, 'createdAt'>) => Promise<{ success: boolean }>
}) {
  const [applying, setApplying] = useState(false)
  const [formData, setFormData] = useState({ name: '', phone: '', message: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast({ title: 'Please fill in all required fields', type: 'error' })
      return
    }

    setApplying(true)
    try {
      const result = await onApply({
        taskId: task.id,
        ...formData
      })

      if (result.success) {
        toast({ title: 'Application submitted successfully!', type: 'success' })
        onClose()
      }
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="relative max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <Panel className="border border-white/10">
          <div className="space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-[rgb(var(--text))]">{task.title}</h2>
                <div className="flex items-center gap-2 mt-1 text-[rgb(var(--accent))] font-bold text-lg">
                  <IndianRupee size={18} />
                  {task.price}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 transition-colors text-[rgb(var(--muted))]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <p className="text-[rgb(var(--muted))] text-sm leading-relaxed">{task.description}</p>

            {task.requirements && task.requirements.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-[rgb(var(--text))] mb-2">Requirements</h4>
                <ul className="space-y-1.5">
                  {task.requirements.map((req, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-[rgb(var(--muted))]">
                      <CheckCircle size={16} className="text-[rgb(var(--accent))]" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="border-t border-[rgb(var(--line))] pt-4">
              <h4 className="text-sm font-semibold text-[rgb(var(--text))] mb-3">Apply for this task</h4>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <input
                    type="text"
                    placeholder="Your full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[rgb(var(--panel-strong))] border border-[rgb(var(--line))] text-[rgb(var(--text))] placeholder:text-[rgb(var(--muted))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors"
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    placeholder="Phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[rgb(var(--panel-strong))] border border-[rgb(var(--line))] text-[rgb(var(--text))] placeholder:text-[rgb(var(--muted))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors"
                  />
                </div>
                <div>
                  <textarea
                    placeholder="Additional message (optional)"
                    rows={3}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[rgb(var(--panel-strong))] border border-[rgb(var(--line))] text-[rgb(var(--text))] placeholder:text-[rgb(var(--muted))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors resize-none"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: applying ? 1 : 1.02 }}
                  whileTap={{ scale: applying ? 1 : 0.97 }}
                  disabled={applying}
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium shadow-lg shadow-purple-500/20 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {applying ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Submitting...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </motion.button>

                <a
                  href={`https://wa.me/${task.contact || '919876543210'}?text=Hi%2C%20I%20am%20interested%20in%20the%20task%3A%20${encodeURIComponent(task.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-[rgb(var(--line))] text-[rgb(var(--text))] font-medium hover:bg-[rgb(var(--panel-strong))] transition-colors"
                >
                  <ExternalLink size={16} />
                  Apply via WhatsApp
                </a>
              </form>
            </div>
          </div>
        </Panel>
      </motion.div>
    </div>
  )
}

export function Tasks() {
  const { tasks, loading, error, fetchTasks, applyToTask } = useTasks()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory>('all')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           task.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || task.category === selectedCategory
      return matchesSearch && matchesCategory && task.isActive
    })
  }, [tasks, searchQuery, selectedCategory])

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <SectionTitle
          eyebrow="LifeLink Tasks"
          title="Find Tasks Near You"
          body="Earn money by helping people in your community. Browse available tasks and apply directly."
        />

        <div className="mt-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgb(var(--muted))]" size={18} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-[rgb(var(--panel-strong))] border border-[rgb(var(--line))] text-[rgb(var(--text))] placeholder:text-[rgb(var(--muted))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={18} className="text-[rgb(var(--muted))]" />
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <TabButton
                  key={category.id}
                  active={selectedCategory === category.id}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.label}
                </TabButton>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {loading ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 size={40} className="text-[rgb(var(--accent))]" />
                </motion.div>
                <p className="text-[rgb(var(--muted))]">Loading tasks...</p>
              </div>
            ) : error ? (
              <div className="col-span-full">
                <EmptyState
                  title="Error loading tasks"
                  body={error}
                />
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="col-span-full">
                <EmptyState
                  title="No tasks found"
                  body="There are no tasks matching your search criteria. Try adjusting your filters."
                />
              </div>
            ) : (
              filteredTasks.map(task => (
                <TaskCard key={task.id} task={task} onSelect={setSelectedTask} />
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {selectedTask && (
          <TaskDetailModal
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onApply={async (data) => {
              const result = await applyToTask(selectedTask.id, data)
              return result
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
