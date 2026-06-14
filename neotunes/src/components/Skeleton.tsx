import React, { useEffect, useRef } from 'react';
import { Animated, View, ViewStyle } from 'react-native';

interface SkeletonProps {
  width: number | string;
  height: number;
  style?: ViewStyle;
  borderRadius?: number;
}

export function Skeleton({ width, height, style, borderRadius = 0 }: SkeletonProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const bg = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: ['#1C1C1E', '#2C2C2E'],
  });

  return (
    <Animated.View
      style={[{
        width: width as any,
        height,
        backgroundColor: bg,
        borderRadius,
        borderWidth: 2,
        borderColor: '#2C2C2E',
      }, style]}
    />
  );
}

/** Card skeleton for Trending row */
export function TrackCardSkeleton() {
  return (
    <View style={{ marginRight: 20, width: 220, height: 260 }}>
      <Skeleton width={220} height={140} />
      <Skeleton width={160} height={20} style={{ marginTop: 12 }} />
      <Skeleton width={100} height={14} style={{ marginTop: 8 }} />
    </View>
  );
}

/** Row skeleton for list results */
export function TrackRowSkeleton() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, padding: 12, borderWidth: 3, borderColor: '#1C1C1E' }}>
      <Skeleton width={60} height={60} style={{ marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <Skeleton width="80%" height={16} style={{ marginBottom: 8 }} />
        <Skeleton width="50%" height={12} />
      </View>
    </View>
  );
}
