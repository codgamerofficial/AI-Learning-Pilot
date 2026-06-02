import React, { useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Alert,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withRepeat, withSequence, Easing, interpolateColor
} from 'react-native-reanimated';
import { Play, Pause, ChevronUp, SkipForward } from 'lucide-react-native';
import { usePlayerStore } from '../store/playerStore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../screens/Search';
import { shadow } from '../lib/shadow';
import EqualizerBars from './EqualizerBars';
import { usePreferencesStore } from '../store/preferencesStore';
import { getThemePalette } from '../lib/themePalette';
import { useJamStore } from '../store/jamStore';
import SafeImage from './SafeImage';

export default function MiniPlayer() {
  const themeMode = usePreferencesStore((state) => state.themeMode);
  const palette = getThemePalette(themeMode);
  const jamConnected = useJamStore((state) => state.isConnected);
  const jamRole = useJamStore((state) => state.role);

  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const nextTrack = usePlayerStore((state) => state.nextTrack);
  const queue = usePlayerStore((state) => state.queue);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const duration = usePlayerStore((state) => state.duration);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const controlsLocked = jamConnected && jamRole === 'guest';
  const isDark = themeMode === 'dark';

  // Compute up-next track
  const upNextTrack = (() => {
    if (!currentTrack || queue.length === 0) return null;
    const index = queue.findIndex((t) => t.id === currentTrack.id);
    if (index < 0 || index >= queue.length - 1) return null;
    return queue[index + 1];
  })();

  // Progress fraction
  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;

  // Slide-in animation
  const slideAnim = useSharedValue(100); 
  const glowAnim = useSharedValue(0);

  useEffect(() => {
    if (currentTrack) {
      slideAnim.value = withSpring(0, {
        mass: 1, damping: 15, stiffness: 120,
      });
    } else {
      slideAnim.value = withTiming(100, { duration: 200 });
    }
  }, [currentTrack]);

  // Pulsing glow when playing
  useEffect(() => {
    if (isPlaying) {
      glowAnim.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      glowAnim.value = withTiming(0, { duration: 300 });
    }
  }, [isPlaying]);

  const animatedWrapperStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideAnim.value }],
  }));

  const animatedInnerStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      glowAnim.value,
      [0, 1],
      [isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(10, 10, 10, 0.08)', currentTrack?.color ?? '#00FF85']
    );
    return { borderColor };
  });

  if (!currentTrack) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        {
          position: 'absolute',
          bottom: 92, // sits above the new floating tab bar (72 + 12 bottom + 8 gap)
          left: 12,
          right: 12,
          zIndex: 999,
        },
        animatedWrapperStyle,
      ]}
    >
      <Animated.View
        pointerEvents="auto"
        style={[
          {
            backgroundColor: isDark ? 'rgba(18, 18, 20, 0.82)' : 'rgba(255, 255, 255, 0.85)',
            borderWidth: 1.5,
            borderRadius: 20,
            overflow: 'hidden',
            // @ts-ignore - Web-only glassmorphism blur
            backdropFilter: 'blur(32px) saturate(180%)',
          },
          shadow(
            isPlaying
              ? `0px 6px 24px ${currentTrack.color}40`
              : '0px 4px 16px rgba(0,0,0,0.12)',
            {
              shadowColor: isPlaying ? currentTrack.color : '#000000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: isPlaying ? 0.3 : 0.12,
              shadowRadius: 16,
              elevation: 12,
            }
          ),
          animatedInnerStyle,
        ]}>

        {/* Main content row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10, paddingBottom: upNextTrack ? 4 : 10 }}>
          {/* Artwork */}
          <TouchableOpacity onPress={() => navigation.navigate('Player')} activeOpacity={0.9}>
            <View style={[
              {
                borderRadius: 12,
                overflow: 'hidden',
                borderWidth: 1.5,
                borderColor: `${currentTrack.color}60`,
              },
              shadow(`0 2px 8px ${currentTrack.color}30`, {
                shadowColor: currentTrack.color,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 6,
                elevation: 4,
              }),
            ]}>
              <SafeImage
                uri={currentTrack.artwork}
                style={{ width: 48, height: 48 }}
                resizeMode="cover"
              />
            </View>
          </TouchableOpacity>

          {/* Track info */}
          <TouchableOpacity
            style={{ flex: 1, marginLeft: 12 }}
            onPress={() => navigation.navigate('Player')}
            activeOpacity={0.9}
          >
            <Text
              style={{ color: palette.text, fontWeight: '800', fontSize: 13, letterSpacing: 0.3 }}
              numberOfLines={1}
            >
              {currentTrack.title}
            </Text>
            <Text
              style={{ color: palette.textSubtle, fontWeight: '600', fontSize: 10, letterSpacing: 0.5, marginTop: 2, opacity: 0.8 }}
              numberOfLines={1}
            >
              {currentTrack.artist}
            </Text>
          </TouchableOpacity>

          {/* Equalizer bars (animated when playing) */}
          <View style={{ marginRight: 8 }}>
            <EqualizerBars color={currentTrack.color} barCount={4} height={18} active={isPlaying} />
          </View>

          {/* Play / Pause */}
          <TouchableOpacity
            onPress={() => {
              if (controlsLocked) {
                Alert.alert('Jam Guest Mode', 'Only the host can control playback in this Jam.');
                return;
              }
              togglePlay();
            }}
            disabled={controlsLocked}
            style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: currentTrack.color,
              alignItems: 'center', justifyContent: 'center',
              opacity: controlsLocked ? 0.55 : 1,
            }}
          >
            {isPlaying
              ? <Pause stroke="#FFF" fill="#FFF" size={16} />
              : <Play stroke="#FFF" fill="#FFF" size={16} />
            }
          </TouchableOpacity>

          {/* Skip Forward */}
          <TouchableOpacity
            onPress={() => {
              if (controlsLocked) {
                Alert.alert('Jam Guest Mode', 'Only the host can control playback in this Jam.');
                return;
              }
              nextTrack();
            }}
            disabled={controlsLocked}
            style={{ marginLeft: 6, opacity: controlsLocked ? 0.55 : 1 }}
          >
            <SkipForward stroke={palette.textSubtle} size={18} strokeWidth={2} />
          </TouchableOpacity>

          {/* Expand arrow */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Player')}
            style={{ marginLeft: 6 }}
          >
            <ChevronUp stroke={palette.textSubtle} size={18} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Up Next peek */}
        {upNextTrack && (
          <View style={{ paddingHorizontal: 12, paddingBottom: 6 }}>
            <Text
              style={{
                color: palette.textMuted,
                fontSize: 9,
                fontWeight: '600',
                letterSpacing: 0.8,
                opacity: 0.7,
              }}
              numberOfLines={1}
            >
              UP NEXT: {upNextTrack.title} — {upNextTrack.artist}
            </Text>
          </View>
        )}

        {/* Progress bar */}
        <View style={{
          height: 3,
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
          overflow: 'hidden',
        }}>
          <View style={{
            height: '100%',
            width: `${progress * 100}%`,
            backgroundColor: currentTrack.color,
            borderBottomLeftRadius: 20,
            borderBottomRightRadius: progress >= 0.99 ? 20 : 0,
          }} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}
