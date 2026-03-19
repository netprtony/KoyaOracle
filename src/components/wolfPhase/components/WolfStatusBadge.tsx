import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WolfTheme } from '../../../styles/wolfPhaseTheme';

interface WolfStatusBadgeProps {
  text: string;
  type: 'awake' | 'asleep' | 'warning';
}

export function WolfStatusBadge({ text, type }: WolfStatusBadgeProps) {
  let bgColor = '#1A0808';
  let textColor = WolfTheme.accent.wolf;

  if (type === 'asleep') {
    bgColor = '#0E0E14';
    textColor = '#404050';
  } else if (type === 'warning') {
    bgColor = '#181000';
    textColor = WolfTheme.text.amber;
  }

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={[styles.text, { color: textColor }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '500',
  },
});
