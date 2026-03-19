import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NIGHT_PALETTE } from '../../constants/nightPalette';

interface TargetCellProps {
  index: number;
  playerName: string;
  isSelected: boolean;
  isDisabled: boolean;
  onPress: () => void;
}

export function TargetCell({ index, playerName, isSelected, isDisabled, onPress }: TargetCellProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Muc tieu ${playerName}`}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cell,
        isSelected && styles.selected,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      <Text style={styles.index}>{String(index).padStart(2, '0')}</Text>
      <Text numberOfLines={2} style={styles.name}>{playerName}</Text>
      {isSelected ? <View style={styles.selectedDot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: NIGHT_PALETTE.borderStrong,
    borderRadius: 10,
    backgroundColor: NIGHT_PALETTE.surface,
    padding: 8,
    gap: 6,
    flex: 1,
  },
  selected: {
    borderColor: NIGHT_PALETTE.wolfRed,
    backgroundColor: NIGHT_PALETTE.wolfRedDim,
  },
  disabled: {
    opacity: NIGHT_PALETTE.sleepOpacity,
  },
  pressed: {
    opacity: 0.85,
  },
  index: {
    color: NIGHT_PALETTE.textDim,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  name: {
    color: NIGHT_PALETTE.text,
    fontSize: 13,
    fontWeight: '600',
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    alignSelf: 'flex-end',
    backgroundColor: NIGHT_PALETTE.wolfRed,
  },
});
