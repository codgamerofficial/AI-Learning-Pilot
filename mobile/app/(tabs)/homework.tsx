import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Sigma, Sparkles, WandSparkles } from 'lucide-react-native';
import { useAsyncStorage } from '../../lib/useAsyncStorage';
import { sampleHomeworkQuestion, sampleHomeworkSolution, sampleHomeworkSimple, sampleHomeworkPractice } from '../../data/sampleData';
import { solveHomework, explainHomeworkSimply, generateSimilarQuestions } from '../../lib/ai';
import type { HomeworkTab } from '../../types';

export default function HomeworkSolverScreen() {
  const [question, setQuestion] = useAsyncStorage('ailos.homework.question', sampleHomeworkQuestion);
  const [solution, setSolution] = useAsyncStorage('ailos.homework.solution', sampleHomeworkSolution);
  const [simpleExplanation, setSimpleExplanation] = useAsyncStorage('ailos.homework.simple', sampleHomeworkSimple);
  const [practiceQuestions, setPracticeQuestions] = useAsyncStorage<string[]>('ailos.homework.practice', sampleHomeworkPractice);
  const [activeTab, setActiveTab] = useAsyncStorage<HomeworkTab>('ailos.homework.tab', 'solution');
  const [busyAction, setBusyAction] = useState<HomeworkTab | null>(null);

  async function handleSolve() {
    if (!question.trim()) return;
    setBusyAction('solution');
    try {
      const steps = await solveHomework(question);
      setSolution(steps);
      setActiveTab('solution');
    } catch (e) {
      console.warn("Failed to solve:", e);
    }
    setBusyAction(null);
  }

  async function handleExplainSimply() {
    if (!question.trim()) return;
    setBusyAction('simple');
    try {
      const explanation = await explainHomeworkSimply(question);
      setSimpleExplanation(explanation);
      setActiveTab('simple');
    } catch (e) {
      console.warn("Failed to explain:", e);
    }
    setBusyAction(null);
  }

  async function handleGeneratePractice() {
    if (!question.trim()) return;
    setBusyAction('practice');
    try {
      const questions = await generateSimilarQuestions(question);
      setPracticeQuestions(questions);
      setActiveTab('practice');
    } catch (e) {
      console.warn("Failed to gen practice:", e);
    }
    setBusyAction(null);
  }

  function handleLoadDemo() {
    setQuestion(sampleHomeworkQuestion);
    setSolution(sampleHomeworkSolution);
    setSimpleExplanation(sampleHomeworkSimple);
    setPracticeQuestions(sampleHomeworkPractice);
    setActiveTab('solution');
  }

  return (
    <ScrollView className="flex-1 bg-[var(--background)] p-5 space-y-6 content-container pb-10">
      <View className="space-y-4 mb-6">
        <Text className="text-2xl font-bold text-white">Homework Solver</Text>
        <Text className="text-[var(--muted)] text-sm">Turn a homework prompt into structured reasoning, simple explanations, and extra practice.</Text>
      </View>

      {/* Input */}
      <View className="mb-6 space-y-3">
        <Text className="text-sm font-semibold text-white">Homework prompt</Text>
        <TextInput
          multiline
          value={question}
          onChangeText={setQuestion}
          placeholder="Paste a question or problem statement..."
          placeholderTextColor="#a6a198"
          textAlignVertical="top"
          className="h-32 rounded-[26px] border border-[var(--line)] bg-[var(--panel-strong)] p-5 text-white"
        />
      </View>

      {/* Actions */}
      <View className="flex-row flex-wrap gap-3 mb-8">
        <TouchableOpacity 
          className="flex-row items-center gap-2 bg-[#eb5e28] px-5 py-3 rounded-full"
          onPress={handleSolve} disabled={busyAction !== null}
        >
          {busyAction === 'solution' ? <ActivityIndicator color="white" size="small" /> : <Sigma color="white" size={16} />}
          <Text className="text-white font-bold">Solve</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className="flex-row items-center gap-2 bg-[var(--panel-strong)] border border-[var(--line)] px-5 py-3 rounded-full"
          onPress={handleExplainSimply} disabled={busyAction !== null}
        >
          {busyAction === 'simple' ? <ActivityIndicator color="#fffcf2" size="small" /> : <Sparkles color="#fffcf2" size={16} />}
          <Text className="text-white font-bold">Explain</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className="flex-row items-center gap-2 bg-[var(--panel-strong)] border border-[var(--line)] px-5 py-3 rounded-full"
          onPress={handleGeneratePractice} disabled={busyAction !== null}
        >
          {busyAction === 'practice' ? <ActivityIndicator color="#fffcf2" size="small" /> : <WandSparkles color="#fffcf2" size={16} />}
          <Text className="text-white font-bold">Practice</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className="flex-row items-center gap-2 bg-[var(--panel-strong)] border border-[var(--line)] px-5 py-3 rounded-full"
          onPress={handleLoadDemo}
        >
          <Sigma color="#fffcf2" size={16} />
          <Text className="text-white font-bold">Demo Load</Text>
        </TouchableOpacity>
      </View>

      {/* Output Tabs */}
      <View className="border-t border-[var(--line)] pt-6 space-y-5">
        <View className="flex-row gap-2">
          <TouchableOpacity onPress={() => setActiveTab('solution')} className={`flex-row items-center gap-2 px-4 py-2 rounded-full ${activeTab === 'solution' ? 'bg-[var(--line)]' : 'bg-transparent'}`}>
            <Sigma color="#fffcf2" size={16} /><Text className="text-white font-bold">Steps</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('simple')} className={`flex-row items-center gap-2 px-4 py-2 rounded-full ${activeTab === 'simple' ? 'bg-[var(--line)]' : 'bg-transparent'}`}>
            <Sparkles color="#fffcf2" size={16} /><Text className="text-white font-bold">Simple</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('practice')} className={`flex-row items-center gap-2 px-4 py-2 rounded-full ${activeTab === 'practice' ? 'bg-[var(--line)]' : 'bg-transparent'}`}>
            <WandSparkles color="#fffcf2" size={16} /><Text className="text-white font-bold">Practice</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'solution' && (
          <View className="space-y-4 pb-8">
            {solution.map((step, i) => (
              <View key={i} className="flex-row items-center rounded-[24px] border border-[var(--line)] bg-[var(--panel-strong)] p-4 pr-16">
                <View className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eb5e28]/10 mr-4">
                  <Text className="text-lg font-semibold text-[#eb5e28]">{i + 1}</Text>
                </View>
                <Text className="text-white leading-6 flex-wrap">{step}</Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'simple' && (
           <View className="rounded-[28px] border border-[#eb5e28]/30 bg-[#eb5e28]/10 p-6 pb-8">
              <Text className="text-white leading-7">{simpleExplanation}</Text>
           </View>
        )}

        {activeTab === 'practice' && (
           <View className="space-y-4 pb-8">
              {practiceQuestions.map((item, i) => (
                <View key={i} className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-strong)] p-4">
                  <Text className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] mb-2">Practice Prompt</Text>
                  <Text className="text-white leading-6">{item}</Text>
                </View>
              ))}
           </View>
        )}
      </View>
    </ScrollView>
  );
}
