import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Player {
  id: string;
  name: string;
  roleId: string | null;
  color: string;
  isAlive: boolean;
}

interface Role {
  id: string;
  name: string;
  icon?: string;
  iconEmoji?: string;
  team: string;
  description?: string;
}

interface SeerInvestigationResultModalProps {
  visible: boolean;
  onClose: () => void;
  targetPlayer: Player | null;
  targetRole: Role | null;
}

export const SeerInvestigationResultModal: React.FC<SeerInvestigationResultModalProps> = ({
  visible,
  onClose,
  targetPlayer,
  targetRole,
}) => {
  if (!targetPlayer || !targetRole) return null;

  const getTeamDisplay = (team: string) => {
    switch (team) {
      case 'werewolf':
        return { name: 'Phe Sói', color: '#ef4444', icon: '🐺' };
      case 'villager':
        return { name: 'Phe Dân', color: '#10b981', icon: '👥' };
      case 'neutral':
        return { name: 'Phe Trung Lập', color: '#f59e0b', icon: '⚖️' };
      default:
        return { name: 'Không rõ', color: '#6b7280', icon: '❓' };
    }
  };

  const teamInfo = getTeamDisplay(targetRole.team);
  const roleIcon = targetRole.iconEmoji || targetRole.icon || '❓';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalPanel}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🔮 Kết quả điều tra</Text>
          </View>

          <View style={styles.modalBody}>
            {/* Player Info */}
            <View style={styles.playerCard}>
              <View style={[styles.playerColorDot, { backgroundColor: targetPlayer.color }]} />
              <Text style={styles.playerName}>{targetPlayer.name}</Text>
            </View>

            {/* Role Reveal */}
            <View style={styles.roleReveal}>
              <Text style={styles.roleIcon}>{roleIcon}</Text>
              <Text style={styles.roleName}>{targetRole.name}</Text>
              
              {/* Team Badge */}
              <View style={[styles.teamBadge, { backgroundColor: teamInfo.color + '20', borderColor: teamInfo.color }]}>
                <Text style={styles.teamIcon}>{teamInfo.icon}</Text>
                <Text style={[styles.teamName, { color: teamInfo.color }]}>{teamInfo.name}</Text>
              </View>
            </View>

            {/* Description (optional) */}
            {targetRole.description && (
              <View style={styles.descriptionBox}>
                <Text style={styles.descriptionText}>{targetRole.description}</Text>
              </View>
            )}
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalPanel: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1f2937',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: '#8b5cf6',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    marginBottom: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8b5cf6',
  },
  modalBody: {
    marginBottom: 20,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  playerColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  playerName: {
    color: '#f3f4f6',
    fontSize: 18,
    fontWeight: '600',
  },
  roleReveal: {
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  roleIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  roleName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  teamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    gap: 8,
  },
  teamIcon: {
    fontSize: 20,
  },
  teamName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  descriptionBox: {
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 8,
  },
  descriptionText: {
    color: '#d1d5db',
    fontSize: 13,
    lineHeight: 18,
  },
  modalFooter: {
    marginTop: 'auto',
  },
  closeBtn: {
    backgroundColor: '#8b5cf6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textTransform: 'uppercase',
  },
});
