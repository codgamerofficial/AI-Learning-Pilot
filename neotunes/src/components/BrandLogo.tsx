import React from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';

type BrandLogoProps = {
  style?: StyleProp<ImageStyle>;
};

export default function BrandLogo({ style }: BrandLogoProps) {
  return (
    <Image
      source={require('../../assets/brand-wordmark.png')}
      resizeMode="contain"
      style={style}
    />
  );
}