import { useState, useDeferredValue } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { BarChart3, Sparkles, Plus, Trash2 } from 'lucide-react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { useAsyncStorage } from '../../lib/useAsyncStorage';
import { samplePerformanceRows, samplePerformanceInsight } from '../../data/sampleData';
import { analyzePerformance } from '../../lib/ai';
import type { PerformanceRow, PerformanceInsight } from '../../types';

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export default function PerformanceScreen() {
  const [rows, setRows] = useAsyncStorage<PerformanceRow[]>('ailos.performance.rows', samplePerformanceRows);
  const [insights, setInsights] = useAsyncStorage<PerformanceInsight>('ailos.performance.insights', samplePerformanceInsight);
  const [isBusy, setIsBusy] = useState(false);
  const deferredRows = useDeferredValue(rows);
  
  const averageScore = average(deferredRows.map((row) => row.current));
  const averageGap = average(deferredRows.map((row) => Math.max(row.target - row.current, 0)));

  const chartLabels = deferredRows.map(r => r.subject.substring(0, 3));

  function updateTextField(id: string, field: 'subject' | 'focus', value: string) {
    setRows(current => current.map(row => (row.id === id ? { ...row, [field]: value } : row)));
  }

  function updateNumberField(id: string, field: 'current' | 'previous' | 'target', value: string) {
    const nextValue = Number(value);
    setRows(current => current.map(row => (row.id === id ? { ...row, [field]: Number.isFinite(nextValue) ? nextValue : 0 } : row)));
  }

  function handleAddRow() {
    const nextIndex = rows.length + 1;
    setRows(current => [
      ...current,
      { id: `custom-${Date.now()}`, subject: `Subject ${nextIndex}`, current: 70, previous: 68, target: 85, focus: 'New target area' },
    ]);
  }

  async function handleAnalyze() {
    if (!rows.length) return;
    setIsBusy(true);
    try {
      const result = await analyzePerformance(rows);
      setInsights(result);
    } catch(e) {
      console.warn("Failed to analyze", e);
    }
    setIsBusy(false);
  }

  function handleLoadDemo() {
    setRows(samplePerformanceRows);
    setInsights(samplePerformanceInsight);
  }

  return (
    <ScrollView className="flex-1 bg-[var(--background)] p-5 space-y-6 content-container pb-20">
      <View className="space-y-4 mb-6">
        <Text className="text-2xl font-bold text-white">Performance Analyzer</Text>
        <Text className="text-[var(--muted)] text-sm">Compare current performance against goals to generate a study plan.</Text>
      </View>

      <View className="flex-row gap-2 justify-between mb-2">
        <View className="flex-1 bg-[var(--panel-strong)] p-3 rounded-2xl border border-[var(--line)]">
          <Text className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-widest mb-1">Avg Score</Text>
          <Text className="text-xl font-bold text-[#eb5e28]">{averageScore}%</Text>
        </View>
        <View className="flex-1 bg-[var(--panel-strong)] p-3 rounded-2xl border border-[var(--line)]">
          <Text className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-widest mb-1">Target Gap</Text>
          <Text className="text-xl font-bold text-white">{averageGap} pts</Text>
        </View>
      </View>

      {/* Row Editor -> Cards on Mobile */}
      <View className="space-y-4">
        {rows.map((row) => (
          <View key={row.id} className="bg-[var(--panel-strong)] p-4 rounded-2xl border border-[var(--line)] space-y-3">
             <View className="flex-row justify-between items-center">
                <TextInput value={row.subject} onChangeText={t => updateTextField(row.id, 'subject', t)} className="text-white text-lg font-bold border-b border-[var(--line)] pb-1 flex-1 max-w-[70%]" />
                <TouchableOpacity onPress={() => setRows(current => current.filter(r => r.id !== row.id))} className="p-2 bg-[var(--panel)] rounded-full">
                  <Trash2 color="#a6a198" size={16} />
                </TouchableOpacity>
             </View>
             
             <View className="flex-row justify-between">
                <View className="flex-1 mr-2">
                   <Text className="text-xs text-[var(--muted)] mb-1">Current</Text>
                   <TextInput keyboardType="numeric" value={row.current.toString()} onChangeText={t => updateNumberField(row.id, 'current', t)} className="text-white border border-[var(--line)] rounded-xl px-3 py-2" />
                </View>
                <View className="flex-1 mr-2">
                   <Text className="text-xs text-[var(--muted)] mb-1">Prev</Text>
                   <TextInput keyboardType="numeric" value={row.previous.toString()} onChangeText={t => updateNumberField(row.id, 'previous', t)} className="text-white border border-[var(--line)] rounded-xl px-3 py-2" />
                </View>
                <View className="flex-1">
                   <Text className="text-xs text-[#eb5e28] font-bold mb-1">Target</Text>
                   <TextInput keyboardType="numeric" value={row.target.toString()} onChangeText={t => updateNumberField(row.id, 'target', t)} className="text-white border border-[#eb5e28]/50 bg-[#eb5e28]/10 rounded-xl px-3 py-2" />
                </View>
             </View>
             <View>
                <Text className="text-xs text-[var(--muted)] mb-1">Focus</Text>
                <TextInput value={row.focus} onChangeText={t => updateTextField(row.id, 'focus', t)} className="text-white border border-[var(--line)] rounded-xl px-3 py-2" />
             </View>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap gap-3 mb-6 mt-4">
        <TouchableOpacity onPress={handleAnalyze} disabled={isBusy} className="flex-row gap-2 bg-[#eb5e28] py-3 px-5 rounded-full items-center">
            {isBusy ? <ActivityIndicator size="small" color="#fff" /> : <Sparkles size={16} color="#fff" />}
            <Text className="text-white font-bold">Generate Insights</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleAddRow} className="flex-row gap-2 bg-[var(--panel-strong)] border border-[var(--line)] py-3 px-5 rounded-full items-center">
            <Plus size={16} color="#fffcf2" />
            <Text className="text-white font-bold">Add Subject</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLoadDemo} className="flex-row gap-2 bg-[var(--panel-strong)] border border-[var(--line)] py-3 px-5 rounded-full items-center">
            <BarChart3 size={16} color="#fffcf2" />
            <Text className="text-white font-bold">Demo Data</Text>
        </TouchableOpacity>
      </View>

      {/* Charts */}
      {chartLabels.length > 0 && (
         <View className="mt-6 border-t border-[var(--line)] pt-6 space-y-8">
            <View>
               <Text className="text-lg text-white font-bold mb-4">Current vs Target</Text>
               <BarChart
                 data={{
                   labels: chartLabels,
                   datasets: [
                     { data: deferredRows.map(r => r.current), color: () => '#3b82f6' },
                     { data: deferredRows.map(r => r.target), color: () => '#ef4444' }
                   ]
                 }}
                 width={Dimensions.get('window').width - 40}
                 height={220}
                 chartConfig={chartConfig}
                 yAxisSuffix=""
                 yAxisLabel=""
                 withInnerLines={false}
                 style={chartStyle}
               />
               <View className="flex-row mt-2 gap-4 justify-center">
                 <View className="flex-row items-center gap-2"><View className="w-3 h-3 bg-blue-500 rounded-sm"/><Text className="text-xs text-[var(--muted)]">Current</Text></View>
                 <View className="flex-row items-center gap-2"><View className="w-3 h-3 bg-red-500 rounded-sm"/><Text className="text-xs text-[var(--muted)]">Target</Text></View>
               </View>
            </View>

            <View>
               <Text className="text-lg text-white font-bold mb-4">Momentum (Prev vs Current)</Text>
               <LineChart
                 data={{
                   labels: chartLabels,
                   datasets: [
                     { data: deferredRows.map(r => r.previous), color: () => 'rgba(148,163,184,1)' },
                     { data: deferredRows.map(r => r.current), color: () => '#3b82f6' }
                   ]
                 }}
                 width={Dimensions.get('window').width - 40}
                 height={220}
                 chartConfig={chartConfig}
                 bezier
                 withInnerLines={false}
                 style={chartStyle}
               />
            </View>
         </View>
      )}

      {/* AI Readout */}
      {insights.weakAreas.length > 0 && (
        <View className="mt-6 border-t border-[var(--line)] pt-8 space-y-6 mb-12">
           <Text className="text-2xl font-bold text-white mb-2">Personalized Coaching</Text>
           
           <View className="rounded-[24px] border border-[#eb5e28]/30 bg-[#eb5e28]/10 p-5">
              <Text className="text-[10px] text-[#eb5e28] font-bold uppercase tracking-widest mb-2">Narrative</Text>
              <Text className="text-white leading-6">{insights.narrative}</Text>
           </View>

           <View>
              <Text className="text-lg font-bold text-white mb-3">Study Plan</Text>
              <View className="space-y-3">
                 {insights.studyPlan.map((s, i) => (
                   <View key={i} className="bg-[var(--panel-strong)] border border-[var(--line)] p-4 rounded-[20px]">
                     <Text className="text-white leading-5 text-sm">{s}</Text>
                   </View>
                 ))}
              </View>
           </View>

           <View>
              <Text className="text-lg font-bold text-white mb-3">Weak Areas</Text>
              <View className="space-y-3">
                 {insights.weakAreas.map((w, i) => (
                   <View key={i} className="bg-[var(--panel)] border border-red-500/20 p-4 rounded-[20px]">
                     <Text className="text-[#a6a198] leading-5 text-sm">{w}</Text>
                   </View>
                 ))}
              </View>
           </View>
        </View>
      )}

    </ScrollView>
  );
}

const chartConfig = {
  backgroundGradientFrom: '#252422',
  backgroundGradientTo: '#252422',
  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(166, 161, 152, ${opacity})`,
  barPercentage: 0.5,
};

const chartStyle = {
  borderRadius: 16,
  paddingVertical: 8,
};
