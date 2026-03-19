import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { WolfTheme } from '../../../styles/wolfPhaseTheme';

interface ConfirmButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

export function ConfirmButton({ title, onPress, disabled }: ConfirmButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        disabled && { opacity: WolfTheme.opacity.disabledBtn }
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: WolfTheme.accent.wolf,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  text: {
    color: '#F2EAE0',
    fontSize: 14,
    fontWeight: '500',
  },
});
