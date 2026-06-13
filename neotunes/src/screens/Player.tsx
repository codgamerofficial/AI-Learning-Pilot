import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ScrollView,
  Alert,
  Animated,
  Easing,
  Share,
  Modal,
  TextInput,
  Platform,
  useWindowDimensions,
} from 'react-native';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronDown,
  Heart,
  ListMusic,
  Shuffle,
  Repeat,
  Repeat1,
  UsersRound,
  Share2,
  Timer,
  Gauge,
  Music2,
  Settings,
} from 'lucide-react-native';
import { usePlayerStore } from '../store/playerStore';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from './Search';
import ProgressSlider from '../components/ProgressSlider';
import { shadow } from '../lib/shadow';
import { usePreferencesStore } from '../store/preferencesStore';
import { getThemePalette } from '../lib/themePalette';
import { useJamStore } from '../store/jamStore';
import EqualizerBars from '../components/EqualizerBars';
import SafeImage from '../components/SafeImage';
import Svg, { Circle, Line, G } from 'react-native-svg';

type PlayerScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Player'>;
};



interface LyricLine {
  time: number;
  text: string;
}

const TRACK_LYRICS: Record<string, LyricLine[]> = {
  'top-1': [
    { time: 0, text: "🎵 (Starboy - Instrumental Intro) 🎵" },
    { time: 8, text: "I'm tryna put you in the worst mood, ah" },
    { time: 12, text: "P1 cleaner than your church shoes, ah" },
    { time: 16, text: "Milli point two on the coupe, ah" },
    { time: 20, text: "House so empty, need a centerpiece" },
    { time: 24, text: "Twenty racks a table cut from ebony" },
    { time: 28, text: "Cut that ivory into skinny pieces" },
    { time: 31, text: "Then she clean it with her face" },
    { time: 33, text: "Man, I love my baby, ah" },
    { time: 36, text: "You talkin' money, need a hearing aid" },
    { time: 40, text: "You talkin' 'bout me, I don't see the shade" },
    { time: 44, text: "Switch up my cup, I kill any pain" },
    { time: 48, text: "Look what you've done" },
    { time: 51, text: "I'm a motherfuckin' starboy" },
    { time: 55, text: "Look what you've done" },
    { time: 59, text: "I'm a motherfuckin' starboy" },
  ],
  'top-2': [
    { time: 0, text: "🎵 (Blinding Lights - Synth Intro) 🎵" },
    { time: 6, text: "Yeah..." },
    { time: 9, text: "I've been tryna call" },
    { time: 15, text: "I've been on my own for long enough" },
    { time: 21, text: "Maybe you can show me how to love, maybe" },
    { time: 27, text: "I'm going through withdrawals" },
    { time: 33, text: "You don't even have to do too much" },
    { time: 39, text: "You can turn me on with just a touch, baby" },
    { time: 45, text: "I look around and Sin City's cold and empty" },
    { time: 51, text: "No one's around to judge me" },
    { time: 55, text: "I can't see clearly when you're gone" },
    { time: 59, text: "I said, ooh, I'm blinded by the lights" },
    { time: 66, text: "No, I can't sleep until I feel your touch" },
  ],
  'top-3': [
    { time: 0, text: "🎵 (Shape of You - Marimba Intro) 🎵" },
    { time: 4, text: "The club isn't the best place to find a lover" },
    { time: 7, text: "So the bar is where I go" },
    { time: 10, text: "Me and my friends at the table doing shots" },
    { time: 13, text: "Drinking fast and then we talk slow" },
    { time: 16, text: "Come over and start up a conversation with just me" },
    { time: 20, text: "And trust me I'll give it a chance" },
    { time: 22, text: "Now take my hand, stop, put Van the Man on the jukebox" },
    { time: 26, text: "And then we start to dance" },
    { time: 28, text: "And now I'm singing like" },
    { time: 30, text: "Girl, you know I want your love" },
    { time: 32, text: "Your love was handmade for somebody like me" },
    { time: 35, text: "Come on now, follow my lead" },
    { time: 38, text: "I may be crazy, don't mind me" },
    { time: 41, text: "Say, boy, let's not talk too much" },
    { time: 43, text: "Grab on my waist and put that body on me" },
    { time: 46, text: "Come on now, follow my lead" },
    { time: 49, text: "Come, come on now, follow my lead" },
    { time: 51, text: "I'm in love with the shape of you" },
    { time: 54, text: "We push and pull like a magnet do" },
    { time: 57, text: "Although my heart is falling too" },
    { time: 60, text: "I'm in love with your body" },
  ],
};

