import type { ChatMessage, PerformanceRow } from '../types'
import type { AiRequestPayload, AiResponsePayload } from './ai-contract'
import {
  buildMockFlashcards,
  buildMockHomeworkSimple,
  buildMockHomeworkSolution,
  buildMockPerformanceInsight,
  buildMockPracticeQuestions,
  buildMockQuiz,
  buildMockStudyAnswer,
  buildMockSummary,
  extractKeywords,
} from './mockAi'

// In Expo we use process.env.EXPO_PUBLIC_* constants provided by Metro.
function getProvider() {
  return process.env.EXPO_PUBLIC_AI_PROVIDER || 'mock'
}

type AiRuntime = {
  mode: 'mock' | 'secure'
  label: string
  detail: string
}

export function getAiRuntime(): AiRuntime {
  if (getProvider() === 'server') {
    return {
      mode: 'secure',
      label: 'Secure AI',
      detail: 'Requests are sent to the AI endpoint directly using the credentials.',
    }
  }

  return {
    mode: 'mock',
    label: 'Demo AI',
    detail: 'The app is running in polished demo mode. Set EXPO_PUBLIC_AI_PROVIDER=server to enable real AI calls.',
  }
}

export { extractKeywords }

// Emit analytics or fallback if needed; we bypass browser window eventing in RN.
function emitAiFallback(task: AiRequestPayload['task'], error: unknown) {
  console.warn(`[AI Fallback]: ${task} failed:`, error)
}

async function runWithSecureFallback<T>(
  task: AiRequestPayload['task'],
  secureAction: () => Promise<T>,
  fallbackAction: () => T,
) {
  if (getAiRuntime().mode === 'mock') {
    return fallbackAction()
  }

  try {
    return await secureAction()
  } catch (error) {
    emitAiFallback(task, error)
    return fallbackAction()
  }
}

// Since the mobile app might not have a localhost /api/ai Vercel server running if built
// standalone, we simulate connecting to a backend or call the HF endpoint directly depending
// on your EXPO_PUBLIC_AI_BASE_URL. For this port, we will directly emulate Vercel's behavior.
async function callSecureAi<TTask extends AiRequestPayload['task']>(
  payload: Extract<AiRequestPayload, { task: TTask }>,
) {
  // If we had a remote backend API configured through EXPO_PUBLIC_BACKEND_URL:
  // const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';
  // const response = await fetch(`${BASE_URL}/api/ai`, { ... })
  
  // To keep it simple and perfectly mapped to the structure, we currently simulate it 
  // via local HF endpoints directly inside the mobile client for testing if Vercel server is not active:
  const token = process.env.EXPO_PUBLIC_HF_TOKEN;
  const baseUrl = process.env.EXPO_PUBLIC_AI_BASE_URL;
  const model = process.env.EXPO_PUBLIC_AI_MODEL;
  
  if (!token || !baseUrl || !model) {
      throw new Error("Missing AI environment variables for direct interaction.");
  }
  
  // Here we map the frontend abstraction back to the raw Hugging Face endpoint mimicking api/ai.ts
  let sysPrompt = '';
  let contentPrompt = '';
  
  switch(payload.task) {
    case 'study-summary': {
      const summaryPayload = payload as Extract<AiRequestPayload, { task: 'study-summary' }>;
      sysPrompt = 'You are a precise study assistant. Produce short, clear bullet points.';
      contentPrompt = `Summarize these notes:\n\n${summaryPayload.notes}`;
      break;
    }
    case 'study-quiz': {
      const quizPayload = payload as Extract<AiRequestPayload, { task: 'study-quiz' }>;
      sysPrompt = `You are a strict JSON quiz generator. Generate exactly a JSON array of 5 questions following this schema:
      [{
        "question": "string",
        "options": ["string", "string", "string", "string"],
        "answer": "string",
        "explanation": "string"
      }]
      Return ONLY valid JSON and nothing else.`;
      contentPrompt = `Generate a quiz based on these notes:\n\n${quizPayload.notes}`;
      break;
    }
    case 'homework-solve': {
      const solvePayload = payload as Extract<AiRequestPayload, { task: 'homework-solve' }>;
      sysPrompt = 'You are a patient homework tutor. Solve the following problem step by step.';
      contentPrompt = solvePayload.question;
      break;
    }
    case 'study-chat': {
      const chatPayload = payload as Extract<AiRequestPayload, { task: 'study-chat' }>;
      sysPrompt = 'You are a helpful tutor answering based on the provided notes context only.';
      contentPrompt = `Notes:\n${chatPayload.notes}\n\nQuestion:\n${chatPayload.question}`;
      break;
    }
    case 'performance-insights': {
       const perfPayload = payload as Extract<AiRequestPayload, { task: 'performance-insights' }>;
       sysPrompt = 'Provide study insights based on performance data in JSON.';
       contentPrompt = JSON.stringify(perfPayload.rows);
       break;
    }
    case 'homework-simple': {
       const simplePayload = payload as Extract<AiRequestPayload, { task: 'homework-simple' }>;
       sysPrompt = 'Explain this homework simply.';
       contentPrompt = simplePayload.question;
       break;
    }
    case 'homework-practice': {
       const practicePayload = payload as Extract<AiRequestPayload, { task: 'homework-practice' }>;
       sysPrompt = 'Provide 3 similar practice questions.';
       contentPrompt = practicePayload.question;
       break;
    }
    case 'jarvis-chat': {
       const jarvisPayload = payload as Extract<AiRequestPayload, { task: 'jarvis-chat' }>;
       sysPrompt = 'You are J.A.R.V.I.S.';
       contentPrompt = jarvisPayload.question;
       break;
    }
    case 'flashcard-generate': {
       const flashPayload = payload as Extract<AiRequestPayload, { task: 'flashcard-generate' }>;
       sysPrompt = 'Generate flashcards JSON based on notes.';
       contentPrompt = `Notes: ${flashPayload.notes}`;
       break;
    }
    default:
      throw new Error(`Task ${payload.task} not yet mapped securely in mobile edge.`);
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: contentPrompt }
      ],
      temperature: 0.3
    })
  });
  
  if (!res.ok) throw new Error("Status " + res.status);
  
  const data = await res.json();
  const text = data.choices[0].message.content;
  
  switch(payload.task) {
    case 'study-summary':
      return { bullets: text.split('\n').map((n: string) => n.replace(/^- /, '').trim()).filter(Boolean) } as Extract<AiResponsePayload, { task: TTask }>;
    case 'study-quiz': {
        const json = JSON.parse(text.replace(/```json/g,'').replace(/```/g,''));
        return { questions: json } as Extract<AiResponsePayload, { task: TTask }>;
    }
    case 'homework-solve':
        return { steps: text.split('\n').filter(Boolean) } as Extract<AiResponsePayload, { task: TTask }>;
    case 'study-chat':
    case 'jarvis-chat':
        return { answer: text } as Extract<AiResponsePayload, { task: TTask }>;
    case 'performance-insights':
        return { insight: JSON.parse(text) } as Extract<AiResponsePayload, { task: TTask }>;
    case 'homework-simple':
        return { explanation: text } as Extract<AiResponsePayload, { task: TTask }>;
    case 'homework-practice':
        return { questions: text.split('\n').filter(Boolean) } as Extract<AiResponsePayload, { task: TTask }>;
    case 'flashcard-generate':
        return { cards: JSON.parse(text) } as Extract<AiResponsePayload, { task: TTask }>;
  }
  
  throw new Error("Unhandled secure task mapping.");
}

