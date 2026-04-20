import { useState, useDeferredValue } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Sparkles, NotebookPen, MessageSquareText, BrainCircuit, FileUp } from 'lucide-react-native';
import { useAsyncStorage } from '../../lib/useAsyncStorage';
import { sampleStudyNotes, sampleStudySummary, sampleQuiz, sampleChat } from '../../data/sampleData';
import { generateSummary, generateQuiz, answerStudyQuestion, extractKeywords } from '../../lib/ai';
import type { StudyTab, QuizQuestion, ChatMessage } from '../../types';

export default function StudyCopilotScreen() {
  const [notes, setNotes] = useAsyncStorage('ailos.study.notes', sampleStudyNotes);
  const [summary, setSummary] = useAsyncStorage('ailos.study.summary', sampleStudySummary);
  const [quiz, setQuiz] = useAsyncStorage<QuizQuestion[]>('ailos.study.quiz', sampleQuiz);
  const [chat, setChat] = useAsyncStorage<ChatMessage[]>('ailos.study.chat', sampleChat);
  const [question, setQuestion] = useAsyncStorage('ailos.study.question', 'What factors affect the rate of photosynthesis?');
  const [activeTab, setActiveTab] = useAsyncStorage<StudyTab>('ailos.study.tab', 'summary');
  const [busyAction, setBusyAction] = useState<StudyTab | null>(null);

  const deferredNotes = useDeferredValue(notes);
  const wordCount = deferredNotes.trim().split(/\s+/).filter(Boolean).length;
  const topicHighlights = extractKeywords(deferredNotes, 5);

  async function handleSummarize() {
    if (!notes.trim()) return;
    setBusyAction('summary');
    try {
      const bullets = await generateSummary(notes);
      setSummary(bullets);
      setActiveTab('summary');
    } catch (e) {
      console.warn("Failed to summarize", e);
    }
    setBusyAction(null);
  }

  async function handleGenerateQuiz() {
    if (!notes.trim()) return;
    setBusyAction('quiz');
    try {
      const questions = await generateQuiz(notes);
      setQuiz(questions);
      setActiveTab('quiz');
    } catch (e) {
      console.warn("Failed to quiz", e);
    }
    setBusyAction(null);
  }

  async function handleAskQuestion() {
    if (!notes.trim() || !question.trim()) return;
    const nextMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: question.trim() };
    const nextHistory = [...chat, nextMessage];
    setChat(nextHistory);
    setQuestion('');
    setBusyAction('chat');

    try {
      const reply = await answerStudyQuestion(notes, nextMessage.content, nextHistory);
      setChat((current) => [...current, { id: `assistant-${Date.now()}`, role: 'assistant', content: reply }]);
      setActiveTab('chat');
    } catch(e) {
      console.warn("Failed to chat", e);
    }
    setBusyAction(null);
  }

  function handleLoadDemo() {
    setNotes(sampleStudyNotes);
    setSummary(sampleStudySummary);
    setQuiz(sampleQuiz);
    setChat(sampleChat);
    setQuestion('What factors affect the rate of photosynthesis?');
    setActiveTab('summary');
  }

  return (
    <ScrollView className="flex-1 bg-[var(--background)] p-5 space-y-6 content-container pb-10">
      <View className="space-y-4 mb-6">
        <Text className="text-2xl font-bold text-white">Study Copilot</Text>
        <Text className="text-[var(--muted)] text-sm">Paste lecture notes to transform them into summaries, quizzes, and grounded chat.</Text>
      </View>

      {/* Input Area */}
      <View className="mb-6 space-y-3">
        <Text className="text-sm font-semibold text-white">Notes Workspace</Text>
        <TextInput
          multiline
          value={notes}
          onChangeText={setNotes}
          placeholder="Paste your study notes here..."
          placeholderTextColor="#a6a198"
          textAlignVertical="top"
          className="h-64 rounded-[26px] border border-[var(--line)] bg-[var(--panel-strong)] p-5 text-white"
        />
        <View className="flex-row items-center justify-between mt-2">
          <Text className="text-xs text-[var(--muted)] font-semibold uppercase tracking-widest">{wordCount} words</Text>
          <View className="flex-row gap-2 max-w-[200px] flex-wrap justify-end">
            {topicHighlights.slice(0,2).map(t => (
              <Text key={t} className="text-[10px] text-[#eb5e28] bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded-full">{t}</Text>
            ))}
          </View>
        </View>
      </View>

      {/* Actions */}
      <View className="flex-row flex-wrap gap-3 mb-8">
        <TouchableOpacity 
          className="flex-row items-center gap-2 bg-[#eb5e28] px-5 py-3 rounded-full"
          onPress={handleSummarize} disabled={busyAction !== null}
        >
          {busyAction === 'summary' ? <ActivityIndicator color="white" size="small" /> : <Sparkles color="white" size={16} />}
          <Text className="text-white font-bold">Summarize</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className="flex-row items-center gap-2 bg-[var(--panel-strong)] border border-[var(--line)] px-5 py-3 rounded-full"
          onPress={handleGenerateQuiz} disabled={busyAction !== null}
        >
          {busyAction === 'quiz' ? <ActivityIndicator color="#fffcf2" size="small" /> : <NotebookPen color="#fffcf2" size={16} />}
          <Text className="text-white font-bold">Make Quiz</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className="flex-row items-center gap-2 bg-[var(--panel-strong)] border border-[var(--line)] px-5 py-3 rounded-full"
          onPress={handleLoadDemo}
        >
          <BrainCircuit color="#fffcf2" size={16} />
          <Text className="text-white font-bold">Demo Notes</Text>
        </TouchableOpacity>
      </View>

      {/* Output Tabs */}
      <View className="border-t border-[var(--line)] pt-6 space-y-5">
        <View className="flex-row gap-2">
          <TouchableOpacity onPress={() => setActiveTab('summary')} className={`flex-row items-center gap-2 px-4 py-2 rounded-full ${activeTab === 'summary' ? 'bg-[var(--line)]' : 'bg-transparent'}`}>
            <Sparkles color="#fffcf2" size={16} /><Text className="text-white font-bold">Summary</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('quiz')} className={`flex-row items-center gap-2 px-4 py-2 rounded-full ${activeTab === 'quiz' ? 'bg-[var(--line)]' : 'bg-transparent'}`}>
            <NotebookPen color="#fffcf2" size={16} /><Text className="text-white font-bold">Quiz</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('chat')} className={`flex-row items-center gap-2 px-4 py-2 rounded-full ${activeTab === 'chat' ? 'bg-[var(--line)]' : 'bg-transparent'}`}>
            <MessageSquareText color="#fffcf2" size={16} /><Text className="text-white font-bold">Chat</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'summary' && (
          <View className="space-y-4">
            {summary.map((item, i) => (
              <View key={i} className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-strong)] p-5">
                <Text className="text-white leading-6">{item}</Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'quiz' && (
          <View className="space-y-4">
            {quiz.map((q, i) => (
              <View key={i} className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-strong)] p-5 space-y-4">
                <Text className="text-xs text-[var(--muted)] font-bold uppercase tracking-widest">Question {i+1}</Text>
                <Text className="text-lg text-white font-semibold">{q.question}</Text>
                
                <View className="gap-2">
                  {q.options.map((opt, j) => (
                    <View key={j} className="border border-[var(--line)] rounded-[20px] p-3">
                      <Text className="text-white">{opt}</Text>
                    </View>
                  ))}
                </View>

                <View className="mt-4 pt-4 border-t border-[var(--line)] space-y-2">
                  <Text className="text-sm font-bold text-[#eb5e28]">Answer: {q.answer}</Text>
                  <Text className="text-sm text-[var(--muted)]">{q.explanation}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'chat' && (
          <View className="space-y-4 pb-12">
            <View className="p-4 bg-[var(--panel)] min-h-[250px] rounded-[24px] border border-[var(--line)] overflow-hidden">
               {chat.map(msg => (
                 <View key={msg.id} className={`my-2 p-4 rounded-[20px] max-w-[85%] ${msg.role === 'user' ? 'self-end bg-[#eb5e28]/20 border border-[#eb5e28]/30' : 'self-start bg-[var(--panel-strong)] border border-[var(--line)]'}`}>
                   <Text className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-widest mb-1">{msg.role === 'user' ? 'You' : 'Tutor'}</Text>
                   <Text className="text-white leading-6">{msg.content}</Text>
                 </View>
               ))}
            </View>
            <View className="flex-row items-center gap-2">
               <TextInput
                 value={question}
                 onChangeText={setQuestion}
                 placeholder="Ask your tutor..."
                 placeholderTextColor="#a6a198"
                 className="flex-1 rounded-full border border-[var(--line)] bg-[var(--panel-strong)] px-5 py-3 text-white"
               />
               <TouchableOpacity onPress={handleAskQuestion} disabled={busyAction !== null} className="w-12 h-12 bg-[#eb5e28] rounded-full items-center justify-center">
                 {busyAction === 'chat' ? <ActivityIndicator color="white" /> : <MessageSquareText color="white" size={20} />}
               </TouchableOpacity>
            </View>
          </View>
        )}

      </View>
    </ScrollView>
  );
}
