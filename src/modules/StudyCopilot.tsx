import { startTransition, useDeferredValue, useState, type ChangeEvent } from 'react'
import { motion } from 'framer-motion'
import {
  BrainCircuit,
  Download,
  FileUp,
  LoaderCircle,
  MessageSquareText,
  NotebookPen,
  Sparkles,
} from 'lucide-react'
import { toast } from '../lib/toast'

import {
  answerStudyQuestion,
  extractKeywords,
  generateQuiz,
  generateSummary,
} from '../lib/ai'
import { downloadTextFile } from '../lib/export'
import { useCloudState } from '../hooks/useCloudState'
import {
  sampleChat,
  sampleQuiz,
  sampleStudyNotes,
  sampleStudySummary,
} from '../data/sampleData'
import { EmptyState, MetricCard, Panel, SectionTitle, TabButton } from '../components/ui'
import type { ChatMessage, QuizQuestion, StudyTab } from '../types'

const primaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-full bg-[rgb(var(--accent))] px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[rgb(var(--accent-strong))] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0'

const secondaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-full border border-[rgb(var(--line))] bg-[rgb(var(--panel-strong))] px-4 py-2.5 text-sm font-semibold text-[rgb(var(--text))] transition hover:-translate-y-0.5 hover:border-[rgb(var(--accent))] hover:text-[rgb(var(--accent-strong))] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0'

