import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../src/styles/theme';
import { useGameStore } from '../src/store/gameStore';

export default function ManualRoleNoteScreen() {
  const router = useRouter();
  const { session, availableRoles, availableScenarios, assignRole } = useGameStore();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);

  if (!session) return null;

  // Get the current scenario
  const scenario = availableScenarios.find((s) => s.id === session.scenarioId);

  // Build role quantity map from scenario
  const roleQuantityMap = useMemo(() => {
    const map: Record<string, number> = {};
    scenario?.roles.forEach((r) => {
      map[r.roleId] = r.quantity;
    });
    return map;
  }, [scenario]);

  // Count assigned roles (excluding the current player being edited)
  const getAssignedRoleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    session?.players.forEach((p) => {
      // Don't count the selected player's current role
      if (p.roleId && p.id !== selectedPlayerId) {
        counts[p.roleId] = (counts[p.roleId] || 0) + 1;
      }
    });
    return counts;
  }, [session?.players, selectedPlayerId]);

  // Filter roles to only show those in the scenario
  const scenarioRoles = useMemo(() => {
    return availableRoles.filter((r) => roleQuantityMap[r.id] > 0);
  }, [availableRoles, roleQuantityMap]);

  // Check if a role is available (not all slots taken)
  const isRoleAvailable = (roleId: string) => {
    const assigned = getAssignedRoleCounts[roleId] || 0;
    const max = roleQuantityMap[roleId] || 0;
    return assigned < max;
  };

  // Get remaining count for a role
  const getRemainingCount = (roleId: string) => {
    const assigned = getAssignedRoleCounts[roleId] || 0;
    const max = roleQuantityMap[roleId] || 0;
    return max - assigned;
  };

  const handlePlayerPress = (playerId: string) => {
    setSelectedPlayerId(playerId);
    setShowRoleModal(true);
  };

  const handleRoleSelect = (roleId: string) => {
    if (selectedPlayerId && isRoleAvailable(roleId)) {
      assignRole(selectedPlayerId, roleId);
      setShowRoleModal(false);
      setSelectedPlayerId(null);
    }
  };

  const allRolesAssigned = session.players.every((p) => p.roleId !== null);

  const handleContinue = () => {
    router.push('/game-master-board');
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.header}>Ghi nhận vai trò</Text>
        <Text style={styles.subheader}>
          Nhấn vào người chơi để ghi nhận vai trò của họ
        </Text>

        <View style={styles.playerList}>
          {session.players.map((player) => {
            const role = availableRoles.find((r) => r.id === player.roleId);
            return (
              <TouchableOpacity
                key={player.id}
                style={styles.playerCard}
                onPress={() => handlePlayerPress(player.id)}
                activeOpacity={0.8}
              >
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>{player.name}</Text>
                  <Text style={styles.roleText}>
                    {role ? `${role.icon} ${role.name}` : '❓ Chưa xác định'}
                  </Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !allRolesAssigned && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!allRolesAssigned}
        >
          <Text style={styles.continueButtonText}>
            {allRolesAssigned ? 'Bắt đầu trò chơi' : 'Chưa đủ vai trò'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Role Selection Modal */}
      <Modal
        visible={showRoleModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRoleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Chọn vai trò</Text>
            <ScrollView style={styles.roleList}>
              {scenarioRoles.map((role) => {
                const available = isRoleAvailable(role.id);
                const remaining = getRemainingCount(role.id);
                const max = roleQuantityMap[role.id] || 0;

                return (
                  <TouchableOpacity
                    key={role.id}
                    style={[
                      styles.roleItem,
                      !available && styles.roleItemDisabled,
                    ]}
                    onPress={() => handleRoleSelect(role.id)}
                    activeOpacity={available ? 0.8 : 1}
                    disabled={!available}
                  >
                    <Text style={styles.roleIcon}>{role.icon}</Text>
                    <View style={styles.roleInfo}>
                      <Text
                        style={[
                          styles.roleName,
                          !available && styles.roleNameDisabled,
                        ]}
                      >
                        {role.name}
                      </Text>
                      <Text
                        style={[
                          styles.roleCount,
                          !available && styles.roleCountDisabled,
                        ]}
                      >
                        Còn lại: {remaining}/{max}
                      </Text>
                    </View>
                    {!available && (
                      <Text style={styles.unavailableText}>Đã hết</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowRoleModal(false)}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
  },
  header: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subheader: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  playerList: {
    gap: theme.spacing.sm,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  roleText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  arrow: {
    fontSize: theme.fontSize.xl,
    color: theme.colors.textSecondary,
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  continueButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    minHeight: theme.minTapTarget,
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: theme.colors.surfaceLight,
  },
  continueButtonText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    maxHeight: '70%',
  },
  modalHeader: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  roleList: {
    marginBottom: theme.spacing.lg,
  },
  roleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  roleItemDisabled: {
    backgroundColor: theme.colors.surface,
    opacity: 0.5,
  },
  roleIcon: {
    fontSize: 32,
    marginRight: theme.spacing.md,
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
    fontWeight: '600',
  },
  roleNameDisabled: {
    color: theme.colors.textSecondary,
  },
  roleCount: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  roleCountDisabled: {
    color: theme.colors.textSecondary,
  },
  unavailableText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.danger,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: theme.colors.danger,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
});
