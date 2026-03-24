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
  const selectedBg     = '#2A0808'; // Slightly brighter dark red

  return (
    <Animated.View style={[styles.container, animStyle]}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        style={[
          styles.cell,
          {
            backgroundColor: selected ? selectedBg : '#1A1A24',
            borderColor: selected ? selectedBorder : '#2A2A3A',
            borderWidth: selected ? 2.5 : 1.5,
          }
        ]}
      >
        <Text style={[styles.number, selected && { color: WolfTheme.accent.wolf }]}>
          {String(index).padStart(2, '0')}
        </Text>
        <Text style={[styles.name, selected && { color: '#FFFFFF' }]} numberOfLines={2}>
          {name || 'Unknown'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '48%', 
    margin: '1%',
  },
  cell: {
    padding: 15,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90, // Much larger for GM
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  number: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#686878',
    marginBottom: 6,
    letterSpacing: 1,
  },
  name: {
    fontSize: 18, // Large text for GM visibility
    fontWeight: 'bold',
    color: '#FFFFFF', 
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