const DEFAULT_LYRICS: LyricLine[] = [
  { time: 0, text: "🎵 (Playing Instrumental Intro) 🎵" },
  { time: 10, text: "Close your eyes and feel the melody..." },
  { time: 20, text: "Let the rhythm wash over you..." },
  { time: 35, text: "Antigravity Beat Sync System is active ⚡" },
  { time: 50, text: "Experiencing premium sound waves..." },
  { time: 65, text: "Enjoy the continuous background playback!" },
];



const SLEEP_TIMER_OPTIONS = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '1 hour', minutes: 60 },
  { label: 'Off', minutes: 0 },
];

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function PlayerScreen({ navigation }: PlayerScreenProps) {
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
  const ART_SIZE = Math.min(SCREEN_W - 64, SCREEN_H * 0.35, 320);
  const themeMode = usePreferencesStore((state) => state.themeMode);
  const displayName = usePreferencesStore((state) => state.displayName);
  const palette = getThemePalette(themeMode);
  const isDark = themeMode === 'dark';

  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const nextTrack = usePlayerStore((state) => state.nextTrack);
  const prevTrack = usePlayerStore((state) => state.prevTrack);
  const queue = usePlayerStore((state) => state.queue);
  const setCurrentTrack = usePlayerStore((state) => state.setCurrentTrack);
  const shuffleEnabled = usePlayerStore((state) => state.shuffleEnabled);
  const repeatMode = usePlayerStore((state) => state.repeatMode);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const cycleRepeatMode = usePlayerStore((state) => state.cycleRepeatMode);

  const jamSessionCode = useJamStore((state) => state.sessionCode);
  const jamRole = useJamStore((state) => state.role);
  const jamConnected = useJamStore((state) => state.isConnected);
  const jamParticipantCount = useJamStore((state) => state.participantCount);
  const jamError = useJamStore((state) => state.error);
  const jamLastSyncAt = useJamStore((state) => state.lastSyncAt);
  const createSession = useJamStore((state) => state.createSession);
  const joinSession = useJamStore((state) => state.joinSession);
  const leaveSession = useJamStore((state) => state.leaveSession);
  const shareSession = useJamStore((state) => state.shareSession);
  const requestSync = useJamStore((state) => state.requestSync);

  const { user } = useAuthStore();
  const [isSaved, setIsSaved] = useState(false);

  // Check if track is saved in user's library
  useEffect(() => {
    let active = true;
    const checkSaved = async () => {
      if (!user || !currentTrack) {
        setIsSaved(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('saved_tracks')
          .select('id')
          .eq('user_id', user.id)
          .eq('track_id', currentTrack.id)
          .maybeSingle();

        if (active) {
          if (!error && data) {
            setIsSaved(true);
          } else {
            setIsSaved(false);
          }
        }
      } catch (err) {
        if (active) {
          setIsSaved(false);
        }
      }
    };
    checkSaved();
    return () => {
      active = false;
    };
  }, [currentTrack?.id, user]);

  const [jamModalVisible, setJamModalVisible] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [jamBusy, setJamBusy] = useState(false);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const controlsLocked = jamConnected && jamRole === 'guest';
  const jamIdentity = displayName !== '' ? displayName : (user?.email?.split('@')[0] ?? 'Listener');

  const currentTime = usePlayerStore((state) => state.currentTime);
  const seekTo = usePlayerStore((state) => state.seekTo);
  const crossfadeSeconds = usePlayerStore((state) => state.crossfadeSeconds);
  const setCrossfadeSeconds = usePlayerStore((state) => state.setCrossfadeSeconds);
  const gaplessEnabled = usePlayerStore((state) => state.gaplessEnabled);
  const setGaplessEnabled = usePlayerStore((state) => state.setGaplessEnabled);

  const lyricsScrollViewRef = useRef<ScrollView>(null);

  const [activeTab, setActiveTab] = useState<'upnext' | 'lyrics' | 'audio'>('upnext');
  const glowPulseAnim = useRef(new Animated.Value(1)).current;

  const aura1Anim = useRef(new Animated.Value(0)).current;
  const aura2Anim = useRef(new Animated.Value(0)).current;
  const aura3Anim = useRef(new Animated.Value(0)).current;

  // Ambient Aura Loop Animation
  useEffect(() => {
    const anim1 = Animated.loop(
      Animated.sequence([
        Animated.timing(aura1Anim, {
          toValue: 1,
          duration: 15000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(aura1Anim, {
          toValue: 0,
          duration: 15000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        })
      ])
    );

    const anim2 = Animated.loop(
      Animated.sequence([
        Animated.timing(aura2Anim, {
          toValue: 1,
          duration: 12000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(aura2Anim, {
          toValue: 0,
          duration: 12000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        })
      ])
    );

    const anim3 = Animated.loop(
      Animated.sequence([
        Animated.timing(aura3Anim, {
          toValue: 1,
          duration: 18000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(aura3Anim, {
          toValue: 0,
          duration: 18000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        })
      ])
    );

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [aura1Anim, aura2Anim, aura3Anim]);

  const aura1X = aura1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 80],
  });
  const aura1Y = aura1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-80, 120],
  });

  const aura2X = aura2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_W - 60, SCREEN_W - 260],
  });
  const aura2Y = aura2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_H * 0.35, SCREEN_H * 0.15],
  });

  const aura3X = aura3Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_W / 2 - 150, SCREEN_W / 2 + 100],
  });
  const aura3Y = aura3Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_H * 0.25, SCREEN_H * 0.45],
  });

  // Sleep timer effect
  useEffect(() => {
    if (sleepTimerMinutes <= 0) return;
    const timer = setTimeout(() => {
      usePlayerStore.getState().pause();
      setSleepTimerMinutes(0);
      Alert.alert('Sleep Timer', 'Playback paused by sleep timer.');
    }, sleepTimerMinutes * 60 * 1000);
    return () => clearTimeout(timer);
  }, [sleepTimerMinutes]);

  useEffect(() => {
    let pulse: Animated.CompositeAnimation | null = null;
    if (isPlaying) {
      pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(glowPulseAnim, {
            toValue: 1.10,
            duration: 2500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowPulseAnim, {
            toValue: 0.95,
            duration: 2500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
    } else {
      Animated.timing(glowPulseAnim, {
        toValue: 1.0,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
    return () => {
      pulse?.stop();
    };
  }, [isPlaying, glowPulseAnim]);

  if (!currentTrack) {
    navigation.goBack();
    return null;
  }

  // Up next tracks
  const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
  const upNextTracks = currentIndex >= 0 ? queue.slice(currentIndex + 1, currentIndex + 3) : [];

  // Synced Lyrics Calculation
  const lyrics = TRACK_LYRICS[currentTrack.id] || DEFAULT_LYRICS;
  const activeIndex = lyrics.findIndex((line, i) => {
    const nextLine = lyrics[i + 1];
    return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
  });

  // Auto-scroll when active lyric line changes
  useEffect(() => {
    if (activeIndex >= 0) {
      lyricsScrollViewRef.current?.scrollTo({
        y: Math.max(0, activeIndex * 44 - 88),
        animated: true,
      });
    }
  }, [activeIndex]);

  const lockMessage = () => {
    Alert.alert('Jam Guest Mode', 'Only the host can control playback and queue changes in this Jam.');
  };

  const handleSaveTrack = async () => {
    if (!user) return Alert.alert('Error', 'You must be logged in to save tracks');
    if (isSaved) {
      setIsSaved(false);
      const { error } = await supabase
        .from('saved_tracks')
        .delete()
        .eq('user_id', user.id)
        .eq('track_id', currentTrack.id);
      if (error) {
        setIsSaved(true);
        Alert.alert('Error removing track', error.message);
      }
    } else {
      setIsSaved(true);
      const { error } = await supabase.from('saved_tracks').insert([
        {
          user_id: user.id,
          track_id: currentTrack.id,
          title: currentTrack.title,
          artist: currentTrack.artist,
          artwork: currentTrack.artwork,
          color: currentTrack.color,
        },
      ]);
      if (error) {
        setIsSaved(false);
        Alert.alert('Error saving track', error.message);
      }
    }
  };

  const handleShareTrack = async () => {
    try {
      await Share.share({
        message: `Listening to ${currentTrack.title} by ${currentTrack.artist} on NeoTunes`,
      });
    } catch {
      Alert.alert('Share Failed', 'Could not open share options right now.');
    }
  };

  const handleCreateJamSession = async () => {
    setJamBusy(true);
    const connected = await createSession(jamIdentity);
    setJamBusy(false);
    if (!connected) {
      Alert.alert('Jam Error', 'Could not create a Jam right now. Please try again.');
    }
  };

  const handleJoinJamSession = async () => {
    const normalizedCode = joinCodeInput.replace(/\s+/g, '').toUpperCase();
    if (normalizedCode.length !== 6) {
      Alert.alert('Invalid Code', 'Enter a 6-character room code.');
      return;
    }

    setJamBusy(true);
    const joined = await joinSession(normalizedCode, jamIdentity);
    setJamBusy(false);
    if (!joined) {
      Alert.alert('Jam Error', 'Could not join that room. Please check the code and try again.');
    }
  };

  const handleLeaveJamSession = async () => {
    setJamBusy(true);
    await leaveSession();
    setJamBusy(false);
    setJoinCodeInput('');
  };

  const handleStartJam = async () => {
    setJamModalVisible(true);
    if (!jamConnected) {
      await handleCreateJamSession();
    }
  };

  const handleTogglePlay = () => {
    if (controlsLocked) { lockMessage(); return; }
    togglePlay();
  };

  const handleNextTrack = () => {
    if (controlsLocked) { lockMessage(); return; }
    nextTrack();
  };

  const handlePrevTrack = () => {
    if (controlsLocked) { lockMessage(); return; }
    prevTrack();
  };

  const handleShuffleToggle = () => {
    if (controlsLocked) { lockMessage(); return; }
    toggleShuffle();
  };

  const handleRepeatCycle = () => {
    if (controlsLocked) { lockMessage(); return; }
    cycleRepeatMode();
  };

  const jamSyncLabel = jamLastSyncAt
    ? new Date(jamLastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'not synced yet';

  const accentColor = palette.accent;

  // Glass card helper
  const GlassPanel = ({ children, style }: { children: React.ReactNode; style?: any }) => (
    <View style={[{
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
      backgroundColor: isDark ? 'rgba(28,28,30,0.5)' : 'rgba(255,255,255,0.6)',
      padding: 14,
      // @ts-ignore
      backdropFilter: 'blur(20px)',
    }, style]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      {/* Dynamic Animated Ambient Aura Glow */}
      <Animated.View style={{
        position: 'absolute',
        top: aura1Y,
        left: aura1X,
        width: 340,
        height: 340,
        borderRadius: 170,
        backgroundColor: currentTrack.color || palette.accent,
        opacity: isDark ? 0.16 : 0.08,
        // @ts-ignore
        ...Platform.select({
          web: { filter: 'blur(90px)' },
          default: {}
        }),
        pointerEvents: 'none',
      }} />
      <Animated.View style={{
        position: 'absolute',
        top: aura2Y,
        left: aura2X,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: palette.accent,
        opacity: isDark ? 0.12 : 0.06,
        // @ts-ignore
        ...Platform.select({
          web: { filter: 'blur(80px)' },
          default: {}
        }),
        pointerEvents: 'none',
      }} />
      <Animated.View style={{
        position: 'absolute',
        top: aura3Y,
        left: aura3X,
        width: 320,
        height: 320,
        borderRadius: 160,
        backgroundColor: palette.accentStrong,
        opacity: isDark ? 0.08 : 0.04,
        // @ts-ignore
        ...Platform.select({
          web: { filter: 'blur(100px)' },
          default: {}
        }),
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 8,
      }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ChevronDown stroke={palette.text} size={22} />
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <Text style={{
            color: palette.textSubtle,
            fontWeight: '600',
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: 3,
            opacity: 0.7,
          }}>
            Now Playing
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleSaveTrack}
          style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: isSaved ? '#FF6B6B' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
            borderWidth: 1,
            borderColor: isSaved ? '#FF6B6B' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Heart stroke="#FFF" fill={isSaved ? '#FFF' : 'transparent'} size={18} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Cover Art Deck */}
        <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 28 }}>
          <View style={{ width: ART_SIZE, height: ART_SIZE, justifyContent: 'center', alignItems: 'center' }}>
            {/* Ambient Pulsing Glow Halo */}
            <Animated.View style={{
              position: 'absolute',
              width: ART_SIZE - 20,
              height: ART_SIZE - 20,
              borderRadius: 24,
              backgroundColor: currentTrack.color || accentColor,
              transform: [{ scale: glowPulseAnim }],
              opacity: isDark ? 0.45 : 0.25,
              // @ts-ignore
              ...Platform.select({
                web: { filter: 'blur(40px)' },
                default: {}
              }),
              pointerEvents: 'none',
            }} />

            {/* Artwork Card */}
            <Animated.View
              style={[
                {
                  width: ART_SIZE,
                  height: ART_SIZE,
                  borderRadius: 24,
                  overflow: 'hidden',
                  borderWidth: 2,
                  borderColor: 'rgba(255,255,255,0.08)',
                  backgroundColor: palette.surface,
                },
                shadow(`0 12px 36px ${(currentTrack.color || accentColor)}45`, {
                  shadowColor: currentTrack.color || accentColor,
                  shadowOffset: { width: 0, height: 12 },
                  shadowOpacity: 0.4,
                  shadowRadius: 24,
                  elevation: 12,
                }),
              ]}
            >
              <SafeImage uri={currentTrack.artwork} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </Animated.View>
          </View>
        </View>

        {/* Track Info */}
        <View style={{ marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <View style={{ width: 32, height: 3, backgroundColor: currentTrack.color, borderRadius: 2, marginBottom: 10 }} />
            <Text
              style={{ color: palette.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.3, lineHeight: 28 }}
              numberOfLines={2}
            >
              {currentTrack.title}
            </Text>
            <Text
              style={{ color: palette.textSubtle, fontSize: 13, fontWeight: '600', letterSpacing: 0.5, marginTop: 6, opacity: 0.8 }}
              numberOfLines={1}
            >
              {currentTrack.artist}
            </Text>
          </View>
          <View style={{ minHeight: 48, justifyContent: 'center' }}>
            <EqualizerBars color={currentTrack.color} barCount={7} height={36} active={isPlaying} />
          </View>
        </View>

        {/* Progress Slider */}
        <View style={{ marginBottom: 28 }}>
          <ProgressSlider accentColor={currentTrack.color} />
        </View>

        {/* Main Controls */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <TouchableOpacity
            onPress={handlePrevTrack}
            style={{
              width: 52, height: 52, borderRadius: 26,
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              borderWidth: 1.5,
              borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              alignItems: 'center', justifyContent: 'center',
              opacity: controlsLocked ? 0.55 : 1,
            }}
          >
            <SkipBack stroke={palette.text} fill={palette.text} size={18} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleTogglePlay}
            style={[
              {
                width: 76, height: 76, borderRadius: 38,
                backgroundColor: currentTrack.color,
                alignItems: 'center', justifyContent: 'center',
                opacity: controlsLocked ? 0.55 : 1,
              },
              shadow(`0 8px 24px ${currentTrack.color}50`, {
                shadowColor: currentTrack.color,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.5,
                shadowRadius: 16,
                elevation: 12,
              }),
            ]}
          >
            {isPlaying ? <Pause stroke="#FFF" fill="#FFF" size={28} /> : <Play stroke="#FFF" fill="#FFF" size={28} />}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNextTrack}
            style={{
              width: 52, height: 52, borderRadius: 26,
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              borderWidth: 1.5,
              borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              alignItems: 'center', justifyContent: 'center',
              opacity: controlsLocked ? 0.55 : 1,
            }}
          >
            <SkipForward stroke={palette.text} fill={palette.text} size={18} />
          </TouchableOpacity>
        </View>

        {/* Shuffle & Repeat */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 20 }}>
          <TouchableOpacity
            onPress={handleShuffleToggle}
            style={{
              flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: 14, paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: shuffleEnabled ? `${accentColor}20` : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
              borderWidth: 1, borderColor: shuffleEnabled ? `${accentColor}40` : 'transparent',
              opacity: controlsLocked ? 0.55 : 1,
            }}
          >
            <Shuffle stroke={shuffleEnabled ? accentColor : palette.textSubtle} size={16} />
            <Text style={{ color: shuffleEnabled ? accentColor : palette.textSubtle, fontWeight: '700', fontSize: 10, marginLeft: 6 }}>
              SHUFFLE
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRepeatCycle}
            style={{
              flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: 14, paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: repeatMode !== 'off' ? 'rgba(255,215,0,0.15)' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
              borderWidth: 1, borderColor: repeatMode !== 'off' ? 'rgba(255,215,0,0.3)' : 'transparent',
              opacity: controlsLocked ? 0.55 : 1,
            }}
          >
            {repeatMode === 'one'
              ? <Repeat1 stroke="#FFD700" size={16} />
              : <Repeat stroke={repeatMode === 'all' ? '#FFD700' : palette.textSubtle} size={16} />}
            <Text style={{ color: repeatMode !== 'off' ? '#FFD700' : palette.textSubtle, fontWeight: '700', fontSize: 10, marginLeft: 6 }}>
              {repeatMode === 'off' ? 'REPEAT' : repeatMode === 'all' ? 'REPEAT ALL' : 'REPEAT 1'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Utility Row: Jam, Share */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 18 }}>
          <TouchableOpacity
            onPress={handleStartJam}
            style={[styles.utilBtn, { borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', flex: 1, justifyContent: 'center' }]}
          >
            <UsersRound stroke={accentColor} size={16} />
            <Text style={[styles.utilBtnText, { color: accentColor }]}>{jamConnected ? 'JAM LIVE' : 'START JAM'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShareTrack}
            style={[styles.utilBtn, { borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', flex: 1, justifyContent: 'center' }]}
          >
            <Share2 stroke={palette.textSubtle} size={16} />
            <Text style={[styles.utilBtnText, { color: palette.textSubtle }]}>SHARE TRACK</Text>
          </TouchableOpacity>
        </View>

        {/* Jam Status */}
        {jamConnected && (
          <GlassPanel style={{ marginTop: 14 }}>
            <Text style={{
              color: accentColor,
              fontWeight: '700', fontSize: 11, letterSpacing: 0.5,
            }}>
              Jam Live: {jamSessionCode}
            </Text>
            <Text style={{ color: palette.textMuted, fontWeight: '600', fontSize: 10, marginTop: 4 }}>
              {jamRole?.toUpperCase()} • {jamParticipantCount} participant{jamParticipantCount === 1 ? '' : 's'} • Last sync {jamSyncLabel}
            </Text>
          </GlassPanel>
        )}

        {/* Segmented Bottom Tab Controller */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
          borderRadius: 16,
          padding: 4,
          marginTop: 22,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        }}>
          {['UP NEXT', 'LYRICS', 'AUDIO PREFS'].map((label, index) => {
            const tabKeys = ['upnext', 'lyrics', 'audio'] as const;
            const tabKey = tabKeys[index];
            const isActive = activeTab === tabKey;
            return (
              <TouchableOpacity
                key={tabKey}
                onPress={() => setActiveTab(tabKey)}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isActive ? (currentTrack.color || accentColor) : 'transparent',
                }}
              >
                <Text style={{
                  color: isActive ? '#FFF' : palette.textSubtle,
                  fontWeight: '800',
                  fontSize: 11.5,
                  letterSpacing: 0.8,
                }}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab Panels */}
        {activeTab === 'upnext' && (
          <View style={{ marginTop: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: palette.textSubtle, fontWeight: '800', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                Queue List ({queue.length} Tracks)
              </Text>
              {jamConnected && (
                <Text style={{ color: accentColor, fontWeight: '700', fontSize: 10 }}>
                  JAM ACTIVE ⚡
                </Text>
              )}
            </View>
            {queue.length === 0 ? (
              <Text style={{ color: palette.textMuted, fontWeight: '600', fontSize: 12 }}>No tracks queued.</Text>
            ) : (
              queue.map((track, index) => {
                const isCurrent = track.id === currentTrack.id;
                return (
                  <TouchableOpacity
                    key={track.id + '-' + index}
                    onPress={() => {
                      if (controlsLocked) { lockMessage(); return; }
                      if (!isCurrent) { void setCurrentTrack(track); }
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderRadius: 14,
                      backgroundColor: isCurrent 
                        ? `${(currentTrack.color || accentColor)}15` 
                        : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                      borderWidth: 1,
                      borderColor: isCurrent 
                        ? `${(currentTrack.color || accentColor)}35` 
                        : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                      padding: 10,
                      marginBottom: 8,
                      opacity: controlsLocked ? 0.65 : 1,
                    }}
                  >
                    <SafeImage uri={track.artwork} style={{ width: 42, height: 42, borderRadius: 8 }} resizeMode="cover" />
                    <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
                      <Text numberOfLines={1} style={{ color: isCurrent ? (currentTrack.color || accentColor) : palette.text, fontWeight: '800', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                        {track.title}
                      </Text>
                      <Text numberOfLines={1} style={{ color: palette.textMuted, fontWeight: '600', fontSize: 10.5, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {track.artist}
                      </Text>
                    </View>
                    <View>
                      {isCurrent && isPlaying ? (
                        <View style={{ height: 18, justifyContent: 'center' }}>
                          <EqualizerBars color={currentTrack.color || accentColor} barCount={4} height={14} active={isPlaying} />
                        </View>
                      ) : (
                        <Text style={{ color: isCurrent ? (currentTrack.color || accentColor) : palette.textSubtle, fontWeight: '800', fontSize: 10 }}>
                          {isCurrent ? 'NOW' : `#${index + 1}`}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {activeTab === 'lyrics' && (
          <View style={{ marginTop: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Music2 stroke={currentTrack.color || accentColor} size={16} />
                <Text style={{ color: palette.textSubtle, fontWeight: '800', fontSize: 11, letterSpacing: 1.2, marginLeft: 8, textTransform: 'uppercase' }}>
                  Synced Lyrics
                </Text>
              </View>
              <View style={{
                backgroundColor: `${(currentTrack.color || accentColor)}20`,
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderWidth: 1,
                borderColor: `${(currentTrack.color || accentColor)}40`,
              }}>
                <Text style={{ color: currentTrack.color || accentColor, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 }}>BEAT-SYNC ⚡</Text>
              </View>
            </View>

            <View style={{ height: 260 }}>
              <ScrollView
                ref={lyricsScrollViewRef}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 10 }}
              >
                {lyrics.map((line, i) => {
                  const isActive = i === activeIndex;
                  return (
                    <TouchableOpacity
                      key={line.time + '-' + i}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (controlsLocked) {
                          lockMessage();
                        } else {
                          seekTo(line.time);
                        }
                      }}
                      style={{
                        height: 46,
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: '100%',
                      }}
                    >
                      <Text
                        style={{
                          color: isActive ? (currentTrack.color || accentColor) : palette.text,
                          fontWeight: isActive ? '900' : '600',
                          fontSize: isActive ? 16.5 : 13.5,
                          textAlign: 'center',
                          opacity: isActive ? 1 : 0.35,
                          textTransform: 'uppercase',
                          letterSpacing: isActive ? 0.3 : 0,
                          ...(isActive ? {
                            textShadowColor: `${(currentTrack.color || accentColor)}60`,
                            textShadowOffset: { width: 0, height: 0 },
                            textShadowRadius: 10,
                          } : {})
                        }}
                      >
                        {line.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        )}

        {activeTab === 'audio' && (
          <View style={{ marginTop: 4 }}>
            <Text style={{ color: palette.textSubtle, fontWeight: '800', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14 }}>
              Audio Settings
            </Text>

            {/* Crossfade Card */}
            <View style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
              borderRadius: 16,
              borderWidth: 1.2,
              borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              padding: 14,
              marginBottom: 14,
            }}>
              <Text style={{ color: palette.textSubtle, fontWeight: '700', fontSize: 11, letterSpacing: 0.5, marginBottom: 10 }}>
                CROSSFADE DURATION
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
                {[0, 3, 6, 9, 12].map((seconds) => (
                  <TouchableOpacity
                    key={seconds}
                    onPress={() => setCrossfadeSeconds(seconds)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 10,
                      alignItems: 'center',
                      backgroundColor: crossfadeSeconds === seconds
                        ? (currentTrack.color || accentColor)
                        : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                      borderWidth: 1,
                      borderColor: crossfadeSeconds === seconds ? (currentTrack.color || accentColor) : 'transparent',
                    }}
                  >
                    <Text style={{
                      color: crossfadeSeconds === seconds ? '#FFF' : palette.textSubtle,
                      fontWeight: '800',
                      fontSize: 11,
                    }}>
                      {seconds === 0 ? 'Off' : `${seconds}s`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Gapless Playback Toggle */}
            <View style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
              borderRadius: 16,
              borderWidth: 1.2,
              borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              padding: 14,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
            }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ color: palette.textSubtle, fontWeight: '700', fontSize: 11, letterSpacing: 0.5 }}>
                  GAPLESS PLAYBACK
                </Text>
                <Text style={{ color: palette.textMuted, fontSize: 9.5, fontWeight: '500', marginTop: 4 }}>
                  Prefetches next tracks to eliminate silence gaps.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setGaplessEnabled(!gaplessEnabled)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: gaplessEnabled ? `${(currentTrack.color || accentColor)}20` : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                  borderWidth: 1,
                  borderColor: gaplessEnabled ? (currentTrack.color || accentColor) : 'transparent',
                }}
              >
                <Text style={{
                  color: gaplessEnabled ? (currentTrack.color || accentColor) : palette.textSubtle,
                  fontWeight: '800',
                  fontSize: 10.5,
                }}>
                  {gaplessEnabled ? 'ACTIVE' : 'DISABLED'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sleep Timer & Playback Speed Row */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {/* Sleep Timer */}
              <TouchableOpacity
                onPress={() => {
                  const nextIdx = SLEEP_TIMER_OPTIONS.findIndex((o) => o.minutes === sleepTimerMinutes);
                  const next = SLEEP_TIMER_OPTIONS[(nextIdx + 1) % SLEEP_TIMER_OPTIONS.length];
                  setSleepTimerMinutes(next.minutes);
                  if (next.minutes > 0) {
                    Alert.alert('Sleep Timer', `Playback will pause in ${next.label}.`);
                  }
                }}
                style={{
                  flex: 1,
                  backgroundColor: sleepTimerMinutes > 0 ? 'rgba(255,215,0,0.1)' : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'),
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: sleepTimerMinutes > 0 ? 'rgba(255,215,0,0.3)' : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                  padding: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Timer stroke={sleepTimerMinutes > 0 ? '#FFD700' : palette.textSubtle} size={18} />
                <Text style={{ color: sleepTimerMinutes > 0 ? '#FFD700' : palette.textSubtle, fontWeight: '800', fontSize: 10, marginTop: 6 }}>
                  SLEEP: {sleepTimerMinutes > 0 ? `${sleepTimerMinutes}m` : 'OFF'}
                </Text>
              </TouchableOpacity>

              {/* Speed Control */}
              <TouchableOpacity
                onPress={() => {
                  const currentIdx = SPEED_OPTIONS.indexOf(playbackSpeed);
                  const nextSpeed = SPEED_OPTIONS[(currentIdx + 1) % SPEED_OPTIONS.length];
                  setPlaybackSpeed(nextSpeed);
                }}
                style={{
                  flex: 1,
                  backgroundColor: playbackSpeed !== 1 ? 'rgba(0,212,255,0.1)' : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'),
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: playbackSpeed !== 1 ? 'rgba(0,212,255,0.3)' : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                  padding: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Gauge stroke={playbackSpeed !== 1 ? '#00D4FF' : palette.textSubtle} size={18} />
                <Text style={{ color: playbackSpeed !== 1 ? '#00D4FF' : palette.textSubtle, fontWeight: '800', fontSize: 10, marginTop: 6 }}>
                  SPEED: {playbackSpeed}x
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Jam Modal */}
      <Modal visible={jamModalVisible} animationType="fade" transparent onRequestClose={() => setJamModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 20 }}>
          <View style={{
            backgroundColor: isDark ? 'rgba(28,28,30,0.95)' : 'rgba(255,255,255,0.95)',
            borderRadius: 20, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', padding: 20,
            // @ts-ignore
            backdropFilter: 'blur(30px)',
          }}>
            <Text style={{ color: palette.text, fontWeight: '800', fontSize: 18 }}>Jam Session</Text>

            {jamError && (
              <Text style={{ color: '#FF6B6B', fontWeight: '700', fontSize: 11, marginTop: 8 }}>
                {jamError}
              </Text>
            )}

            {jamConnected ? (
              <View style={{ marginTop: 14 }}>
                <Text style={{ color: palette.text, fontWeight: '800', fontSize: 14 }}>
                  Room Code: {jamSessionCode}
                </Text>
                <Text style={{ color: palette.textMuted, fontWeight: '600', fontSize: 11, marginTop: 6 }}>
                  {jamRole?.toUpperCase()} • {jamParticipantCount} participant{jamParticipantCount === 1 ? '' : 's'}
                </Text>

                <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
                  <TouchableOpacity
                    disabled={jamBusy}
                    onPress={() => void shareSession()}
                    style={[styles.modalBtn, { backgroundColor: accentColor, borderColor: accentColor }]}
                  >
                    <Text style={[styles.modalBtnText, { color: isDark ? '#0A0A0A' : '#FFF' }]}>Share Code</Text>
                  </TouchableOpacity>

                  {jamRole === 'guest' && (
                    <TouchableOpacity
                      disabled={jamBusy}
                      onPress={() => void requestSync()}
                      style={[styles.modalBtn, { backgroundColor: '#FFD700', borderColor: '#FFD700' }]}
                    >
                      <Text style={[styles.modalBtnText, { color: '#0A0A0A' }]}>Sync Now</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  disabled={jamBusy}
                  onPress={handleLeaveJamSession}
                  style={[styles.modalBtn, { marginTop: 8, backgroundColor: 'rgba(255,107,107,0.15)', borderColor: 'rgba(255,107,107,0.3)' }]}
                >
                  <Text style={[styles.modalBtnText, { color: '#FF6B6B' }]}>{jamBusy ? 'Working...' : 'Leave Session'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ marginTop: 14 }}>
                <TouchableOpacity
                  disabled={jamBusy}
                  onPress={handleCreateJamSession}
                  style={[styles.modalBtn, { backgroundColor: accentColor, borderColor: accentColor }]}
                >
                  <Text style={[styles.modalBtnText, { color: isDark ? '#0A0A0A' : '#FFF' }]}>{jamBusy ? 'Creating...' : 'Create New Jam'}</Text>
                </TouchableOpacity>

                <TextInput
                  value={joinCodeInput}
                  onChangeText={setJoinCodeInput}
                  autoCapitalize="characters"
                  maxLength={6}
                  placeholder="ENTER ROOM CODE"
                  placeholderTextColor={palette.textMuted}
                  style={{
                    marginTop: 10,
                    borderWidth: 1.5,
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    borderRadius: 14,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    color: palette.text,
                    fontWeight: '700',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}
                />

                <TouchableOpacity
                  disabled={jamBusy}
                  onPress={handleJoinJamSession}
                  style={[styles.modalBtn, { marginTop: 8, backgroundColor: accentColor, borderColor: accentColor }]}
                >
                  <Text style={[styles.modalBtnText, { color: isDark ? '#0A0A0A' : '#FFF' }]}>{jamBusy ? 'Joining...' : 'Join With Code'}</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              onPress={() => setJamModalVisible(false)}
              style={[styles.modalBtn, { marginTop: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
            >
              <Text style={[styles.modalBtnText, { color: palette.text }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles: Record<string, any> = {
  utilBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  utilBtnText: {
    fontWeight: '800',
    fontSize: 10,
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  modalBtn: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  modalBtnText: {
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
};