export async function generateSummary(notes: string) {
  return runWithSecureFallback(
    'study-summary',
    async () => {
      const response = await callSecureAi({ task: 'study-summary', notes })
      return response.bullets
    },
    () => buildMockSummary(notes),
  )
}

export async function generateQuiz(notes: string) {
  return runWithSecureFallback(
    'study-quiz',
    async () => {
      const response = await callSecureAi({ task: 'study-quiz', notes })
      return response.questions
    },
    () => buildMockQuiz(notes),
  )
}

export async function answerStudyQuestion(notes: string, question: string, history: ChatMessage[]) {
  return runWithSecureFallback(
    'study-chat',
    async () => {
      const response = await callSecureAi({ task: 'study-chat', notes, question, history })
      return response.answer
    },
    () => buildMockStudyAnswer(notes, question),
  )
}

export async function analyzePerformance(rows: PerformanceRow[]) {
  return runWithSecureFallback(
    'performance-insights',
    async () => {
      const response = await callSecureAi({ task: 'performance-insights', rows })
      return response.insight
    },
    () => buildMockPerformanceInsight(rows),
  )
}

export async function solveHomework(question: string) {
  return runWithSecureFallback(
    'homework-solve',
    async () => {
      const response = await callSecureAi({ task: 'homework-solve', question })
      return response.steps
    },
    () => buildMockHomeworkSolution(question),
  )
}

export async function explainHomeworkSimply(question: string) {
  return runWithSecureFallback(
    'homework-simple',
    async () => {
      const response = await callSecureAi({ task: 'homework-simple', question })
      return response.explanation
    },
    () => buildMockHomeworkSimple(question),
  )
}

export async function generateSimilarQuestions(question: string) {
  return runWithSecureFallback(
    'homework-practice',
    async () => {
      const response = await callSecureAi({ task: 'homework-practice', question })
      return response.questions
    },
    () => buildMockPracticeQuestions(question),
  )
}

export async function askJarvis(question: string, history: ChatMessage[]) {
  return runWithSecureFallback(
    'jarvis-chat',
    async () => {
      const response = await callSecureAi({ task: 'jarvis-chat', question, history })
      return response.answer
    },
    () => `I'm currently operating in demo mode.`,
  )
}

export async function generateFlashcards(notes: string, count = 8) {
  return runWithSecureFallback(
    'flashcard-generate',
    async () => {
      const response = await callSecureAi({ task: 'flashcard-generate', notes, count })
      return response.cards
    },
    () => buildMockFlashcards(notes, count),
  )
}
