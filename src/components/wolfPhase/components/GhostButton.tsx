import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { WolfTheme } from '../../../styles/wolfPhaseTheme';

interface GhostButtonProps {
  title: string;
  onPress: () => void;
}

export function GhostButton({ title, onPress }: GhostButtonProps) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#242432',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  text: {
    color: '#585868',
    fontSize: 14,
    fontWeight: '500',
  },
});
