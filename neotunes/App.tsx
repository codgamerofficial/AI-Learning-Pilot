import './global.css';
import React from 'react';
import { Text, ActivityIndicator, View, LogBox, Platform, Alert, TouchableOpacity, useWindowDimensions } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'react-native';
import { Home, Search, Library, User, Music, Users, Download, Radio, Sparkles, Lock } from 'lucide-react-native';

// Screens
import HomeScreen from './src/screens/Home';
import SearchScreen from './src/screens/Search';
import PlayerScreen from './src/screens/Player';
import AuthScreen from './src/screens/Auth';
import LibraryScreen from './src/screens/Library';
import ProfileScreen from './src/screens/Profile';
import PulseScreen from './src/screens/Pulse';

// Components
import MiniPlayer from './src/components/MiniPlayer';
import YouTubeAudioPlayer from './src/components/YouTubeAudioPlayer';
import SafeImage from './src/components/SafeImage';

import { useAuthStore } from './src/store/authStore';
import { usePlayerStore, OFFLINE_FALLBACK_AUDIO } from './src/store/playerStore';
import { usePreferencesStore } from './src/store/preferencesStore';
import { useJamStore } from './src/store/jamStore';
import { getThemePalette } from './src/lib/themePalette';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

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
      const track = usePlayerStore.getState().currentTrack;
      if (track) {
        const isOfflineFallback = track.url === OFFLINE_FALLBACK_AUDIO;

        if (!isOfflineFallback) {
          usePlayerStore.getState().setPlaybackError(`Switching to alternative audio source...`);
          
          const failedSource = track.source || '';
          const resolveQuery = track.searchQuery?.trim() || `${track.title} ${track.artist}`.trim();
          
          if (resolveQuery) {
            console.warn(`[Playback Fallback] Stream failed for source "${failedSource}". Re-resolving...`);
            
            const { fetchResolve } = require('./src/lib/apiClient');
            fetchResolve(resolveQuery, failedSource)
              .then((resolved: any) => {
                if (resolved && (resolved.url || resolved.id)) {
                  console.log(`[Playback Fallback] Re-resolved to source: ${resolved.resolvedSource}`);
                  usePlayerStore.setState({
                    currentTrack: {
                      ...track,
                      url: resolved.url || undefined,
                      playbackId: resolved.id || undefined,
                      source: resolved.resolvedSource ?? track.source,
                    },
                    isPlaying: true
                  });
                } else {
                  // Fall back to offline fallback audio
                  usePlayerStore.setState({
                    currentTrack: {
                      ...track,
                      url: OFFLINE_FALLBACK_AUDIO,
                    }
                  });
                  setTimeout(() => usePlayerStore.getState().play(), 100);
                }
              })
              .catch(() => {
                usePlayerStore.setState({
                  currentTrack: {
                    ...track,
                    url: OFFLINE_FALLBACK_AUDIO,
                  }
                });
                setTimeout(() => usePlayerStore.getState().play(), 100);
              });
            return;
          }
        }

        usePlayerStore.getState().setPlaybackError(`Unable to play "${track.title}". Skipping...`);
        nextTrack();
        return;
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
      // Ignore paused state sync from the player component to prevent state conflicts & loading lockups
      return;
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


function MobileTabs() {
  const themeMode = usePreferencesStore((state) => state.themeMode);
  const isDark = themeMode === 'dark';
  const shellBackground = isDark ? '#09090B' : '#F8F9FA';
  const palette = getThemePalette(themeMode);
  const accentColor = palette.accent;

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
                  backgroundColor: isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.08)',
                  borderRadius: 16,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                } : {}),
              }}>
                {route.name === 'HomeTab' && <Home stroke={color} size={iconSize} strokeWidth={focused ? 2.5 : 1.8} />}
                {route.name === 'SearchTab' && <Search stroke={color} size={iconSize} strokeWidth={focused ? 2.5 : 1.8} />}
                {route.name === 'PulseTab' && <Sparkles stroke={color} size={iconSize} strokeWidth={focused ? 2.5 : 1.8} />}
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
        <Tab.Screen name="PulseTab" component={PulseScreen} />
        <Tab.Screen name="LibraryTab" component={LibraryScreen} />
        <Tab.Screen name="ProfileTab" component={ProfileScreen} />
      </Tab.Navigator>

      {/* Mini Player floats above the glass tab bar */}
      <MiniPlayer />
    </View>
  );
}

