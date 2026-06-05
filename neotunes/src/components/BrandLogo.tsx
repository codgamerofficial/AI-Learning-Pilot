import React from 'react';
import { View, Text, Platform } from 'react-native';
import { Sparkles } from 'lucide-react-native';

export default function BrandLogo({ style }: { style?: any }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      <View style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#FF2F3F',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        shadowColor: '#FF2F3F',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
      }}>
        <Sparkles stroke="#FFF" size={18} strokeWidth={2.5} />
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
        Neo<Text style={{ color: '#FF2F3F' }}>Tunes</Text>
      </Text>
    </View>
  );
}