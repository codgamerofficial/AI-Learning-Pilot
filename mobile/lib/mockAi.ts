import type { Flashcard, PerformanceInsight, PerformanceRow, QuizQuestion } from '../types.js'

const stopWords = new Set([
  'a',
  'about',
  'after',
  'all',
  'also',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'because',
  'been',
  'before',
  'between',
  'both',
  'but',
  'by',
  'can',
  'during',
  'each',
  'for',
  'from',
  'had',
  'has',
  'have',
  'helps',
  'how',
  'if',
  'in',
  'into',
  'is',
  'it',
  'its',
  'mainly',
  'most',
  'not',
  'of',
  'on',
  'only',
  'or',
  'other',
  'out',
  'point',
  'process',
  'that',
  'the',
  'their',
  'them',
  'then',
  'there',
  'these',
  'they',
  'this',
  'through',
  'to',
  'too',
  'up',
  'uses',
  'using',
  'water',
  'when',
  'which',
  'while',
  'with',
])

function splitIdeas(input: string) {
  return input
    .replace(/\r/g, '')
    .split(/\n+/)
    .flatMap((chunk) => chunk.split(/(?<=[.!?])\s+/))
    .map((idea) => idea.replace(/\s+/g, ' ').trim())
    .filter((idea) => idea.length > 24)
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values))
}

