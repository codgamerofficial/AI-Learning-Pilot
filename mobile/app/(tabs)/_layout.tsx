import { Tabs } from 'expo-router';
import { NotebookPen, Timer, UserCircle, Sigma, BarChart3, Home } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#eb5e28',
        tabBarInactiveTintColor: '#a6a198',
        tabBarStyle: {
          backgroundColor: '#252422',
          borderTopColor: '#2e2c29',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: '#252422',
          borderBottomWidth: 1,
          borderBottomColor: '#2e2c29',
        },
        headerTintColor: '#fffcf2',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="study"
        options={{
          title: 'Copilot',
          tabBarIcon: ({ color }) => <NotebookPen color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="performance"
        options={{
          title: 'Performance',
          tabBarIcon: ({ color }) => <BarChart3 color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="homework"
        options={{
          title: 'Solver',
          tabBarIcon: ({ color }) => <Sigma color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="timer"
        options={{
          title: 'Timer',
          tabBarIcon: ({ color }) => <Timer color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <UserCircle color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
