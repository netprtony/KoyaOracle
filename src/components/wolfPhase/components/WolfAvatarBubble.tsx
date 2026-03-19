import React from 'react';
import { View, Text } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { WolfTheme } from '../../../styles/wolfPhaseTheme';

interface WolfAvatarBubbleProps {
  abbreviation: string;      // 'SÓI' | 'SC' | 'SĐ' | 'NS'
  playerName:   string;
  isAsleep:     boolean;     // Nanh Sói khi không đủ điều kiện
  isWolfCub:    boolean;     // dùng amber palette
}

export function WolfAvatarBubble({ abbreviation, playerName, isAsleep, isWolfCub }: WolfAvatarBubbleProps) {
  const animStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isAsleep ? WolfTheme.opacity.wolfFangAsleep : 1, { duration: 400 }),
  }));

  const borderColor = isAsleep
    ? WolfTheme.border.default
    : isWolfCub ? WolfTheme.border.wolfCub : WolfTheme.border.wolf;

  const bgColor = isWolfCub ? WolfTheme.bg.wolfCub : '#180808';
  const textColor = isWolfCub ? WolfTheme.text.wolfCub : WolfTheme.text.wolf;

  return (
    <Animated.View style={[{ alignItems: 'center' }, animStyle]}>
      <View style={{
        width: 44, height: 44, borderRadius: 10,
        backgroundColor: bgColor,
        borderWidth: 1.5, borderColor,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 5,
      }}>
        <Text style={{ fontSize: 11, fontWeight: '500', color: textColor }}>
          {abbreviation}
        </Text>
      </View>
      <Text style={{ fontSize: 11, color: WolfTheme.text.muted }} numberOfLines={1}>
        {playerName}
      </Text>
    </Animated.View>
  );
}
