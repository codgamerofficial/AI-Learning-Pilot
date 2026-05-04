import './global.css';
import React from 'react';
import { Text, ActivityIndicator, View, LogBox } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'react-native';
import { Home, Search, Library, User } from 'lucide-react-native';

// Screens
import HomeScreen from './src/screens/Home';
import SearchScreen from './src/screens/Search';
import PlayerScreen from './src/screens/Player';
import AuthScreen from './src/screens/Auth';
import LibraryScreen from './src/screens/Library';
import ProfileScreen from './src/screens/Profile';

// Components
import MiniPlayer from './src/components/MiniPlayer';
import YouTubeAudioPlayer from './src/components/YouTubeAudioPlayer';

import { useAuthStore } from './src/store/authStore';
import { usePlayerStore } from './src/store/playerStore';
import { usePreferencesStore } from './src/store/preferencesStore';
import { useJamStore } from './src/store/jamStore';

const DEV_WARNING_SUPPRESSIONS = [
  '"shadow*" style props are deprecated. Use "boxShadow".',
  'props.pointerEvents is deprecated. Use style.pointerEvents',
  "Failed to execute 'postMessage' on 'DOMWindow'",
];

if (__DEV__) {
  const globalScope = globalThis as typeof globalThis & {
    __neoConsoleFilterInstalled?: boolean;
  };

  if (!globalScope.__neoConsoleFilterInstalled) {
    globalScope.__neoConsoleFilterInstalled = true;
    const originalWarn = console.warn.bind(console);
    const originalError = console.error.bind(console);

    const shouldSuppressMessage = (args: unknown[]) => {
      const message = args
        .filter((arg): arg is string => typeof arg === 'string')
        .join(' ');

      return DEV_WARNING_SUPPRESSIONS.some((fragment) => message.includes(fragment));
    };

    console.warn = (...args: unknown[]) => {
      if (shouldSuppressMessage(args)) {
        return;
      }

      originalWarn(...args);
    };

    console.error = (...args: unknown[]) => {
      if (shouldSuppressMessage(args)) {
        return;
      }

      originalError(...args);
    };
  }
}

const LIGHT_NAV_THEME = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#F3F4F6',
    card: '#FFFFFF',
    border: '#D1D5DB',
    text: '#0A0A0A',
    primary: '#0A84FF',
  },
};

/**
 * GlobalAudioEngine — mounted once at app root, never unmounts.
 * This is what actually plays audio. Lives outside all screens so
 * tapping play on MiniPlayer, Library, or Home all produce sound.
 */
function GlobalAudioEngine() {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const play = usePlayerStore((state) => state.play);
  const pause = usePlayerStore((state) => state.pause);
  const nextTrack = usePlayerStore((state) => state.nextTrack);

  const handleStateChange = React.useCallback((state: string) => {
    if (state === 'ended') {
      nextTrack();
      return;
    }

    const currentlyPlaying = usePlayerStore.getState().isPlaying;
    if (state === 'playing' && !currentlyPlaying) {
      play();
      return;
    }

    if (state === 'paused' && currentlyPlaying) {
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }
      pause();
    }
  }, [nextTrack, play, pause]);

  if (!currentTrack) return null;

  return (
    <YouTubeAudioPlayer
      videoId={currentTrack.playbackId ?? currentTrack.id}
      audioUrl={currentTrack.url}
      play={isPlaying}
      onStateChange={handleStateChange}
    />
  );
}

