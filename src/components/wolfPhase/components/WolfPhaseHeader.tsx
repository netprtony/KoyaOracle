import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WolfTheme } from '../../../styles/wolfPhaseTheme';

interface WolfPhaseHeaderProps {
  step: number;
  nightNumber: number;
}

const STEP_NAMES = [
  'Gọi Sói',
  'Bầy Đàn',
  'Chọn Mồi',
  'Biểu Quyết',
  'Báo Thù'
];

export function WolfPhaseHeader({ step, nightNumber }: WolfPhaseHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.nightText}>ĐÊM {nightNumber}</Text>
        <View style={styles.stepDots}>
          {[0, 1, 2, 4].map((s) => (
            <View 
              key={s} 
              style={[
                styles.dot, 
                step === s ? styles.dotActive : (step > s ? styles.dotPassed : styles.dotFuture)
              ]} 
            />
          ))}
        </View>
      </View>
      <Text style={styles.stepName}>{STEP_NAMES[step]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#181820',
    marginBottom: 20,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nightText: {
    fontSize: 11,
    color: WolfTheme.text.muted,
    letterSpacing: 1,
  },
  stepDots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: WolfTheme.accent.wolf,
  },
  dotPassed: {
    backgroundColor: '#404050',
  },
  dotFuture: {
    backgroundColor: '#1C1C26',
  },
  stepName: {
    fontSize: 12,
    fontWeight: '500',
    color: WolfTheme.text.secondary,
    textTransform: 'uppercase',
  },
});
