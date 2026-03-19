import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NIGHT_PALETTE } from '../../constants/nightPalette';

interface ActionDoneBannerProps {
  label: string;
  isEditable: boolean;
  isModified?: boolean;
  timestamp?: number;
}

export function ActionDoneBanner({ label, isEditable, isModified = false, timestamp }: ActionDoneBannerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.check}>✓</Text>
        <Text style={styles.title}>DA THUC HIEN</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
      {timestamp ? <Text style={styles.meta}>{new Date(timestamp).toLocaleTimeString()}</Text> : null}
      <Text style={styles.meta}>{isEditable ? 'Co the chinh sua' : 'Da khoa'}</Text>
      {isModified ? <Text style={styles.modified}>Da cap nhat lai hanh dong</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: NIGHT_PALETTE.borderStrong,
    backgroundColor: NIGHT_PALETTE.surface,
    padding: 12,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  check: {
    color: '#4CA98A',
    fontSize: 16,
    fontWeight: '700',
  },
  title: {
    color: '#4CA98A',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  label: {
    color: NIGHT_PALETTE.text,
    fontSize: 14,
    fontWeight: '600',
  },
  meta: {
    color: NIGHT_PALETTE.textMuted,
    fontSize: 12,
  },
  modified: {
    color: NIGHT_PALETTE.cubAmber,
    fontSize: 12,
    fontWeight: '600',
  },
});
