import type { ChatMessage, Flashcard, PerformanceInsight, PerformanceRow, QuizQuestion } from '../types.js'

export type AiTask =
  | 'study-summary'
  | 'study-quiz'
  | 'study-chat'
  | 'performance-insights'
  | 'homework-solve'
  | 'homework-simple'
  | 'homework-practice'
  | 'jarvis-chat'
  | 'flashcard-generate'

export type AiRequestPayload =
  | { task: 'study-summary'; notes: string }
  | { task: 'study-quiz'; notes: string }
  | { task: 'study-chat'; notes: string; question: string; history: ChatMessage[] }
  | { task: 'performance-insights'; rows: PerformanceRow[] }
  | { task: 'homework-solve'; question: string }
  | { task: 'homework-simple'; question: string }
  | { task: 'homework-practice'; question: string }
  | { task: 'jarvis-chat'; question: string; history: ChatMessage[] }
  | { task: 'flashcard-generate'; notes: string; count: number }

export type AiResponsePayload =
  | { task: 'study-summary'; bullets: string[] }
  | { task: 'study-quiz'; questions: QuizQuestion[] }
  | { task: 'study-chat'; answer: string }
  | { task: 'performance-insights'; insight: PerformanceInsight }
  | { task: 'homework-solve'; steps: string[] }
  | { task: 'homework-simple'; explanation: string }
  | { task: 'homework-practice'; questions: string[] }
  | { task: 'jarvis-chat'; answer: string }
  | { task: 'flashcard-generate'; cards: Flashcard[] }

export type AiApiSuccess = {
  ok: true
  data: AiResponsePayload
}

export type AiApiFailure = {
  ok: false
  error: string
}

export type AiApiResponse = AiApiSuccess | AiApiFailure