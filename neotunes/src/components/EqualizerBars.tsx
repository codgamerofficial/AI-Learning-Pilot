/**
 * EqualizerBars.tsx
 * Animated equalizer bars using react-native-reanimated.
 * Used in MiniPlayer and track cards while audio is playing.
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat,
  withSequence, withTiming, Easing,
} from 'react-native-reanimated';

interface Props {
  color?: string;
  barCount?: number;
  height?: number;
  active?: boolean;
}

interface BarProps {
  color: string;
  height: number;
  active: boolean;
  index: number;
}

function EqualizerBar({ color, height, active, index }: BarProps) {
  const h = useSharedValue(0.3);

  useEffect(() => {
    if (!active) {
      h.value = withTiming(0.2, { duration: 200 });
      return;
    }
    const delay = index * 120;
    const dur = 350 + index * 80;
    h.value = withRepeat(
      withSequence(
        withTiming(1, { duration: dur, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.15, { duration: dur, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [active, index]);

  const style = useAnimatedStyle(() => ({
    height: h.value * height,
    opacity: active ? 0.9 + h.value * 0.1 : 0.3,
  }));

  return (
    <Animated.View
      style={[style, {
        width: 4,
        backgroundColor: color,
        borderRadius: 2,
      }]}
    />
  );
}

export default function EqualizerBars({
  color = '#FFD300',
  barCount = 4,
  height = 24,
  active = true,
}: Props) {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 3,
      height,
    }}>
      {Array.from({ length: barCount }).map((_, i) => (
        <EqualizerBar
          key={i}
          color={color}
          height={height}
          active={active}
          index={i}
        />
      ))}
    </View>
  );
}
