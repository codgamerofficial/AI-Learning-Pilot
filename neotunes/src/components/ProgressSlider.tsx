/**
 * ProgressSlider.tsx
 * Premium playback progress bar with:
 *  - Interactive Gesture-based Waveform Scrubber (PanResponder)
 *  - Apple Music & Spotify clean floating time labels
 *  - Glowing active bars with CSS and Native shadows
 *  - Floating scanner pointer line indicating playhead
 */
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Platform, Animated, PanResponder, Dimensions } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import { usePreferencesStore } from '../store/preferencesStore';

function formatTime(seconds: number, forceHours: boolean = false): string {
  if (!seconds || isNaN(seconds)) return forceHours ? '0:00:00' : '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0 || forceHours) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const WAVE_HEIGHTS = [
  12, 16, 14, 18, 24, 32, 40, 46, 42, 34, 26, 20, 22, 28, 36, 44,
  48, 52, 46, 38, 28, 22, 26, 32, 40, 46, 50, 44, 36, 28, 22, 18,
  24, 30, 38, 44, 40, 32, 24, 18, 14, 18, 24, 30, 26, 20, 14, 10
];

interface Props {
  accentColor?: string;
}

const { width: SCREEN_W } = Dimensions.get('window');

export default function ProgressSlider({ accentColor = '#00FF85' }: Props) {
  const themeMode = usePreferencesStore((state) => state.themeMode);
  const isDark = themeMode === 'dark';

  const { currentTime, duration, seekTo } = usePlayerStore();
  const { isPlaying } = usePlayerStore();
  const [sliding, setSliding] = useState(false);
  const [slideValue, setSlideValue] = useState(0);

  const [containerWidth, setContainerWidth] = useState(SCREEN_W - 48); // default fallback
  const startXRef = useRef(0);
  const containerRef = useRef<View>(null);

  // While sliding, show the slide value; otherwise show store currentTime
  const displayTime = sliding ? slideValue : currentTime;
  const progress = duration > 0 ? displayTime / duration : 0;

  // Animate waveform bars slightly when playing
  const waveAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, { toValue: 1, duration: 1000, useNativeDriver: false }),
          Animated.timing(waveAnim, { toValue: 0, duration: 1000, useNativeDriver: false }),
        ])
      ).start();
    } else {
      waveAnim.setValue(0);
    }
  }, [isPlaying]);

  // Set up PanResponder for interactive dragging
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        setSliding(true);
        const startX = evt.nativeEvent.locationX;
        startXRef.current = startX;
        const p = Math.max(0, Math.min(1, startX / containerWidth));
        setSlideValue(p * duration);
      },
      onPanResponderMove: (evt, gestureState) => {
        const currentX = startXRef.current + gestureState.dx;
        const p = Math.max(0, Math.min(1, currentX / containerWidth));
        setSlideValue(p * duration);
      },
      onPanResponderRelease: (evt, gestureState) => {
        setSliding(false);
        const currentX = startXRef.current + gestureState.dx;
        const p = Math.max(0, Math.min(1, currentX / containerWidth));
        seekTo(p * duration);
      },
    })
  ).current;

  return (
    <View style={{ width: '100%' }}>
      {/* ── Interactive Waveform Container ── */}
      <View
        ref={containerRef}
        {...panResponder.panHandlers}
        onLayout={(e) => {
          const { width } = e.nativeEvent.layout;
          if (width > 0) setContainerWidth(width);
        }}
        style={[{
          flexDirection: 'row',
          alignItems: 'center',
          height: 60,
          marginBottom: 4,
          overflow: 'visible',
          paddingHorizontal: 0,
          position: 'relative',
        }, Platform.select({
          web: { cursor: 'ew-resize' } as any,
          default: {}
        })]}
      >
        {/* Waveform Bars */}
        {WAVE_HEIGHTS.map((baseH, i) => {
          const barProgress = i / WAVE_HEIGHTS.length;
          const isFilled = barProgress < progress;
          return (
            <Animated.View
              key={i}
              pointerEvents="none"
              style={{
                flex: 1,
                marginHorizontal: 1,
                borderRadius: 3,
                backgroundColor: isFilled ? accentColor : (isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)'),
                height: waveAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [
                    baseH,
                    isFilled ? baseH * 1.15 : baseH * 0.9,
                  ],
                }),
                opacity: isFilled ? 1 : 0.6,
                ...(isFilled ? {
                  shadowColor: accentColor,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 4,
                  // @ts-ignore
                  boxShadow: `0 0 6px ${accentColor}`,
                } : {}),
              }}
            />
          );
        })}

        {/* ── Glowing Scrubber Line ── */}
        {progress > 0 && progress <= 1 && (
          <View style={{
            position: 'absolute',
            left: `${progress * 100}%`,
            top: 2,
            bottom: 2,
            width: 3,
            backgroundColor: '#FFF',
            borderRadius: 1.5,
            shadowColor: accentColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 6,
            // @ts-ignore
            boxShadow: `0 0 8px ${accentColor}, 0 0 3px #FFF`,
            zIndex: 10,
            pointerEvents: 'none',
          }} />
        )}
      </View>

      {/* ── Elegant Time Labels ── */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 0 }}>
        <Text style={{
          color: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
          fontWeight: '700',
          fontSize: 12,
          opacity: 0.9,
          fontVariant: ['tabular-nums'],
          fontFamily: Platform.select({
            ios: 'Helvetica Neue',
            android: 'sans-serif-medium',
            web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
          })
        }}>
          {formatTime(displayTime, duration >= 3600)}
        </Text>
        <Text style={{
          color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.45)',
          fontWeight: '600',
          fontSize: 12,
          fontVariant: ['tabular-nums'],
          fontFamily: Platform.select({
            ios: 'Helvetica Neue',
            android: 'sans-serif-medium',
            web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
          })
        }}>
          {formatTime(duration, duration >= 3600)}
        </Text>
      </View>
    </View>
  );
}
