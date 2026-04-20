import type { ChatMessage, Flashcard, PerformanceInsight, PerformanceRow, QuizQuestion, StudyBlock } from '../types'

export const sampleStudyNotes = `Photosynthesis is the process by which green plants, algae, and some bacteria convert light energy into chemical energy stored in glucose.

The process mainly happens in the chloroplasts. Chlorophyll captures sunlight and uses that energy to start a chain of reactions. During the light-dependent stage, water molecules split and release oxygen as a by-product. This stage also creates ATP and NADPH, which store temporary energy.

The Calvin cycle uses ATP, NADPH, and carbon dioxide to build glucose. Because glucose stores energy, it becomes an essential fuel source for plants and, indirectly, for animals that depend on plants for food.

Several factors affect the rate of photosynthesis. Light intensity can increase the rate up to a certain limit. Carbon dioxide concentration also matters because carbon is needed to build sugar molecules. Temperature influences enzyme activity, so too much heat can slow the process after an optimal point.

Photosynthesis is important not only because it helps plants grow, but also because it produces oxygen and supports most food chains on Earth.`

export const sampleStudySummary = [
  'Photosynthesis converts light energy into chemical energy stored in glucose.',
  'The light-dependent reactions in chloroplasts split water, release oxygen, and generate ATP and NADPH.',
  'The Calvin cycle uses carbon dioxide plus stored energy molecules to make glucose.',
  'Light intensity, carbon dioxide concentration, and temperature all influence the rate of photosynthesis.',
  'The process supports plant growth, oxygen production, and the broader food chain.',
]

export const sampleQuiz: QuizQuestion[] = [
  {
    question: 'What is the main product that stores energy for the plant?',
    options: ['Glucose', 'Oxygen', 'Water', 'Chlorophyll'],
    answer: 'Glucose',
    explanation: 'The notes explain that photosynthesis stores chemical energy in glucose.',
  },
  {
    question: 'What happens to water during the light-dependent reactions?',
    options: [
      'It is split and oxygen is released',
      'It becomes glucose directly',
      'It turns into carbon dioxide',
      'It stops enzyme activity',
    ],
    answer: 'It is split and oxygen is released',
    explanation: 'The notes say water molecules split and release oxygen as a by-product.',
  },
  {
    question: 'Which molecules power the Calvin cycle according to the notes?',
    options: ['ATP and NADPH', 'Oxygen and nitrogen', 'Protein and starch', 'Heat and chlorophyll'],
    answer: 'ATP and NADPH',
    explanation: 'ATP and NADPH carry the temporary energy used to build glucose.',
  },
  {
    question: 'Which factor below is listed as affecting the rate of photosynthesis?',
    options: ['Carbon dioxide concentration', 'Moon phase', 'Wind speed only', 'Soil color'],
    answer: 'Carbon dioxide concentration',
    explanation: 'The notes list light intensity, carbon dioxide concentration, and temperature.',
  },
  {
    question: 'Why is photosynthesis important beyond plant growth?',
    options: [
      'It supports oxygen production and food chains',
      'It removes all heat from the environment',
      'It replaces respiration completely',
      'It works only at night',
    ],
    answer: 'It supports oxygen production and food chains',
    explanation: 'The final paragraph connects photosynthesis to oxygen and Earths food chains.',
  },
]

export const sampleChat: ChatMessage[] = [
  {
    id: 'study-welcome',
    role: 'assistant',
    content:
      'Drop in your notes and I will help you summarize them, test recall, and answer questions using only the material you provided.',
  },
]

export const samplePerformanceRows: PerformanceRow[] = [
  {
    id: 'mathematics',
    subject: 'Mathematics',
    current: 78,
    previous: 71,
    target: 90,
    focus: 'Algebraic manipulation, word problems',
  },
  {
    id: 'physics',
    subject: 'Physics',
    current: 64,
    previous: 69,
    target: 85,
    focus: 'Vectors, electricity, formula recall',
  },
  {
    id: 'chemistry',
    subject: 'Chemistry',
    current: 72,
    previous: 74,
    target: 86,
    focus: 'Organic reactions, balancing equations',
  },
  {
    id: 'english',
    subject: 'English',
    current: 88,
    previous: 83,
    target: 92,
    focus: 'Essay structure, evidence selection',
  },
  {
    id: 'history',
    subject: 'History',
    current: 69,
    previous: 63,
    target: 84,
    focus: 'Cause-effect chains, date retention',
  },
]

