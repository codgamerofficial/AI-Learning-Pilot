import clsx from 'clsx'
import { Suspense, lazy, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { pageTransition } from './lib/animations'
import {
  AlertTriangle,
  BarChart3,
  MoonStar,
  NotebookPen,
  Sigma,
  Sparkles,
  X,
  Timer,
  UserCircle,
  Menu,
  SunMedium,
  Layers,
  Calendar,
  LibraryBig,
  CreditCard,
  type LucideIcon,
} from 'lucide-react'
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'

import { AnimatedBackground } from './components/AnimatedBackground'
import { JarvisAssistant } from './components/JarvisAssistant'
import { getAiRuntime, onAiFallback, type AiFallbackNotice } from './lib/ai'
import { useLocalStorageState } from './hooks/useLocalStorageState'
import type { ThemeMode } from './types'

const StudyCopilot = lazy(() =>
  import('./modules/StudyCopilot').then((module) => ({
    default: module.StudyCopilot,
  })),
)

const PerformanceDashboard = lazy(() =>
  import('./modules/PerformanceDashboard').then((module) => ({
    default: module.PerformanceDashboard,
  })),
)

const HomeworkSolver = lazy(() =>
  import('./modules/HomeworkSolver').then((module) => ({
    default: module.HomeworkSolver,
  })),
)

const FocusTimer = lazy(() =>
  import('./modules/FocusTimer').then((module) => ({
    default: module.FocusTimer,
  })),
)

const Profile = lazy(() =>
  import('./modules/Profile').then((module) => ({
    default: module.Profile,
  })),
)

const FlashcardStudio = lazy(() =>
  import('./modules/FlashcardStudio').then((module) => ({
    default: module.FlashcardStudio,
  })),
)

const StudyPlanner = lazy(() =>
  import('./modules/StudyPlanner').then((module) => ({
    default: module.StudyPlanner,
  })),
)

const CloudLibrary = lazy(() =>
  import('./modules/CloudLibrary').then((module) => ({
    default: module.CloudLibrary,
  })),
)

const Billing = lazy(() =>
  import('./modules/Billing').then((module) => ({
    default: module.Billing,
  })),
)




import { Toaster } from './components/Toaster'
import { LocationWidget } from './components/LocationWidget'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'

import Dashboard from './modules/Dashboard/Dashboard'
import { LandingPage } from './modules/LandingPage'
import FloatingNavbar from './components/FloatingNavbar'

type NavigationItem = {
  path: string
  label: string
  description: string
  detail: string
  icon: LucideIcon
}

const navigation: NavigationItem[] = [
  {
    path: '/study',
    label: 'Study Copilot',
    description: 'Summaries, quizzes, and note-grounded chat.',
    detail: 'Turn raw class material into something you can actually revise from.',
    icon: NotebookPen,
  },
  {
    path: '/performance',
    label: 'Performance Dashboard',
    description: 'Charts, weak spots, and tailored study planning.',
    detail: 'Make the marks visible, then make the next moves obvious.',
    icon: BarChart3,
  },
  {
    path: '/homework',
    label: 'Homework Solver',
    description: 'Step-by-step help with simpler explanations.',
    detail: 'Get reasoning, clarity, and follow-up practice in one loop.',
    icon: Sigma,
  },
  {
    path: '/flashcards',
    label: 'Flashcard Studio',
    description: 'AI-generated cards for active recall.',
    detail: 'Turn concepts into flip cards and track your mastery.',
    icon: Layers,
  },
  {
    path: '/focus',
    label: 'Focus Engine',
    description: 'Track deep work time and streaks.',
    detail: 'Stay sharp with 25 minutes of focus and ambient sounds.',
    icon: Timer,
  },
  {
    path: '/planner',
    label: 'Study Planner',
    description: 'Weekly schedule and AI suggestions.',
    detail: 'Visualize your weekly study blocks and keep sessions balanced.',
    icon: Calendar,
  },
  {
    path: '/library',
    label: 'Cloud Library',
    description: 'Community sourced study materials.',
    detail: 'Share, fork, and upvote authentic study content generated globally.',
    icon: LibraryBig,
  },
  {
    path: '/billing',
    label: 'OS Pro Upgrade',
    description: 'Manage SaaS subscription.',
    detail: 'Unlock advanced models and clear marketplace fees.',
    icon: CreditCard,
  },
  {
    path: '/profile',
    label: 'My Profile',
    description: 'Manage session and identity.',
    detail: 'View your account details and control security.',
    icon: UserCircle,
  },
]

function SidebarContent({
  aiRuntime,
  setIsSidebarOpen,
}: {
  aiRuntime: { label: string; detail: string }
  setIsSidebarOpen?: (open: boolean) => void
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.08] px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[rgb(var(--sidebar-text))]">
            <Sparkles className="h-3.5 w-3.5" />
            AI Learning OS
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-[2.1rem] leading-none tracking-[-0.05em] text-[rgb(var(--sidebar-text))]">
              One workspace for studying, tracking progress, and solving homework.
            </h1>
            <p className="text-sm leading-6 text-[rgb(var(--sidebar-muted))]">
              Calm enough for daily use, polished enough to feel like a real product in a portfolio review.
            </p>
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          {navigation.map((item, index) => {
            const Icon = item.icon

            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.1 }}
                whileHover={{ scale: 1.02, x: 5 }}
                whileTap={{ scale: 0.98 }}
              >
                <NavLink
                  to={item.path}
                  onClick={() => setIsSidebarOpen && setIsSidebarOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      'block rounded-[24px] border px-4 py-4 transition-colors duration-300',
                      isActive
                        ? 'border-transparent bg-gradient-to-r from-[rgb(var(--accent))]/40 to-transparent text-white shadow-[inset_2px_0_0_rgb(var(--accent))]'
                        : 'border-transparent bg-white/[0.02] text-[rgb(var(--sidebar-muted))] hover:bg-white/[0.08] hover:text-[rgb(var(--sidebar-text))]',
                    )
                  }
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-white/10 to-transparent text-[rgb(var(--accent))] border border-white/5 shadow-inner">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-display font-semibold tracking-wide text-[rgb(var(--sidebar-text))]">{item.label}</p>
                      <p className="text-sm leading-5 opacity-80 text-[rgb(var(--sidebar-muted))]">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </NavLink>
              </motion.div>
            )
          })}
        </nav>
      </div>

      <div className="mt-auto space-y-4 pt-6 max-lg:hidden">
        <div className="rounded-[26px] border border-white/[0.12] bg-white/[0.05] p-4 text-[rgb(var(--sidebar-text))]">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[rgb(var(--sidebar-muted))]">
            AI mode
          </p>
          <p className="mt-2 text-base font-semibold">{aiRuntime.label}</p>
          <p className="mt-2 text-sm leading-6 text-[rgb(var(--sidebar-muted))]">
            {aiRuntime.detail}
          </p>
        </div>
      </div>
    </div>
  )
}

