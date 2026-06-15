import React from 'react';
import { View, Text, Platform } from 'react-native';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { usePreferencesStore } from '../store/preferencesStore';
import { getThemePalette } from '../lib/themePalette';

export default function BrandLogo({ style }: { style?: any }) {
  const themeMode = usePreferencesStore((state) => state.themeMode);
  const palette = getThemePalette(themeMode);

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      {/* Visual Concept: Neon Gradient Ring + N-shaped Waveform + ◉ circle dot */}
      <View style={{
        width: 36,
        height: 36,
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Svg width={36} height={36} viewBox="0 0 36 36">
          <Defs>
            <LinearGradient id="neoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#7C3AED" />   {/* Aurora Purple */}
              <Stop offset="100%" stopColor="#00D4FF" />  {/* Electric Blue */}
            </LinearGradient>
          </Defs>
          
          {/* Outer Neon Gradient Ring */}
          <Circle
            cx="18"
            cy="18"
            r="16"
            stroke="url(#neoGrad)"
            strokeWidth="2"
            fill="transparent"
            strokeDasharray="6, 3"
            opacity="0.85"
          />

          {/* Pulse wave background circle */}
          <Circle
            cx="18"
            cy="18"
            r="12"
            stroke="#7C3AED"
            strokeWidth="0.5"
            fill="transparent"
            opacity="0.25"
          />
          
          {/* N-shaped Waveform: ╱╲╱╲ forming N */}
          <Path
            d="M 10 24 L 15 13 L 20 23 L 25 12"
            stroke="url(#neoGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="transparent"
          />

          {/* ◉ Circle Dot at the top */}
          <Circle
            cx="18"
            cy="7"
            r="2.5"
            fill="#FFC857"  // Neon Gold dot
          />
        </Svg>
      </View>
      <Text style={{
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5,
        fontFamily: Platform.select({
          ios: 'Helvetica Neue',
          android: 'sans-serif-condensed',
          default: 'system-ui',
        }),
      }}>
        Neo<Text style={{ color: '#7C3AED' }}>Tunes</Text>
      </Text>
    </View>
  );
}