export const samplePerformanceInsight: PerformanceInsight = {
  weakAreas: [
    'Physics is the most urgent gap: 64 now, 21 points below target, and trending down from the previous score.',
    'History is improving, but it still sits 15 points below target and needs stronger recall of causes and timelines.',
    'Chemistry is stable but not yet efficient enough, especially on reaction patterns and balancing.',
  ],
  studyPlan: [
    'Monday and Thursday: spend 45 focused minutes on Physics formulas, then finish with five timed application questions.',
    'Tuesday: review History causes and consequences using a one-page memory map plus a quick oral recap.',
    'Wednesday and Saturday: alternate Chemistry reaction drills with worked examples to improve speed and accuracy.',
    'Keep Mathematics in maintenance mode with two short practice blocks so its recent momentum does not drop.',
  ],
  priorityTopics: [
    'Vectors and electricity',
    'Cause-effect chains in History',
    'Organic reaction recognition',
    'Balancing equations under time pressure',
  ],
  narrative:
    'The overall picture is promising: the average is moving in the right direction, but Physics, History, and Chemistry need sharper, higher-frequency review. Protect Mathematics and English as strengths while directing most recovery effort into the subjects with the biggest gap-to-target.',
}

export const sampleHomeworkQuestion = 'Solve 3x + 5 = 20.'

export const sampleHomeworkSolution = [
  'Start with the equation 3x + 5 = 20.',
  'Subtract 5 from both sides to isolate the term with x: 3x = 15.',
  'Divide both sides by 3 to solve for x: x = 5.',
  'Check the answer by substituting back in: 3(5) + 5 = 20, so the solution is correct.',
]

export const sampleHomeworkSimple =
  'Think of the equation like a balance. First remove the extra +5, then split the remaining 15 into 3 equal groups. Each group is 5, so x = 5.'

export const sampleHomeworkPractice = [
  'Solve 4x - 7 = 21.',
  'Solve 5x + 12 = 37.',
  'Solve 2x - 9 = 11.',
]

export const sampleFlashcards: Flashcard[] = [
  { id: 'fc-demo-1', front: 'What is photosynthesis?', back: 'The process by which green plants convert light energy into chemical energy stored in glucose.', mastered: false },
  { id: 'fc-demo-2', front: 'Where does photosynthesis mainly take place?', back: 'In the chloroplasts, where chlorophyll captures sunlight to start a chain of reactions.', mastered: false },
  { id: 'fc-demo-3', front: 'What happens during the light-dependent stage?', back: 'Water molecules split, releasing oxygen as a by-product, and creating ATP and NADPH.', mastered: false },
  { id: 'fc-demo-4', front: 'What does the Calvin cycle do?', back: 'Uses ATP, NADPH, and carbon dioxide to build glucose molecules.', mastered: false },
  { id: 'fc-demo-5', front: 'What three factors affect the rate of photosynthesis?', back: 'Light intensity, carbon dioxide concentration, and temperature.', mastered: false },
  { id: 'fc-demo-6', front: 'Why is photosynthesis globally important?', back: 'It produces oxygen and supports most food chains on Earth, not just plant growth.', mastered: false },
]

export const sampleStudyBlocks: StudyBlock[] = [
  { id: 'sb-1', day: 'Mon', startHour: 9, duration: 2, subject: 'Mathematics', color: '#3b82f6' },
  { id: 'sb-2', day: 'Mon', startHour: 14, duration: 1, subject: 'Physics', color: '#8b5cf6' },
  { id: 'sb-3', day: 'Tue', startHour: 10, duration: 2, subject: 'Chemistry', color: '#10b981' },
  { id: 'sb-4', day: 'Wed', startHour: 9, duration: 2, subject: 'History', color: '#f59e0b' },
  { id: 'sb-5', day: 'Wed', startHour: 15, duration: 1, subject: 'English', color: '#ef4444' },
  { id: 'sb-6', day: 'Thu', startHour: 10, duration: 2, subject: 'Physics', color: '#8b5cf6' },
  { id: 'sb-7', day: 'Fri', startHour: 9, duration: 2, subject: 'Mathematics', color: '#3b82f6' },
  { id: 'sb-8', day: 'Sat', startHour: 10, duration: 2, subject: 'Chemistry', color: '#10b981' },
]

