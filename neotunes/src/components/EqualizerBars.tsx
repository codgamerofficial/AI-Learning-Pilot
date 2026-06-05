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

export default function EqualizerBars({
  color = '#FF2F3F',
  barCount = 4,
  height = 24,
  active = true,
}: Props) {
  const bars = Array.from({ length: barCount }, (_, i) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const h = useSharedValue(0.3);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      if (!active) {
        h.value = withTiming(0.2, { duration: 200 });
        return;
      }
      const delay = i * 120;
      const dur = 350 + i * 80;
      h.value = withRepeat(
        withSequence(
          withTiming(1, { duration: dur, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.15, { duration: dur, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }, [active]);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const style = useAnimatedStyle(() => ({
      height: h.value * height,
      opacity: active ? 0.9 + h.value * 0.1 : 0.3,
    }));

    return { style };
  });

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 3,
      height,
    }}>
      {bars.map(({ style }, i) => (
        <Animated.View
          key={i}
          style={[style, {
            width: 4,
            backgroundColor: color,
            borderRadius: 2,
          }]}
        />
      ))}
    </View>
  );
}
