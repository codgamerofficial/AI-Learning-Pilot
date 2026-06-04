import './global.css';
import React from 'react';
import { Text, ActivityIndicator, View, LogBox, Platform, Alert } from 'react-native';
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
  const prevTrack = usePlayerStore((state) => state.prevTrack);

  const handleStateChange = React.useCallback((state: string) => {
    if (state === 'ended') {
      nextTrack();
      return;
    }

    if (state === 'error') {
      pause();
      if (Platform.OS === 'web') {
        alert('Could not resolve or play this track. Skipping to the next track...');
      } else {
        Alert.alert('Playback Error', 'Could not load or resolve audio for this track. Skipping...');
      }
      nextTrack();
      return;
    }

    const currentlyPlaying = usePlayerStore.getState().isPlaying;
    if (state === 'playing' && !currentlyPlaying) {
      play();
      return;
    }

    if (state === 'paused' && currentlyPlaying) {
      if (Platform.OS === 'web') {
        // On web, ignore paused state sync from the player component to prevent autoplay lockups
        return;
      }
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }
      pause();
    }
  }, [nextTrack, play, pause]);

  // Synchronize MediaSession metadata
  React.useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !('mediaSession' in navigator) || !currentTrack) {
      return;
    }

    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: 'NeoTunes',
        artwork: [
          {
            src: currentTrack.artwork || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      });
    } catch (e) {
      console.warn('[MediaSession] metadata setup failed:', e);
    }
  }, [currentTrack]);

  // Synchronize MediaSession action handlers
  React.useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !('mediaSession' in navigator) || !currentTrack) {
      return;
    }

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        usePlayerStore.getState().play();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        usePlayerStore.getState().pause();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        usePlayerStore.getState().prevTrack();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        usePlayerStore.getState().nextTrack();
      });
    } catch (e) {
      console.warn('[MediaSession] action handlers registration failed:', e);
    }

    return () => {
      if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
      }
    };
  }, [currentTrack]);

  // Synchronize MediaSession playback state
  React.useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

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
  const accentColor = isDark ? '#00FF85' : '#0A84FF';

  return (
    <View style={{ flex: 1, backgroundColor: shellBackground }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            position: 'absolute',
            bottom: 12,
            left: 16,
            right: 16,
            height: 72,
            borderRadius: 28,
            borderWidth: 1.5,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            backgroundColor: isDark ? 'rgba(20,20,22,0.75)' : 'rgba(255,255,255,0.78)',
            paddingBottom: 8,
            paddingTop: 8,
            elevation: 20,
            shadowColor: isDark ? '#000' : '#6B7280',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: isDark ? 0.6 : 0.18,
            shadowRadius: 24,
            // @ts-ignore — Web glassmorphism
            backdropFilter: 'blur(28px) saturate(180%)',
            borderTopWidth: 0,
          },
          sceneStyle: { backgroundColor: shellBackground },
          tabBarActiveTintColor: accentColor,
          tabBarInactiveTintColor: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)',
          tabBarIcon: ({ color, focused, size }) => {
            const iconSize = focused ? size + 2 : size;
            return (
              <View style={{
                alignItems: 'center',
                justifyContent: 'center',
                ...(focused ? {
                  backgroundColor: isDark ? 'rgba(0,255,133,0.12)' : 'rgba(10,132,255,0.1)',
                  borderRadius: 16,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                } : {}),
              }}>
                {route.name === 'HomeTab' && <Home stroke={color} size={iconSize} strokeWidth={focused ? 2.5 : 1.8} />}
                {route.name === 'SearchTab' && <Search stroke={color} size={iconSize} strokeWidth={focused ? 2.5 : 1.8} />}
                {route.name === 'LibraryTab' && <Library stroke={color} size={iconSize} strokeWidth={focused ? 2.5 : 1.8} />}
                {route.name === 'ProfileTab' && <User stroke={color} size={iconSize} strokeWidth={focused ? 2.5 : 1.8} />}
              </View>
            );
          },
          tabBarLabel: ({ color, focused }) => (
            <Text style={{
              color,
              fontSize: 9,
              fontWeight: focused ? '800' : '600',
              textTransform: 'uppercase',
              letterSpacing: focused ? 1.2 : 0.8,
              marginTop: -2,
            }}>
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

      {/* Mini Player floats above the glass tab bar */}
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
