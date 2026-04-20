import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Timer, NotebookPen, Sigma } from "lucide-react-native";

export default function Home() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 p-5 space-y-6">
      <View className="mb-6 space-y-2">
        <Text className="text-3xl font-bold text-white tracking-tight">One workspace for studying.</Text>
        <Text className="text-base text-[var(--muted)]">Calm enough for daily use on the go.</Text>
      </View>

      <View className="space-y-4">
        { /* Study Copilot */ }
        <TouchableOpacity 
          className="flex-row items-center p-5 bg-[var(--panel-strong)] rounded-[24px] border border-[var(--line)]"
          onPress={() => router.push("/study")}  
        >
          <View className="w-12 h-12 rounded-xl bg-[var(--accent-soft)] items-center justify-center mr-4 shadow-sm border border-[var(--accent-border)]">
            <NotebookPen size={24} color="#eb5e28" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold text-lg">Study Copilot</Text>
            <Text className="text-[var(--muted)] text-sm">Summaries and quizzes.</Text>
          </View>
        </TouchableOpacity>

        { /* Focus Timer */ }
        <TouchableOpacity 
          className="flex-row items-center p-5 bg-[var(--panel-strong)] rounded-[24px] border border-[var(--line)]"
          onPress={() => router.push("/timer")}
        >
          <View className="w-12 h-12 rounded-xl bg-[var(--accent-soft)] items-center justify-center mr-4 shadow-sm border border-[var(--accent-border)]">
            <Timer size={24} color="#eb5e28" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold text-lg">Focus Timer</Text>
            <Text className="text-[var(--muted)] text-sm">Tap here to start.</Text>
          </View>
        </TouchableOpacity>

        { /* Homework Solver */ }
        <TouchableOpacity 
          className="flex-row items-center p-5 bg-[var(--panel-strong)] rounded-[24px] border border-[var(--line)]"
          onPress={() => router.push("/homework")}
        >
          <View className="w-12 h-12 rounded-xl bg-[var(--accent-soft)] items-center justify-center mr-4 shadow-sm border border-[var(--accent-border)]">
            <Sigma size={24} color="#eb5e28" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold text-lg">Homework Solver</Text>
            <Text className="text-[var(--muted)] text-sm">Step-by-step logic.</Text>
          </View>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}
