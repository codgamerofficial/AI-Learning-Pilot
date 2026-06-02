import React, { useState } from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { Music2 } from 'lucide-react-native';

interface SafeImageProps {
  uri: string;
  style: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat';
  borderStyle?: any;
}

export default function SafeImage({ uri, style, resizeMode = 'cover', borderStyle = {} }: SafeImageProps) {
  const [error, setError] = useState(false);

  if (error || !uri) {
    const styleObj = StyleSheet.flatten(style) || {};
    const width = typeof styleObj.width === 'number' ? styleObj.width : 48;
    const height = typeof styleObj.height === 'number' ? styleObj.height : 48;
    const borderRadius = typeof styleObj.borderRadius === 'number' ? styleObj.borderRadius : 12;

    return (
      <View
        style={[
          style,
          {
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius,
          },
          borderStyle,
        ]}
      >
        <Music2
          stroke="rgba(255, 255, 255, 0.4)"
          size={Math.max(16, Math.min(width, height) / 2.5)}
        />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode={resizeMode}
      onError={() => setError(true)}
    />
  );
}