function AppFrame({
  theme,
  setTheme,
}: {
  theme: ThemeMode
  setTheme: (value: ThemeMode) => void
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [aiNotice, setAiNotice] = useState<AiFallbackNotice | null>(null)
  const location = useLocation()
  const currentPage =
    navigation.find((item) => item.path === location.pathname) || navigation[0]
  const aiRuntime = getAiRuntime()

  useEffect(() => {
    document.title = `${currentPage.label} | AI Learning OS`
  }, [currentPage.label])

  useEffect(() => onAiFallback((notice) => setAiNotice(notice)), [])

  return (
    <div className="min-h-screen px-3 py-3 md:px-5 md:py-5 relative">
      <Toaster />

      {/* Mobile Top Navigation Bar */}
      <div className="lg:hidden sticky top-0 z-30 mb-4 flex items-center justify-between rounded-[24px] border border-[rgb(var(--sidebar-line))] bg-[rgb(var(--sidebar-bg))]/90 p-4 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-[rgb(var(--text))]">
          <Sparkles className="h-4 w-4 text-[rgb(var(--accent))]" />
          AI Learning OS
        </div>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="rounded-xl border border-[rgb(var(--sidebar-line))] bg-[rgb(var(--sidebar-bg))] p-2 text-[rgb(var(--sidebar-text))] hover:bg-white/10"
          title="Open Navigation Menu"
          aria-label="Open Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile Sidebar Overlay (Hamburger Drawer) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            key="drawer-overlay"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            key="drawer-sidebar"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[320px] overflow-y-auto border-r border-[rgb(var(--sidebar-line))] bg-[rgb(var(--sidebar-bg))] p-5 shadow-2xl lg:hidden"
          >
            <SidebarContent aiRuntime={aiRuntime} setIsSidebarOpen={setIsSidebarOpen} />
          </motion.aside>
        )}
      </AnimatePresence>

     {/* Floating Bottom Navbar (mobile only) */}
     <div className="lg:hidden">
       <FloatingNavbar />
     </div>

     <div className="mx-auto grid max-w-[1600px] gap-4 lg:grid-cols-[290px_minmax(0,1fr)]">
         <aside className="hidden lg:flex lg:sticky lg:top-5 lg:h-[calc(100vh-2.5rem)] overflow-y-auto rounded-[34px] border border-[rgb(var(--sidebar-line))] bg-[rgb(var(--sidebar-bg))] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.24)]">
           <SidebarContent aiRuntime={aiRuntime} />
         </aside>

        <main className="rounded-[34px] border border-[rgb(var(--line))] bg-[rgb(var(--shell))] shadow-[var(--panel-shadow)] backdrop-blur-xl">
          <header className="border-b border-[rgb(var(--line))] px-5 py-5 md:px-8 md:py-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--line))] bg-[rgb(var(--panel-strong))] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[rgb(var(--accent-strong))]">
                  Workspace Module
                </div>
                <div className="space-y-2">
                  <h2 className="font-display text-[2.4rem] leading-none tracking-[-0.05em] text-[rgb(var(--text))]">
                    {currentPage.label}
                  </h2>
                  <p className="max-w-3xl text-sm leading-6 text-[rgb(var(--muted))] md:text-[0.98rem]">
                    {currentPage.detail}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <LocationWidget />
                <span className="rounded-full border border-[rgb(var(--accent-border))] bg-[rgb(var(--accent-soft))] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--accent-strong))]">
                  Local-first outputs
                </span>
                <span className="rounded-full border border-[rgb(var(--line))] bg-[rgb(var(--panel-strong))] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--muted))]">
                  Frontend-only
                </span>
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--line))] bg-[rgb(var(--panel-strong))] px-4 py-2 text-sm font-semibold text-[rgb(var(--text))] transition hover:-translate-y-0.5 hover:border-[rgb(var(--accent))]"
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                >
                  {theme === 'light' ? (
                    <MoonStar className="h-4 w-4" />
                  ) : (
                    <SunMedium className="h-4 w-4" />
                  )}
                  {theme === 'light' ? 'Dark mode' : 'Light mode'}
                </button>
              </div>
            </div>
          </header>

          {aiNotice ? (
            <div className="border-b border-[rgb(var(--line))] px-5 py-4 md:px-8">
              <div className="flex flex-col gap-4 rounded-[26px] border border-amber-500/20 bg-[rgba(245,158,11,0.08)] p-4 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-300">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[rgb(var(--text))]">
                      {aiNotice.title}
                    </p>
                    <p className="text-sm leading-6 text-[rgb(var(--text))]">
                      {aiNotice.message}
                    </p>
                    <p className="text-sm leading-6 text-[rgb(var(--muted))]">
                      The workspace stayed usable, but this result came from local fallback logic instead of the live model response.
                    </p>
                  </div>
                </div>
                <button
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgb(var(--line))] bg-[rgb(var(--panel-strong))] text-[rgb(var(--muted))] transition hover:border-amber-500/30 hover:text-[rgb(var(--text))]"
                  onClick={() => setAiNotice(null)}
                  aria-label="Dismiss AI warning"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}

           <div className="px-5 py-5 md:px-8 md:py-8 overflow-hidden relative">
             <Suspense fallback={<ModuleFallback />}>
               <AnimatePresence mode="wait">
                  <motion.div
                    key={location.pathname}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    variants={pageTransition}
                    layoutId="page-container"
                  >
                    <Routes location={location}>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/study" element={<StudyCopilot />} />
                      <Route path="/performance" element={<PerformanceDashboard />} />
                      <Route path="/homework" element={<HomeworkSolver />} />
                      <Route path="/flashcards" element={<FlashcardStudio />} />
                      <Route path="/focus" element={<FocusTimer />} />
                      <Route path="/planner" element={<StudyPlanner />} />
                      <Route path="/library" element={<CloudLibrary />} />
                      <Route path="/billing" element={<Billing />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </motion.div>
               </AnimatePresence>
             </Suspense>
           </div>
        </main>
      </div>
    </div>
  )
}

function ModuleFallback() {
  return (
    <div className="rounded-[30px] border border-[rgb(var(--line))] bg-[rgb(var(--panel))] p-10 text-center shadow-[var(--panel-shadow)]">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[rgb(var(--accent-strong))]">
        Loading Workspace
      </p>
      <p className="mt-3 text-sm leading-6 text-[rgb(var(--muted))]">
        Pulling in the selected module and preparing its local data.
      </p>
    </div>
  )
}

function AppRouter() {
  const [theme, setTheme] = useLocalStorageState<ThemeMode>('ailos.theme', 'light')
  const { session, isLoading } = useAuth()

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) {
    return <LandingPage />
  }

  return (
    <BrowserRouter>
      <AppFrame theme={theme} setTheme={setTheme} />
      <JarvisAssistant />
    </BrowserRouter>
  )
}

function App() {
  return (
    <AuthProvider>
      <AnimatedBackground />
      <AppRouter />
    </AuthProvider>
  )
}

export default App
