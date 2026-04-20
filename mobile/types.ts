export type ThemeMode = 'light' | 'dark'
export type StudyTab = 'summary' | 'quiz' | 'chat'
export type HomeworkTab = 'solution' | 'simple' | 'practice'
export type FlashcardTab = 'study' | 'generate'

export interface QuizQuestion {
  question: string
  options: string[]
  answer: string
  explanation: string
}

export interface ChatMessage {
  id: string
  role: 'assistant' | 'user'
  content: string
}

export interface PerformanceRow {
  id: string
  subject: string
  current: number
  previous: number
  target: number
  focus: string
}

export interface PerformanceInsight {
  weakAreas: string[]
  studyPlan: string[]
  priorityTopics: string[]
  narrative: string
}

export interface Flashcard {
  id: string
  front: string
  back: string
  mastered: boolean
}

export type WeekDay = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'

export interface StudyBlock {
  id: string
  day: WeekDay
  startHour: number
  duration: number
  subject: string
  color: string
}

export interface FocusSession {
  id: string
  date: string
  duration: number
  mode: 'focus' | 'break'
  completedAt: number
}

export interface Task {
  id: string
  title: string
  description: string
  price: number
  category: string
  location?: string
  deadline?: string
  requirements?: string[]
  contact?: string
  isActive: boolean
  createdAt: string
  applicantCount?: number
}

export interface TaskApplication {
  taskId: string
  name: string
  phone: string
  message?: string
  createdAt: string
}

export type TaskCategory = 'all' | 'delivery' | 'tutoring' | 'errands' | 'tech' | 'other'