export function StudyCopilot() {
  const [notes, setNotes] = useCloudState('ailos.study.notes', sampleStudyNotes)
  const [summary, setSummary] = useCloudState('ailos.study.summary', sampleStudySummary)
  const [quiz, setQuiz] = useCloudState<QuizQuestion[]>('ailos.study.quiz', sampleQuiz)
  const [chat, setChat] = useCloudState<ChatMessage[]>('ailos.study.chat', sampleChat)
  const [question, setQuestion] = useCloudState(
    'ailos.study.question',
    'What factors affect the rate of photosynthesis?',
  )
  const [activeTab, setActiveTab] = useCloudState<StudyTab>(
    'ailos.study.tab',
    'summary',
  )
  const [busyAction, setBusyAction] = useState<StudyTab | null>(null)
  const deferredNotes = useDeferredValue(notes)
  const wordCount = deferredNotes.trim().split(/\s+/).filter(Boolean).length
  const noteBlocks = deferredNotes
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean).length
  const topicHighlights = extractKeywords(deferredNotes, 5)

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const uploadedFile = event.target.files?.[0]

    if (!uploadedFile) {
      return
    }

    const fileContents = await uploadedFile.text()
    startTransition(() => {
      setNotes((current) => (current.trim() ? `${current}\n\n${fileContents}` : fileContents))
    })
    event.target.value = ''
  }

  async function handleSummarize() {
    if (!notes.trim()) {
      return
    }

    setBusyAction('summary')
    const bullets = await generateSummary(notes)
    startTransition(() => {
      setSummary(bullets)
      setActiveTab('summary')
      toast({ title: 'Summary Generated', message: 'Condensation complete!', type: 'success' })
    })
    setBusyAction(null)
  }

  async function handleGenerateQuiz() {
    if (!notes.trim()) {
      return
    }

    setBusyAction('quiz')
    const questions = await generateQuiz(notes)
    startTransition(() => {
      setQuiz(questions)
      setActiveTab('quiz')
      toast({ title: 'Quiz Ready', message: `Generated ${questions.length} questions.`, type: 'success' })
    })
    setBusyAction(null)
  }

  async function handleAskQuestion() {
    if (!notes.trim() || !question.trim()) {
      return
    }

    const nextMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question.trim(),
    }

    const nextHistory = [...chat, nextMessage]
    setChat(nextHistory)
    setQuestion('')
    setBusyAction('chat')

    const reply = await answerStudyQuestion(notes, nextMessage.content, nextHistory)

    startTransition(() => {
      setChat((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: reply,
        },
      ])
      setActiveTab('chat')
    })

    setBusyAction(null)
  }

  function handleLoadDemo() {
    startTransition(() => {
      setNotes(sampleStudyNotes)
      setSummary(sampleStudySummary)
      setQuiz(sampleQuiz)
      setChat(sampleChat)
      setQuestion('What factors affect the rate of photosynthesis?')
      setActiveTab('summary')
    })
  }

  function handleExport() {
    const exportContent = [
      '# AI Learning OS - Study Copilot',
      '## Source Notes',
      notes,
      '## Summary',
      ...summary.map((item) => `- ${item}`),
      '## Quiz',
      ...quiz.flatMap((item, index) => [
        `${index + 1}. ${item.question}`,
        ...item.options.map((option) =>
          option === item.answer ? `- ${option} (correct answer)` : `- ${option}`,
        ),
        `Explanation: ${item.explanation}`,
      ]),
      '## Tutor Chat',
      ...chat.map((message) => `${message.role.toUpperCase()}: ${message.content}`),
    ].join('\n')

    downloadTextFile('ai-learning-os-study.txt', exportContent)
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_360px]">
        <Panel className="space-y-5">
          <SectionTitle
            eyebrow="Module 1"
            title="Study Copilot"
            body="Paste lecture notes, drop in text files, then turn the material into summaries, quiz questions, and grounded tutor answers."
            action={
              <button className={secondaryButtonClass} onClick={handleExport}>
                <Download className="h-4 w-4" />
                Export
              </button>
            }
          />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <label className="space-y-3">
              <span className="text-sm font-semibold text-[rgb(var(--text))]">
                Notes Workspace
              </span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="h-[360px] w-full rounded-[26px] border border-[rgb(var(--line))] bg-[rgb(var(--panel-strong))] px-4 py-4 text-sm leading-6 text-[rgb(var(--text))] outline-none transition focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgb(var(--accent-soft))]"
                placeholder="Paste your study notes here..."
              />
            </label>

            <div className="space-y-4">
              <div className="rounded-[26px] border border-[rgb(var(--line))] bg-[rgb(var(--panel-strong))] p-4">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[rgb(var(--muted))]">
                  Source Health
                </p>
                <div className="mt-4 grid gap-3">
                  <MetricCard label="Words" value={wordCount.toLocaleString()} tone="accent" />
                  <MetricCard label="Blocks" value={noteBlocks.toString()} />
                </div>
              </div>

              <div className="rounded-[26px] border border-[rgb(var(--line))] bg-[rgb(var(--panel-strong))] p-4">
                <p className="text-sm font-semibold text-[rgb(var(--text))]">Detected topics</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {topicHighlights.map((topic) => (
                    <span
                      key={topic}
                      className="rounded-full border border-[rgb(var(--accent-border))] bg-[rgb(var(--accent-soft))] px-3 py-1 text-xs font-semibold text-[rgb(var(--accent-strong))]"
                    >
                      {topic.replace(/\.$/, '')}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[26px] border border-[rgb(var(--line))] bg-[rgb(var(--panel-strong))] p-4">
                <p className="text-sm font-semibold text-[rgb(var(--text))]">Tutor rules</p>
                <div className="mt-3 space-y-3 text-sm leading-6 text-[rgb(var(--muted))]">
                  <p>Summaries stay concise and student-friendly.</p>
                  <p>Quiz questions follow a JSON-ready MCQ structure.</p>
                  <p>Chat answers stay anchored to the notes you provide.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className={primaryButtonClass}
              onClick={handleSummarize}
              disabled={busyAction !== null || !notes.trim()}
            >
              {busyAction === 'summary' ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Summarize
            </button>
            <button
              className={secondaryButtonClass}
              onClick={handleGenerateQuiz}
              disabled={busyAction !== null || !notes.trim()}
            >
              {busyAction === 'quiz' ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <NotebookPen className="h-4 w-4" />
              )}
              Generate Quiz
            </button>
            <label className={secondaryButtonClass}>
              <FileUp className="h-4 w-4" />
              Upload Notes
              <input className="hidden" type="file" accept=".txt,.md,.csv" onChange={handleUpload} aria-label="Upload study notes" />
            </label>
            <button className={secondaryButtonClass} onClick={handleLoadDemo}>
              <BrainCircuit className="h-4 w-4" />
              Load Demo Notes
            </button>
          </div>
        </Panel>

        <Panel className="space-y-5">
          <SectionTitle
            eyebrow="Demo flow"
            title="Recruiter-ready path"
            body="This module is tuned so a reviewer can instantly see how notes become clearer, testable, and interactive."
          />

          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ staggerChildren: 0.1 }}
            className="space-y-4"
          >
            {[
              'Paste or upload notes to seed the workspace.',
              'Summarize into high-signal bullets for quick review.',
              'Generate MCQs to convert passive reading into active recall.',
              'Ask follow-up questions and keep the tutor grounded in the source material.',
            ].map((step, index) => (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                key={step}
                className="rounded-[24px] border border-[rgb(var(--line))] bg-[rgb(var(--panel-strong))] p-4 hover:border-[rgb(var(--accent-border))] transition-colors duration-300"
              >
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[rgb(var(--muted))]">
                  Step {index + 1}
                </p>
                <p className="mt-2 text-sm leading-6 text-[rgb(var(--text))]">{step}</p>
              </motion.div>
            ))}
          </motion.div>
        </Panel>
      </div>

      <Panel className="space-y-5">
        <SectionTitle
          eyebrow="Outputs"
          title="Summary, quiz, and tutor chat"
          body="Switch between study formats without losing the original context."
        />

        <div className="flex flex-wrap gap-2">
          <TabButton active={activeTab === 'summary'} onClick={() => setActiveTab('summary')}>
            <Sparkles className="h-4 w-4" />
            Summary
          </TabButton>
          <TabButton active={activeTab === 'quiz'} onClick={() => setActiveTab('quiz')}>
            <NotebookPen className="h-4 w-4" />
            Quiz
          </TabButton>
          <TabButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')}>
            <MessageSquareText className="h-4 w-4" />
            Tutor Chat
          </TabButton>
        </div>

        {activeTab === 'summary' ? (
          summary.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {summary.map((item) => (
                <div
                  key={item}
                  className="rounded-[24px] border border-[rgb(var(--line))] bg-[rgb(var(--panel-strong))] p-4"
                >
                  <p className="text-sm leading-6 text-[rgb(var(--text))]">{item}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Sparkles className="h-5 w-5" />}
              title="No summary yet"
              body="Run the summarizer to turn long notes into exam-ready bullets."
            />
          )
        ) : null}

        {activeTab === 'quiz' ? (
          quiz.length ? (
            <div className="space-y-4">
              {quiz.map((item, index) => (
                <div
                  key={`${item.question}-${index}`}
                  className="rounded-[26px] border border-[rgb(var(--line))] bg-[rgb(var(--panel-strong))] p-5"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[rgb(var(--muted))]">
                        Question {index + 1}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-[rgb(var(--text))]">
                        {item.question}
                      </h3>
                    </div>
                    <span className="rounded-full border border-[rgb(var(--accent-border))] bg-[rgb(var(--accent-soft))] px-3 py-1 text-xs font-semibold text-[rgb(var(--accent-strong))]">
                      Answer: {item.answer}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {item.options.map((option) => (
                      <div
                        key={option}
                        className="rounded-[20px] border border-[rgb(var(--line))] px-4 py-3 text-sm text-[rgb(var(--text))]"
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[rgb(var(--muted))]">
                    {item.explanation}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<NotebookPen className="h-5 w-5" />}
              title="No quiz yet"
              body="Generate MCQs to convert passive notes into active recall."
            />
          )
        ) : null}

        {activeTab === 'chat' ? (
          <div className="space-y-4">
            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-2">
              {chat.map((message) => (
                <div
                  key={message.id}
                  className={`rounded-[24px] border p-4 ${
                    message.role === 'assistant'
                      ? 'border-[rgb(var(--line))] bg-[rgb(var(--panel-strong))]'
                      : 'ml-auto max-w-[85%] border-[rgb(var(--accent-border))] bg-[rgb(var(--accent-soft))]'
                  }`}
                >
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[rgb(var(--muted))]">
                    {message.role === 'assistant' ? 'Tutor' : 'You'}
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[rgb(var(--text))]">
                    {message.content}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void handleAskQuestion()
                  }
                }}
                className="rounded-full border border-[rgb(var(--line))] bg-[rgb(var(--panel-strong))] px-4 py-3 text-sm text-[rgb(var(--text))] outline-none transition focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgb(var(--accent-soft))]"
                placeholder="Ask a question from the notes..."
              />
              <button
                className={primaryButtonClass}
                onClick={handleAskQuestion}
                disabled={busyAction !== null || !notes.trim() || !question.trim()}
              >
                {busyAction === 'chat' ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquareText className="h-4 w-4" />
                )}
                Ask Question
              </button>
            </div>
          </div>
        ) : null}
      </Panel>
    </motion.div>
  )
}
