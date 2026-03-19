import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { RoleThemes } from '../../../styles/roleThemes';

interface ThemedTargetCellProps {
  index: number;
  name: string;
  selected: boolean;
  disabled?: boolean;
  roleId: string;
  onPress: () => void;
  subLabel?: string;
}

export function ThemedTargetCell({ index, name, selected, disabled, roleId, onPress, subLabel }: ThemedTargetCellProps) {
  const theme = RoleThemes[roleId] || RoleThemes.default;
  const scale = useSharedValue(1);

  const handlePress = () => {
    if (disabled) return;
    scale.value = withSpring(0.96, { damping: 10, stiffness: 300 }, () => {
      scale.value = withSpring(1);
    });
    onPress();
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.container, animStyle]}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.6}
        disabled={disabled}
        style={[
          styles.cell,
          { 
            backgroundColor: selected ? theme.bg : theme.surface,
            borderColor: selected ? theme.border : (theme.border + '30'),
            opacity: disabled ? 0.35 : 1,
            elevation: selected ? 4 : 0,
          }
        ]}
      >
        <Text style={[styles.number, { color: selected ? theme.text : theme.muted }]}>
          {String(index).padStart(2, '0')}
        </Text>
        <Text 
          style={[
            styles.name, 
            { color: selected ? '#FFFFFF' : theme.text }
          ]} 
          numberOfLines={2}
        >
          {name}
        </Text>
        {subLabel && <Text style={[styles.subLabel, { color: theme.muted, fontWeight: '700' }]}>{subLabel}</Text>}
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
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
  },
  number: {
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subLabel: {
    fontSize: 12,
    marginTop: 6,
  }
});
