import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NightRoleQueueItem, getNightActionKey } from '../../types/nightPhase.types';
import { NIGHT_PALETTE } from '../../constants/nightPalette';
import { NightCTAButton } from './NightCTAButton';

interface NightResolveSummaryProps {
  queue: NightRoleQueueItem[];
  actionMap: Record<string, { type: string; targetName?: string } | undefined>;
  onEdit: () => void;
  onResolve: () => void;
}

export function NightResolveSummary({ queue, actionMap, onEdit, onResolve }: NightResolveSummaryProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>TOM TAT HANH DONG DEM</Text>
      <View style={styles.list}>
        {queue.map(item => {
          const action = actionMap[getNightActionKey(item.roleId, item.playerId)];
          return (
            <View key={`${item.roleId}:${item.playerId}`} style={styles.row}>
              <Text style={styles.role}>{item.playerName}</Text>
              <Text style={styles.value}>{action ? action.targetName || action.type : 'BO QUA'}</Text>
            </View>
          );
        })}
      </View>
      <NightCTAButton label="Sua lai" variant="ghost" onPress={onEdit} />
      <NightCTAButton label="Sang buoi sang" variant="primary" onPress={onResolve} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: NIGHT_PALETTE.borderStrong,
    backgroundColor: NIGHT_PALETTE.surface,
    padding: 12,
  },
  title: {
    color: NIGHT_PALETTE.text,
    fontWeight: '700',
    marginBottom: 8,
  },
  list: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  role: {
    color: NIGHT_PALETTE.textMuted,
    flex: 1,
  },
  value: {
    color: NIGHT_PALETTE.text,
    flex: 1,
    textAlign: 'right',
    fontWeight: '600',
  },
});