function sentenceCase(value: string) {
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) {
    return normalized
  }

  const capitalized = normalized[0].toUpperCase() + normalized.slice(1)
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`
}

export function extractKeywords(input: string, limit = 6) {
  const counts = new Map<string, number>()

  input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word))
    .forEach((word) => {
      counts.set(word, (counts.get(word) || 0) + 1)
    })

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([word]) => sentenceCase(word))
}

export function safeJsonParse<T>(raw: string): T | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced?.[1] || raw

  try {
    return JSON.parse(candidate) as T
  } catch {
    return null
  }
}

export function buildMockSummary(notes: string) {
  const ideas = splitIdeas(notes)
  if (!ideas.length) {
    return [
      'Paste or upload notes to generate a compact study summary.',
      'The summary panel will highlight the most test-ready takeaways.',
    ]
  }

  return unique(ideas.map(sentenceCase)).slice(0, 5)
}

export function buildMockQuiz(notes: string): QuizQuestion[] {
  const bullets = buildMockSummary(notes)
  const distractorPool = unique([
    ...bullets,
    ...extractKeywords(notes, 8).map((keyword) => sentenceCase(`Review ${keyword.toLowerCase()}`)),
    'The notes do not mention this idea directly.',
  ])

  return bullets.slice(0, 5).map((bullet, index) => {
    const distractors = distractorPool.filter((item) => item !== bullet).slice(index, index + 3)
    while (distractors.length < 3) {
      distractors.push('Focus on the strongest idea from the notes.')
    }

    return {
      question: `Which statement best matches the notes for concept ${index + 1}?`,
      options: [bullet, ...distractors],
      answer: bullet,
      explanation: bullet,
    }
  })
}

function getWordOverlapScore(source: string, query: string) {
  const sourceWords = source
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  const queryWords = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2)

  return queryWords.reduce((score, word) => score + (sourceWords.includes(word) ? 1 : 0), 0)
}

export function buildMockStudyAnswer(notes: string, question: string) {
  const bestMatches = splitIdeas(notes)
    .map((idea) => ({ idea, score: getWordOverlapScore(idea, question) }))
    .sort((left, right) => right.score - left.score)
    .filter((entry) => entry.score > 0)
    .slice(0, 2)
    .map((entry) => sentenceCase(entry.idea))

  if (!bestMatches.length) {
    const topics = extractKeywords(notes, 4).map((topic) => topic.replace(/\.$/, ''))
    return `Your notes do not clearly answer that yet. The closest themes I can see are ${topics.join(', ')}. Add more detail to the notes or ask a narrower question.`
  }

  return `From your notes:\n- ${bestMatches.join('\n- ')}\n\nIn short: ${bestMatches[0]}`
}

function average(values: number[]) {
  if (!values.length) {
    return 0
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

export function buildMockPerformanceInsight(rows: PerformanceRow[]): PerformanceInsight {
  const rankedRows = [...rows].sort((left, right) => {
    const leftGap = left.target - left.current
    const rightGap = right.target - right.current
    return rightGap - leftGap
  })
  const weakest = rankedRows.slice(0, 3)
  const strongest = [...rows].sort((left, right) => right.current - left.current)[0]
  const overallAverage = average(rows.map((row) => row.current))

  return {
    weakAreas: weakest.map((row) => {
      const trend = row.current - row.previous
      const trendLabel =
        trend < 0 ? `down ${Math.abs(trend)} points` : trend > 0 ? `up ${trend} points` : 'holding steady'

      return `${row.subject} is ${Math.max(row.target - row.current, 0)} points below target and is currently ${trendLabel}. Focus on ${row.focus.toLowerCase()}.`
    }),
    studyPlan: weakest.map((row, index) => {
      const dayLabel = ['Monday', 'Wednesday', 'Friday'][index] || `Study block ${index + 1}`
      return `${dayLabel}: spend 45 minutes on ${row.subject}, start with ${row.focus.toLowerCase()}, then finish with a timed recall set.`
    }),
    priorityTopics: unique(
      weakest.flatMap((row) =>
        row.focus
          .split(/[,;/]/)
          .map((topic) => topic.trim())
          .filter(Boolean)
          .map(sentenceCase),
      ),
    ).slice(0, 5),
    narrative: `${strongest.subject} is your strongest subject right now, and your current average sits at ${overallAverage}%. The biggest lift will come from closing the gap in ${weakest.map((row) => row.subject).join(', ')} while protecting your momentum in the subjects that are already improving.`,
  }
}

type LinearEquation = {
  coefficient: number
  constant: number
  rightSide: number
  solution: number
}

function parseLinearEquation(question: string): LinearEquation | null {
  const normalized = question.replace(/\s+/g, '').replace(/[?]/g, '').toLowerCase()
  const match = normalized.match(/^(-?\d*)x([+-]\d+)?=(-?\d+)$/)

  if (!match) {
    return null
  }

  const coefficientToken = match[1]
  const constantToken = match[2]
  const rightSide = Number(match[3])
  const coefficient =
    coefficientToken === '' || coefficientToken === '+'
      ? 1
      : coefficientToken === '-'
        ? -1
        : Number(coefficientToken)
  const constant = constantToken ? Number(constantToken) : 0

  if (!Number.isFinite(coefficient) || !Number.isFinite(constant) || coefficient === 0) {
    return null
  }

  const solution = (rightSide - constant) / coefficient

  if (!Number.isFinite(solution)) {
    return null
  }

  return { coefficient, constant, rightSide, solution }
}

export function buildMockHomeworkSolution(question: string) {
  const equation = parseLinearEquation(question)

  if (equation) {
    const constantAction =
      equation.constant >= 0
        ? `Subtract ${equation.constant} from both sides`
        : `Add ${Math.abs(equation.constant)} to both sides`
    const isolatedValue = equation.rightSide - equation.constant

    return [
      `Start with the equation ${equation.coefficient}x ${equation.constant >= 0 ? '+' : '-'} ${Math.abs(equation.constant)} = ${equation.rightSide}.`,
      `${constantAction} so the x-term stands alone: ${equation.coefficient}x = ${isolatedValue}.`,
      `Divide both sides by ${equation.coefficient} to get x = ${equation.solution}.`,
      `Check by substituting back into the original equation to confirm the balance still holds.`,
    ]
  }

  return [
    'Read the question carefully and identify exactly what final answer is required.',
    'Pull out the known values, definitions, or formulas that connect to the problem.',
    'Work through the reasoning in small steps instead of trying to jump to the answer.',
    'Check the result against the original prompt to make sure the units and logic match.',
  ]
}

export function buildMockHomeworkSimple(question: string) {
  const equation = parseLinearEquation(question)

  if (equation) {
    return `Treat the equation like a balance. First remove the extra ${equation.constant >= 0 ? `${equation.constant}` : `${Math.abs(equation.constant)}`} from the x side, then split what remains by ${equation.coefficient}. That leaves x = ${equation.solution}.`
  }

  return 'Think of this as a two-step process: figure out what information matters most, then use one clear method at a time until the final answer lines up with the question.'
}

export function buildMockPracticeQuestions(question: string) {
  const equation = parseLinearEquation(question)

  if (equation) {
    return [
      `Solve ${equation.coefficient + 1}x + ${Math.abs(equation.constant) + 2} = ${equation.rightSide + 6}.`,
      `Solve ${equation.coefficient + 2}x - ${Math.abs(equation.constant) + 1} = ${equation.rightSide + 8}.`,
      `Solve ${Math.max(2, equation.coefficient)}x + ${Math.abs(equation.constant) + 4} = ${equation.rightSide + 10}.`,
    ]
  }

  return [
    'Create a similar problem that uses the same concept but different numbers or examples.',
    'Rewrite the question in a shorter form and solve that first.',
    'Design a harder version of the problem that adds one extra step.',
  ]
}

export function buildMockFlashcards(notes: string, count = 8): Flashcard[] {
  const ideas = splitIdeas(notes)
  const keywords = extractKeywords(notes, count)

  if (ideas.length < 2) {
    return [
      { id: 'fc-1', front: 'What are the main topics in your notes?', back: 'Add more detailed notes to generate better flashcards.', mastered: false },
      { id: 'fc-2', front: 'Why use flashcards for studying?', back: 'Active recall via flashcards strengthens memory pathways and improves long-term retention.', mastered: false },
    ]
  }

  return keywords.slice(0, count).map((keyword, index) => {
    const relatedIdea = ideas.find(idea =>
      idea.toLowerCase().includes(keyword.toLowerCase().replace(/\.$/, ''))
    ) || ideas[index % ideas.length]

    return {
      id: `fc-${Date.now()}-${index}`,
      front: `What is the significance of ${keyword.replace(/\.$/, '')}?`,
      back: sentenceCase(relatedIdea),
      mastered: false,
    }
  })
}