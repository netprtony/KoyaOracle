import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { WolfTheme } from '../../../styles/wolfPhaseTheme';

interface TargetCellProps {
  index:       number;
  name:        string;
  selected:    boolean;
  revengeMode: boolean;      // S5: viền khác
  onPress:     () => void;
}

export function TargetCell({ index, name, selected, revengeMode, onPress }: TargetCellProps) {
  const scale = useSharedValue(1);

  const handlePress = () => {
    scale.value = withSpring(0.96, { damping: 10, stiffness: 300 }, () => {
      scale.value = withSpring(1);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const selectedBorder = revengeMode ? WolfTheme.border.revenge : WolfTheme.border.wolf;
  const selectedBg     = '#180808';

  return (
    <Animated.View style={[styles.container, animStyle]}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={1}
        style={[
          styles.cell,
          {
            backgroundColor: selected ? selectedBg : WolfTheme.bg.card,
            borderColor: selected ? selectedBorder : WolfTheme.border.default,
          }
        ]}
      >
        <Text style={styles.number}>
          {String(index).padStart(2, '0')}
        </Text>
        <Text style={styles.name} numberOfLines={2}>
          {name || 'Unknown'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '48%', // Approx half with gap
    margin: '1%',
  },
  cell: {
    padding: 11,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 70,
  },
  number: {
    fontSize: 11,
    color: '#484858',
    marginBottom: 4,
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E0D8C8', // Use primary text color for better visibility
    textAlign: 'center',
  },
});
