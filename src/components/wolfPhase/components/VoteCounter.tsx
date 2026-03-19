import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { WolfTheme } from '../../../styles/wolfPhaseTheme';

interface VoteCounterProps {
  current: number;
  total: number;
}

export function VoteCounter({ current, total }: VoteCounterProps) {
  const scale = useSharedValue(1);
  const isComplete = current === total;

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.2, { duration: 120 }),
      withTiming(1, { duration: 120 })
    );
    if (isComplete) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [current]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.counterRow, animStyle]}>
        <Text style={styles.current}>{current}</Text>
        <Text style={styles.total}> / {total}</Text>
      </Animated.View>
      <Text style={[styles.status, isComplete && { color: '#4A8A4A' }]}>
        {isComplete ? 'Tất cả đã đồng ý' : 'Chưa đủ số phiếu'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: '#181820',
    marginTop: 10,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  current: {
    fontSize: 26,
    fontWeight: '500',
    color: WolfTheme.text.primary,
  },
  total: {
    fontSize: 14,
    color: WolfTheme.text.muted,
  },
  status: {
    fontSize: 11,
    marginTop: 3,
    color: WolfTheme.text.muted,
  },
});
