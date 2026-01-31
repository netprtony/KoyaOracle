import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

interface Player {
  id: string;
  name: string;
  roleId: string | null;
  color: string;
  isAlive: boolean;
}

interface HunterRevengeModalProps {
  visible: boolean;
  onShoot: (targetId: string) => void;
  onSkip: () => void;
  hunterName: string;
  alivePlayers: Player[];
}

export const HunterRevengeModal: React.FC<HunterRevengeModalProps> = ({
  visible,
  onShoot,
  onSkip,
  hunterName,
  alivePlayers,
}) => {
  const [selectedTarget, setSelectedTarget] = React.useState<string | null>(null);

  const handleConfirm = () => {
    if (selectedTarget) {
      onShoot(selectedTarget);
      setSelectedTarget(null);
    }
  };

  const handleSkip = () => {
    onSkip();
    setSelectedTarget(null);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleSkip}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalPanel}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🏹 Thợ Săn Trả Thù</Text>
            <Text style={styles.modalSubtitle}>
              {hunterName} đã chết!
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Thợ săn có thể chọn bắn 1 người hoặc bắn lên trời (không giết ai)
            </Text>
          </View>

          <ScrollView style={styles.modalBody}>
            {alivePlayers.length === 0 ? (
              <Text style={styles.emptyText}>Không còn người chơi nào.</Text>
            ) : (
              alivePlayers.map((player) => {
                const isSelected = selectedTarget === player.id;
                return (
                  <TouchableOpacity
                    key={player.id}
                    style={[
                      styles.playerRow,
                      isSelected && styles.playerRowSelected,
                      { borderLeftColor: player.color },
                    ]}
                    onPress={() => setSelectedTarget(player.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.playerInfo}>
                      <View style={[styles.playerColorDot, { backgroundColor: player.color }]} />
                      <Text style={[styles.playerName, isSelected && styles.playerNameSelected]}>
                        {player.name}
                      </Text>
                    </View>
                    <View style={[styles.checkBox, isSelected && styles.checkBoxSelected]}>
                      {isSelected && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            {/* Shoot Sky Button */}
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
              <Text style={styles.skipBtnText}>🌌 Bắn lên trời (Không giết ai)</Text>
            </TouchableOpacity>

            {/* Shoot Player Button */}
            <TouchableOpacity
              style={[styles.shootBtn, !selectedTarget && styles.disabledBtn]}
              onPress={handleConfirm}
              disabled={!selectedTarget}
            >
              <Text style={styles.shootBtnText}>
                {selectedTarget
                  ? `🎯 Bắn ${alivePlayers.find((p) => p.id === selectedTarget)?.name}`
                  : '🎯 Chọn mục tiêu để bắn'}
              </Text>
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
    maxWidth: 450,
    backgroundColor: '#1f2937',
    borderRadius: 16,
    maxHeight: '85%',
    padding: 20,
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  modalHeader: {
    marginBottom: 16,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    color: '#d1d5db',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalBody: {
    marginBottom: 16,
    maxHeight: 300,
  },
  emptyText: {
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#374151',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  playerRowSelected: {
    backgroundColor: '#f59e0b20',
    borderColor: '#f59e0b',
    borderWidth: 2,
    borderLeftWidth: 4,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playerColorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  playerName: {
    color: '#f3f4f6',
    fontSize: 16,
    fontWeight: '500',
  },
  playerNameSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6b7280',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxSelected: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  checkMark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalFooter: {
    gap: 10,
  },
  skipBtn: {
    backgroundColor: '#6b7280',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  skipBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  shootBtn: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledBtn: {
    backgroundColor: '#4b5563',
    opacity: 0.5,
  },
  shootBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