function MainTabs({ navigation }: any) {
  const { width } = useWindowDimensions();
  const themeMode = usePreferencesStore((state) => state.themeMode);
  const isDark = themeMode === 'dark';
  const palette = getThemePalette(themeMode);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  
  const [activeTab, setActiveTab] = React.useState<'home' | 'search' | 'pulse' | 'library' | 'profile'>('home');

  if (width < 768) {
    return <MobileTabs />;
  }

  const isDesktop = width >= 1024;
  
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: isDark ? '#09090B' : '#F8F9FA' }}>
      {/* Sidebar (Desktop) or Rail (Tablet) */}
      <View style={{
        width: isDesktop ? 240 : 80,
        backgroundColor: isDark ? '#0C0C0E' : '#FFFFFF',
        borderRightWidth: 1.5,
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        paddingVertical: 24,
        paddingHorizontal: isDesktop ? 16 : 0,
        alignItems: isDesktop ? 'stretch' : 'center',
        justifyContent: 'space-between',
      }}>
        <View style={{ width: '100%', alignItems: isDesktop ? 'stretch' : 'center' }}>
          {/* Brand Logo / Icon */}
          <View style={{ 
            height: 50, 
            paddingHorizontal: isDesktop ? 8 : 0, 
            marginBottom: 24, 
            justifyContent: 'center',
            alignItems: isDesktop ? 'flex-start' : 'center'
          }}>
            {isDesktop ? (
              <Text style={{ color: palette.accent, fontWeight: '900', fontSize: 22, letterSpacing: 1.5 }}>
                NEO<Text style={{ color: palette.text }}>TUNES</Text>
              </Text>
            ) : (
              <Text style={{ color: palette.accent, fontWeight: '900', fontSize: 24 }}>N</Text>
            )}
          </View>

          {/* Nav Items */}
          <View style={{ gap: 8, width: '100%' }}>
            {[
              { id: 'home', label: 'Home', icon: Home },
              { id: 'search', label: 'Search', icon: Search },
              { id: 'pulse', label: 'Pulse', icon: Sparkles },
              { id: 'library', label: 'Library', icon: Library },
              { id: 'profile', label: 'Profile', icon: User },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setActiveTab(item.id as any)}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: isDesktop ? 'flex-start' : 'center',
                    paddingVertical: 12,
                    paddingHorizontal: isDesktop ? 16 : 0,
                    borderRadius: 14,
                    backgroundColor: isActive 
                      ? (isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.08)')
                      : 'transparent',
                    borderWidth: 1,
                    borderColor: isActive ? palette.accent + '30' : 'transparent',
                  }}
                >
                  <Icon stroke={isActive ? palette.accent : palette.textSubtle} size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                  {isDesktop && (
                    <Text style={{
                      marginLeft: 14,
                      color: isActive ? palette.accent : palette.text,
                      fontWeight: isActive ? '800' : '600',
                      fontSize: 13.5,
                      letterSpacing: 0.5,
                    }}>{item.label}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {isDesktop && (
            <>
              {/* Divider */}
              <View style={{ height: 1.5, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 20 }} />

              {/* Curated Space Section */}
              <Text style={{ 
                color: palette.textSubtle, 
                fontSize: 9, 
                fontWeight: '900', 
                letterSpacing: 1.5, 
                textTransform: 'uppercase',
                paddingHorizontal: 8,
                marginBottom: 10 
              }}>
                YOUR SPACES
              </Text>

              <View style={{ gap: 4 }}>
                {[
                  { label: 'Music Jam', icon: Users, action: () => navigation.navigate('Player') },
                  { label: 'Downloads', icon: Download, action: () => setActiveTab('library') },
                  { label: 'Trending', icon: Radio, action: () => setActiveTab('home') },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <TouchableOpacity
                      key={item.label}
                      onPress={item.action}
                      activeOpacity={0.8}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                      }}
                    >
                      <Icon stroke={palette.textSubtle} size={16} />
                      <Text style={{
                        marginLeft: 12,
                        color: palette.textSubtle,
                        fontWeight: '600',
                        fontSize: 12.5,
                      }}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </View>

        {/* User Mini Profile at Bottom */}
        <View style={{ width: '100%', alignItems: isDesktop ? 'stretch' : 'center', paddingHorizontal: isDesktop ? 8 : 0 }}>
          {isDesktop ? (
            <TouchableOpacity onPress={() => setActiveTab('profile')} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                width: 32, height: 32, borderRadius: 16,
                backgroundColor: palette.accent,
                alignItems: 'center', justifyContent: 'center'
              }}>
                <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 11 }}>U</Text>
              </View>
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={{ color: palette.text, fontWeight: '700', fontSize: 12 }} numberOfLines={1}>Premium User</Text>
                <Text style={{ color: palette.textSubtle, fontSize: 10 }} numberOfLines={1}>Active Session</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setActiveTab('profile')}>
              <View style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: palette.accent,
                alignItems: 'center', justifyContent: 'center'
              }}>
                <User stroke="#FFF" size={16} />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Content Area */}
      <View style={{ flex: 1, backgroundColor: isDark ? '#09090B' : '#F8F9FA' }}>
        {activeTab === 'home' && <HomeScreen navigation={navigation} />}
        {activeTab === 'search' && <SearchScreen navigation={navigation} />}
        {activeTab === 'pulse' && <PulseScreen navigation={navigation} />}
        {activeTab === 'library' && <LibraryScreen navigation={navigation} />}
        {activeTab === 'profile' && <ProfileScreen />}
      </View>

      {/* Desktop Right Column: Player Mini HUD & Friend Activity */}
      {isDesktop && (
        <View style={{
          width: 280,
          backgroundColor: isDark ? '#0C0C0E' : '#FFFFFF',
          borderLeftWidth: 1.5,
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          padding: 20,
        }}>
          {currentTrack ? (
            <View style={{ flex: 1, justifyContent: 'space-between' }}>
              <View>
                <Text style={{ 
                  color: palette.accent, 
                  fontSize: 10, 
                  fontWeight: '900', 
                  letterSpacing: 1.5, 
                  textTransform: 'uppercase',
                  marginBottom: 14 
                }}>
                  NOW PLAYING
                </Text>
                
                <TouchableOpacity 
                  activeOpacity={0.9} 
                  onPress={() => navigation.navigate('Player')}
                  style={{
                    borderRadius: 20,
                    overflow: 'hidden',
                    borderWidth: 1.5,
                    borderColor: 'rgba(255,255,255,0.06)',
                    marginBottom: 16,
                  }}
                >
                  <SafeImage uri={currentTrack.artwork} style={{ width: '100%', height: 240 }} resizeMode="cover" />
                </TouchableOpacity>

                <Text style={{ color: palette.text, fontWeight: '900', fontSize: 16 }} numberOfLines={1}>{currentTrack.title}</Text>
                <Text style={{ color: palette.textSubtle, fontWeight: '700', fontSize: 12, marginTop: 4 }} numberOfLines={1}>{currentTrack.artist}</Text>

                {/* Progress Mini Timeline */}
                <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 14, overflow: 'hidden' }}>
                  <View style={{ 
                    width: '35%', // Simulated progress
                    height: '100%', 
                    backgroundColor: palette.accent 
                  }} />
                </View>
              </View>

              {/* Friend Activity Simulation */}
              <View style={{ flex: 1, marginTop: 24 }}>
                <Text style={{ 
                  color: palette.textSubtle, 
                  fontSize: 9, 
                  fontWeight: '900', 
                  letterSpacing: 1.5, 
                  textTransform: 'uppercase',
                  marginBottom: 12 
                }}>
                  FRIEND ACTIVITY
                </Text>
                <View style={{ gap: 12 }}>
                  {[
                    { name: 'Sarah', track: 'Imagine Dragons - Believer', time: '1m ago', avatarColor: '#7C3AED' },
                    { name: 'David', track: 'Arijit Singh - Tum Hi Ho', time: '5m ago', avatarColor: '#00D4FF' },
                  ].map((friend, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{
                        width: 28, height: 28, borderRadius: 14,
                        backgroundColor: friend.avatarColor,
                        alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 10 }}>{friend.name[0]}</Text>
                      </View>
                      <View style={{ marginLeft: 8, flex: 1 }}>
                        <Text style={{ color: palette.text, fontWeight: '700', fontSize: 11 }}>{friend.name}</Text>
                        <Text style={{ color: palette.textSubtle, fontSize: 9 }} numberOfLines={1}>{friend.track}</Text>
                      </View>
                      <Text style={{ color: palette.textSubtle, fontSize: 8 }}>{friend.time}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Player')}
                style={{
                  backgroundColor: palette.accent,
                  paddingVertical: 12,
                  borderRadius: 14,
                  alignItems: 'center',
                  shadowColor: palette.accent,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 10,
                  elevation: 4,
                }}
              >
                <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 }}>OPEN FULL PLAYER</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Music stroke={palette.textSubtle} size={48} opacity={0.3} />
              <Text style={{ color: palette.textSubtle, fontSize: 12, fontWeight: '700', marginTop: 12, textAlign: 'center' }}>
                Select a song to start listening
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function PlaybackErrorToast() {
  const playbackError = usePlayerStore((state) => state.playbackError);
  const setPlaybackError = usePlayerStore((state) => state.setPlaybackError);
  const themeMode = usePreferencesStore((state) => state.themeMode);
  const isDark = themeMode === 'dark';

  if (!playbackError) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => setPlaybackError(null)}
      style={{
        position: 'absolute',
        top: Platform.OS === 'web' ? 24 : 54,
        left: 20,
        right: 20,
        backgroundColor: isDark ? 'rgba(255, 107, 107, 0.15)' : 'rgba(239, 68, 68, 0.1)',
        borderColor: isDark ? '#FF6B6B' : '#EF4444',
        borderWidth: 1.5,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 99999,
        shadowColor: '#FF6B6B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.3 : 0.1,
        shadowRadius: 10,
        // @ts-ignore
        backdropFilter: 'blur(20px)',
        // @ts-ignore
        boxShadow: isDark ? '0 4px 20px rgba(255, 107, 107, 0.25)' : '0 4px 16px rgba(239, 68, 68, 0.15)',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
        <Text style={{ fontSize: 16, marginRight: 10 }}>⚠️</Text>
        <Text style={{
          color: isDark ? '#FFF' : '#1F2937',
          fontWeight: '600',
          fontSize: 13,
          fontFamily: Platform.select({
            ios: 'Helvetica Neue',
            android: 'sans-serif-medium',
            web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
          }),
          flexShrink: 1
        }}>
          {playbackError}
        </Text>
      </View>
      <Text style={{
        color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
        fontSize: 11,
        fontWeight: 'bold'
      }}>
        DISMISS
      </Text>
    </TouchableOpacity>
  );
}

export default function App() {
  const { user, loading, initialize } = useAuthStore();
  const themeMode = usePreferencesStore((state) => state.themeMode);
  const loadPreferences = usePreferencesStore((state) => state.loadPreferences);
  const leaveSession = useJamStore((state) => state.leaveSession);
  
  const isBiometricLocked = usePreferencesStore((state) => state.isBiometricLocked);
  const [isAppUnlocked, setIsAppUnlocked] = React.useState(false);

  const isDark = themeMode === 'dark';
  const shellBackground = isDark ? '#09090B' : '#F8F9FA';

  React.useEffect(() => {
    loadPreferences();

    const configureAudioMode = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          interruptionModeIOS: InterruptionModeIOS.DuckOthers,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (e) {
        console.warn('[App] Failed to configure audio mode on startup:', e);
      }
    };
    void configureAudioMode();
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

  React.useEffect(() => {
    if (!isBiometricLocked) {
      setIsAppUnlocked(true);
      return;
    }
    
    const triggerBiometricUnlock = async () => {
      const { Biometrics } = require('./src/lib/Biometrics');
      const supported = await Biometrics.isSupported();
      if (supported) {
        const success = await Biometrics.authenticate('Unlock NeoTunes Premium');
        if (success) {
          setIsAppUnlocked(true);
        }
      } else {
        setIsAppUnlocked(true);
      }
    };
    
    void triggerBiometricUnlock();
  }, [isBiometricLocked]);

  if (loading) {
    const palette = getThemePalette(themeMode);
    return (
      <View style={{ flex: 1, backgroundColor: shellBackground, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={palette.accent} />
      </View>
    );
  }

  if (isBiometricLocked && !isAppUnlocked) {
    return (
      <View style={{ flex: 1, backgroundColor: '#09090B', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          backgroundColor: 'rgba(12, 12, 14, 0.75)',
          borderWidth: 1.5,
          borderColor: 'rgba(124, 58, 237, 0.2)',
          borderRadius: 28,
          padding: 32,
          width: '90%',
          maxWidth: 360,
          alignItems: 'center',
        }}>
          <Lock stroke="#7C3AED" size={48} style={{ marginBottom: 20 }} />
          <Text style={{ color: '#E2E8F0', fontWeight: '900', fontSize: 18, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
            NEOTUNES SECURED
          </Text>
          <Text style={{ color: 'rgba(226, 232, 240, 0.45)', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 24, textAlign: 'center' }}>
            Biometric App Lock Active
          </Text>
          
          <TouchableOpacity
            onPress={async () => {
              const { Biometrics } = require('./src/lib/Biometrics');
              const success = await Biometrics.authenticate();
              if (success) setIsAppUnlocked(true);
            }}
            activeOpacity={0.8}
            style={{
              backgroundColor: '#7C3AED',
              paddingVertical: 14,
              paddingHorizontal: 24,
              borderRadius: 16,
              width: '100%',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#09090B', fontWeight: '900', fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              UNLOCK APP
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: shellBackground }}>
      {/* Non-blocking Toast Banner */}
      <PlaybackErrorToast />

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
              <Stack.Screen name="Player" component={PlayerScreen} options={{ presentation: Platform.OS === 'web' ? 'card' : 'modal' }} />
            </>
          ) : (
            <Stack.Screen name="Auth" component={AuthScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}
