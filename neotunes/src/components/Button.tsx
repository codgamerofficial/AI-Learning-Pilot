import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  color?: 'primary' | 'secondary' | 'accent';
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({ title, onPress, color = 'primary', fullWidth = false }) => {
  let bgColorClass = 'bg-neonPurple';
  if (color === 'secondary') bgColorClass = 'bg-electricBlue';
  if (color === 'accent') bgColorClass = 'bg-acidGreen';

  let textColorClass = color === 'accent' ? 'text-deepBlack' : 'text-white';

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <View className={`${bgColorClass} border-4 border-deepBlack ${fullWidth ? 'w-full' : 'self-start'} py-4 px-6 rounded-none shadow-[4px_4px_0px_rgba(10,10,10,1)]`}>
        <Text className={`font-bold text-center uppercase tracking-widest text-lg ${textColorClass}`}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default Button;
