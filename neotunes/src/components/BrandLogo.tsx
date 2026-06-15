import React from 'react';
import { View, Text, Platform } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import { usePreferencesStore } from '../store/preferencesStore';
import { getThemePalette } from '../lib/themePalette';

export default function BrandLogo({ style }: { style?: any }) {
  const themeMode = usePreferencesStore((state) => state.themeMode);
  const palette = getThemePalette(themeMode);
  const isDark = themeMode === 'dark';

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      {/* Visual Concept: Neo Pulse Logo v4.2 (Liquid N-shaped wave + concentric glowing rings) */}
      <View style={{
        width: 36,
        height: 36,
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Svg width={36} height={36} viewBox="0 0 36 36">
          <Defs>
            <LinearGradient id="neoPulseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#7C3AED" />
              <Stop offset="50%" stopColor="#00D4FF" />
              <Stop offset="100%" stopColor="#FFC857" />
            </LinearGradient>
          </Defs>
          
          {/* Outer Pulsing Dashed Gradient Ring */}
          <Circle
            cx="18"
            cy="18"
            r="16.5"
            stroke="url(#neoPulseGrad)"
            strokeWidth="1.5"
            fill="transparent"
            strokeDasharray="4, 4"
            opacity="0.75"
          />

          {/* Inner Glowing Ring */}
          <Circle
            cx="18"
            cy="18"
            r="13.5"
            stroke="url(#neoPulseGrad)"
            strokeWidth="1"
            fill="transparent"
            opacity="0.2"
          />
          
          {/* Overlapping Liquid Wave 1 (Background Depth Wave) */}
          <Path
            d="M 12.5,26 C 12.5,16 12.5,12 16.5,12 C 20.5,12 18.5,26 22.5,26 C 26.5,26 26.5,22 26.5,12"
            fill="none"
            stroke="#00D4FF"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.4"
          />

          {/* Overlapping Liquid Wave 2 (Foreground Primary Wave forming 'N') */}
          <Path
            d="M 11,25 C 11,15 11,11 15,11 C 19,11 17,25 21,25 C 25,25 25,21 25,11"
            fill="none"
            stroke="url(#neoPulseGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Glowing Neon Gold Dot at the top right of the wave N */}
          <Circle
            cx="25"
            cy="7.5"
            r="2.2"
            fill="#FFC857"
          />
        </Svg>
      </View>
      <Text style={{
        color: palette.text,
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