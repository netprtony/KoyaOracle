import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { theme } from '../styles/theme';
import { Player } from '../types';

interface ManualVotingModalProps {
  visible: boolean;
  onClose: () => void;
  targetPlayer: Player; // Người bị bỏ phiếu
  availablePlayers: Player[]; // Danh sách người có thể bỏ phiếu (trừ targetPlayer)
  onConfirm: (voteCount: number, voters: Player[]) => void;
}

export function ManualVotingModal({
  visible,
  onClose,
  targetPlayer,
  availablePlayers,
  onConfirm,
}: ManualVotingModalProps) {
  const [selectedVoters, setSelectedVoters] = useState<string[]>([]);

  // Reset when modal closes or target changes
  useEffect(() => {
    if (!visible) {
      setSelectedVoters([]);
    }
  }, [visible]);

  const toggleVoter = (playerId: string) => {
    setSelectedVoters((prev) => {
      if (prev.includes(playerId)) {
        return prev.filter((id) => id !== playerId);
      } else {
        return [...prev, playerId];
      }
    });
  };

  const handleConfirm = () => {
    const voters = availablePlayers.filter((p) => selectedVoters.includes(p.id));
    onConfirm(selectedVoters.length, voters);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Bỏ phiếu thủ công</Text>
            <Text style={styles.subtitle}>
              Chọn ai đã bỏ phiếu cho{' '}
              <Text style={styles.targetName}>{targetPlayer.name}</Text>
            </Text>
          </View>

          <ScrollView style={styles.scrollView}>
            {availablePlayers.map((player) => {
              const isSelected = selectedVoters.includes(player.id);
              return (
                <TouchableOpacity
                  key={player.id}
                  style={[
                    styles.voterCard,
                    isSelected && styles.voterCardSelected,
                  ]}
                  onPress={() => toggleVoter(player.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.voterInfo}>
                    <View
                      style={[
                        styles.colorDot,
                        { backgroundColor: player.color },
                      ]}
                    />
                    <Text
                      style={[
                        styles.voterName,
                        isSelected && styles.voterNameSelected,
                      ]}
                    >
                      {player.name}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      isSelected && styles.checkboxSelected,
                    ]}
                  >
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              Tổng số phiếu: <Text style={styles.voteCount}>{selectedVoters.length}</Text>
            </Text>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                selectedVoters.length === 0 && styles.buttonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={selectedVoters.length === 0}
            >
              <Text style={styles.confirmButtonText}>
                Xác nhận ({selectedVoters.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    width: '92%',
    maxHeight: '68%',
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  targetName: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  scrollView: {
    maxHeight: 260,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  voterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xs,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  voterCardSelected: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primary,
  },
  voterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  voterName: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: '500',
  },
  voterNameSelected: {
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  checkboxSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkmark: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
  },
  summary: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceLight,
  },
  summaryText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    textAlign: 'center',
  },
  voteCount: {
    fontWeight: 'bold',
    color: theme.colors.primary,
    fontSize: theme.fontSize.lg,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: theme.minTapTarget,
  },
  cancelButton: {
    backgroundColor: theme.colors.surfaceLight,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  confirmButton: {
    backgroundColor: theme.colors.primary,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.surfaceLight,
    opacity: 0.5,
  },
  buttonText: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  confirmButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
});