function JamSyncBridge() {
  const isConnected = useJamStore((state) => state.isConnected);
  const role = useJamStore((state) => state.role);
  const applyingRemoteState = useJamStore((state) => state.applyingRemoteState);
  const broadcastNow = useJamStore((state) => state.broadcastNow);

  const currentTrackId = usePlayerStore((state) => state.currentTrack?.id ?? '');
  const queueSignature = usePlayerStore((state) => state.queue.map((track) => track.id).join('|'));
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const shuffleEnabled = usePlayerStore((state) => state.shuffleEnabled);
  const repeatMode = usePlayerStore((state) => state.repeatMode);

  const lastBroadcastSignature = React.useRef('');

  React.useEffect(() => {
    if (!isConnected || role !== 'host' || applyingRemoteState) return;

    const signature = [
      currentTrackId,
      queueSignature,
      isPlaying ? '1' : '0',
      shuffleEnabled ? '1' : '0',
      repeatMode,
    ].join('::');

    if (signature === lastBroadcastSignature.current) return;
    lastBroadcastSignature.current = signature;

    const timer = setTimeout(() => {
      void broadcastNow('state-change');
    }, 80);

    return () => clearTimeout(timer);
  }, [
    applyingRemoteState,
    broadcastNow,
    currentTrackId,
    isConnected,
    isPlaying,
    queueSignature,
    repeatMode,
    role,
    shuffleEnabled,
  ]);

  React.useEffect(() => {
    if (!isConnected || role !== 'host' || !isPlaying || applyingRemoteState) return;

    const heartbeat = setInterval(() => {
      void broadcastNow('heartbeat');
    }, 5000);

    return () => clearInterval(heartbeat);
  }, [applyingRemoteState, broadcastNow, isConnected, isPlaying, role]);

  return null;
}

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();


function MainTabs() {
  const themeMode = usePreferencesStore((state) => state.themeMode);
  const isDark = themeMode === 'dark';
  const shellBackground = isDark ? '#0A0A0A' : '#F3F4F6';

  return (
    <View style={{ flex: 1, backgroundColor: shellBackground }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF',
            borderTopWidth: 4,
            borderTopColor: isDark ? '#1C1C1E' : '#D1D5DB',
            height: 80,
            paddingBottom: 10,
          },
          sceneStyle: { backgroundColor: shellBackground },
          tabBarActiveTintColor: isDark ? '#00FF85' : '#0A84FF',
          tabBarInactiveTintColor: isDark ? '#FFF' : '#4B5563',
          tabBarIcon: ({ color, size }) => {
            if (route.name === 'HomeTab') return <Home stroke={color} size={size} />;
            if (route.name === 'SearchTab') return <Search stroke={color} size={size} />;
            if (route.name === 'LibraryTab') return <Library stroke={color} size={size} />;
            if (route.name === 'ProfileTab') return <User stroke={color} size={size} />;
            return null;
          },
          tabBarLabel: ({ color }) => (
            <Text style={{ color, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }}>
              {route.name.replace('Tab', '')}
            </Text>
          ),
        })}
      >
        <Tab.Screen name="HomeTab" component={HomeScreen} />
        <Tab.Screen name="SearchTab" component={SearchScreen} />
        <Tab.Screen name="LibraryTab" component={LibraryScreen} />
        <Tab.Screen name="ProfileTab" component={ProfileScreen} />
      </Tab.Navigator>

      {/* Mini Player floats above tab bar on all tabs */}
      <MiniPlayer />
    </View>
  );
}

export default function App() {
  const { user, loading, initialize } = useAuthStore();
  const themeMode = usePreferencesStore((state) => state.themeMode);
  const loadPreferences = usePreferencesStore((state) => state.loadPreferences);
  const leaveSession = useJamStore((state) => state.leaveSession);
  const isDark = themeMode === 'dark';
  const shellBackground = isDark ? '#0A0A0A' : '#F3F4F6';

  React.useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  React.useEffect(() => {
    if (!__DEV__) return;
    LogBox.ignoreLogs([
      '"shadow*" style props are deprecated. Use "boxShadow".',
      'props.pointerEvents is deprecated. Use style.pointerEvents',
    ]);
  }, []);

  React.useEffect(() => {
    const cleanup = initialize();
    return cleanup;
  }, [initialize]);

  React.useEffect(() => {
    if (!user) {
      void leaveSession();
    }
  }, [leaveSession, user]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: shellBackground, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={isDark ? '#00FF85' : '#0A84FF'} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: shellBackground }}>
      {/* Global audio engine — always mounted when a track is selected.
          Placing it outside NavigationContainer means it NEVER unmounts
          when screens change, so audio plays from any screen. */}
      {user && <GlobalAudioEngine />}
        {user && <JamSyncBridge />}

      <NavigationContainer theme={isDark ? DarkTheme : LIGHT_NAV_THEME}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={shellBackground} />
        <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: shellBackground } }}>
          {user ? (
            <>
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen name="Player" component={PlayerScreen} options={{ presentation: 'modal' }} />
            </>
          ) : (
            <Stack.Screen name="Auth" component={AuthScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}
