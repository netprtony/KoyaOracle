import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNightPhaseStore } from '../../store/slices/nightPhaseSlice';
import { NIGHT_PALETTE } from '../../constants/nightPalette';
import { NightRoleQueueItem, getNightActionKey } from '../../types/nightPhase.types';
import { NightCTAButton } from './NightCTAButton';

interface NightQueueDrawerProps {
  visible?: boolean;
  queue?: NightRoleQueueItem[];
  currentIndex?: number;
  actionMap?: Record<string, { type: string; targetName?: string }>;
  onJumpToRole?: (index: number) => void;
  onClose?: () => void;
}

export function NightQueueDrawer(props: NightQueueDrawerProps = {}) {
  const {
    nightQueue,
    nightCurrentIndex,
    nightQueueVisible,
    nightActionMap,
    jumpToNightRole,
    toggleQueueDrawer,
  } = useNightPhaseStore();

  const visible = props.visible ?? nightQueueVisible;
  const queue = props.queue ?? nightQueue;
  const currentIndex = props.currentIndex ?? nightCurrentIndex;
  const closeDrawer = props.onClose ?? toggleQueueDrawer;

  const jump = (index: number) => {
    if (props.onJumpToRole) {
      props.onJumpToRole(index);
      return;
    }
    jumpToNightRole(index);
  };

  const actionMap = props.actionMap
    ? props.actionMap
    : Object.entries(nightActionMap).reduce<Record<string, { type: string; targetName?: string }>>((acc, [key, value]) => {
        acc[key] = { type: value.type };
        return acc;
      }, {});

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={closeDrawer}>
      <Pressable style={styles.backdrop} onPress={closeDrawer}>
        <Pressable style={styles.panel} onPress={() => undefined}>
          <Text style={styles.title}>DANH SACH DEM NAY</Text>
          <ScrollView contentContainerStyle={styles.list}>
            {queue.map((item, index) => {
              const action = actionMap[getNightActionKey(item.roleId, item.playerId)] || actionMap[`${item.roleId}:${item.roleId}`];
              const status = !item.isActive
                ? 'SLEEP'
                : index === currentIndex
                  ? 'NOW'
                  : action
                    ? 'DONE'
                    : 'NEXT';
              return (
                <Pressable
                  key={`${item.roleId}:${item.playerId}`}
                  onPress={() => jump(index)}
                  disabled={!item.isActive}
                  style={[styles.row, status === 'NOW' && styles.rowNow, !item.isActive && styles.rowSleep]}
                >
                  <Text style={styles.name}>{item.playerName}</Text>
                  <Text style={styles.badge}>{status}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <NightCTAButton label="Dong" variant="ghost" onPress={closeDrawer} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: NIGHT_PALETTE.bg,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: NIGHT_PALETTE.borderStrong,
    padding: 16,
    maxHeight: '70%',
  },
  title: {
    color: NIGHT_PALETTE.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  list: {
    gap: 8,
  },
  row: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: NIGHT_PALETTE.border,
    backgroundColor: NIGHT_PALETTE.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowNow: {
    borderColor: NIGHT_PALETTE.wolfRed,
  },
  rowSleep: {
    opacity: NIGHT_PALETTE.sleepOpacity,
  },
  name: {
    color: NIGHT_PALETTE.text,
    fontWeight: '600',
  },
  badge: {
    color: NIGHT_PALETTE.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
});
