import React from 'react';
import { View, StyleSheet } from 'react-native';

interface TargetGridProps {
  children: React.ReactNode;
}

export function TargetGrid({ children }: TargetGridProps) {
  return (
    <View style={styles.grid}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
});
