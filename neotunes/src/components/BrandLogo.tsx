import React from 'react';
import { View, Text, Image, Platform } from 'react-native';

export default function BrandLogo({ style }: { style?: any }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      <View style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        marginRight: 10,
        shadowColor: '#FF2F3F',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 5,
        backgroundColor: '#FF2F3F',
      }}>
        <Image
          source={require('../../assets/icon.png')}
          style={{ width: 32, height: 32, borderRadius: 10 }}
          resizeMode="contain"
        />
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