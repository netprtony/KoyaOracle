import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { NIGHT_PALETTE } from '../../constants/nightPalette';

type NightCTAButtonVariant = 'primary' | 'ghost' | 'danger';

interface NightCTAButtonProps {
  label: string;
  variant?: NightCTAButtonVariant;
  disabled?: boolean;
  onPress: () => void;
}

export function NightCTAButton({
  label,
  variant = 'primary',
  disabled = false,
  onPress,
}: NightCTAButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.danger,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 10,
  },
  primary: {
    backgroundColor: NIGHT_PALETTE.wolfRed,
    borderColor: NIGHT_PALETTE.wolfRedBorder,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: NIGHT_PALETTE.borderStrong,
  },
  danger: {
    backgroundColor: NIGHT_PALETTE.wolfRedDim,
    borderColor: NIGHT_PALETTE.wolfRed,
  },
  label: {
    color: NIGHT_PALETTE.text,
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.45,
  },
  labelDisabled: {
    color: NIGHT_PALETTE.textDim,
  },
});
