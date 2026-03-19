import React, { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { NightRoleId, NightActionState } from '../../types/nightPhase.types';
import { useNightPhaseStore } from '../../store/slices/nightPhaseSlice';
import { NIGHT_PALETTE } from '../../constants/nightPalette';
import { ActionDoneBanner } from './ActionDoneBanner';
import { NightCTAButton } from './NightCTAButton';

interface RoleActionScreenProps {
  roleId: NightRoleId;
  playerId: string;
  children: ReactNode;
  onBuildAction: () => NightActionState;
  canConfirm: boolean;
  onSkip: () => void;
  lockEdit?: boolean;
}

export function RoleActionScreen({
  roleId,
  playerId,
  children,
  onBuildAction,
  canConfirm,
  onSkip,
  lockEdit = false,
}: RoleActionScreenProps) {
  const { getNightAction, setNightAction } = useNightPhaseStore();
  const existingAction = getNightAction(roleId, playerId);
  const isDone = !!existingAction && existingAction.type !== 'SKIPPED';
  const isLocked = lockEdit && isDone;

  const handleConfirm = () => {
    if (isLocked) return;
    setNightAction(roleId, playerId, onBuildAction());
  };

  return (
    <View style={styles.container}>
      {isDone ? (
        <ActionDoneBanner
          label={existingAction.type}
          isEditable={!isLocked}
          isModified={existingAction.isModified}
          timestamp={existingAction.confirmedAt}
        />
      ) : null}

      <View style={styles.content}>{children}</View>

      <NightCTAButton
        label={isDone ? (isLocked ? 'Da thuc hien' : 'Cap nhat hanh dong') : 'Xac nhan'}
        variant={isLocked ? 'ghost' : 'primary'}
        disabled={isLocked || !canConfirm}
        onPress={handleConfirm}
      />

      {!isDone ? <NightCTAButton label="Bo qua dem nay" variant="ghost" onPress={onSkip} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NIGHT_PALETTE.bg,
    padding: 16,
    gap: 12,
  },
  content: {
    flex: 1,
    gap: 12,
  },
});
