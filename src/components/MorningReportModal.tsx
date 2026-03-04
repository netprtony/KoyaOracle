import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

interface BewitchedBittenEntry {
  playerName: string;
  killedBy: 'werewolf' | 'vampire';
}

interface MorningReportModalProps {
  visible: boolean;
  onClose: () => void;
  messages: string[];
  /** GM-only: Bị Quyến players who were bitten but survived this night */
  bewitchedBitten?: BewitchedBittenEntry[];
}

export const MorningReportModal: React.FC<MorningReportModalProps> = ({
  visible,
  onClose,
  messages,
  bewitchedBitten,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalPanel}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>☀️ Kết quả đêm qua</Text>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* GM-only Bewitched alert – shown prominently BEFORE normal messages */}
            {bewitchedBitten && bewitchedBitten.length > 0 && (
              <View style={styles.bewitchedAlertBox}>
                <Text style={styles.bewitchedAlertTitle}>🔔 THÔNG BÁO RIÊNG CHO QUẢN TRÒ</Text>
                {bewitchedBitten.map((entry, i) => (
                  <View key={i} style={styles.bewitchedEntry}>
                    <Text style={styles.bewitchedEntryText}>
                      <Text style={styles.bewitchedName}>{entry.playerName}</Text>
                      {entry.killedBy === 'werewolf'
                        ? ' bị Sói cắn nhưng KHÔNG CHẾT.'
                        : ' bị Ma Cà Rồng cắn nhưng KHÔNG CHẾT.'}
                    </Text>
                    <Text style={styles.bewitchedInstruction}>
                      {'👉 Ra hiệu bí mật cho người chơi này: họ đã bị '}
                      {entry.killedBy === 'werewolf' ? 'Sói' : 'Ma Cà Rồng'}
                      {' cắn và sẽ '}
                      <Text style={styles.bewitchedTransformText}>
                        biến thành {entry.killedBy === 'werewolf' ? 'Sói 🐺' : 'Ma Cà Rồng 🧛'}
                      </Text>
                      {' từ đêm tiếp theo.'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {messages.length === 0 ? (
              <Text style={styles.emptyText}>Không có thông tin gì.</Text>
            ) : (
              messages.map((msg, index) => (
                <View key={index} style={styles.messageRow}>
                  <Text style={styles.messageText}>{msg}</Text>
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.confirmBtn} onPress={onClose}>
              <Text style={styles.confirmBtnText}>Bắt đầu ngày mới</Text>
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
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalPanel: {
    width: '100%',
    backgroundColor: '#1f2937',
    borderRadius: 16,
    maxHeight: '60%',
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  modalHeader: {
    marginBottom: 16,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fbbf24', // Amber-400
  },
  modalBody: {
    marginBottom: 20,
  },
  messageRow: {
    backgroundColor: '#374151',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  messageText: {
    color: '#f3f4f6',
    fontSize: 18,
    textAlign: 'center',
  },
  emptyText: {
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalFooter: {
    marginTop: 'auto',
  },
  confirmBtn: {
    backgroundColor: '#f59e0b',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    textTransform: 'uppercase',
  },
  // Bewitched GM alert
  bewitchedAlertBox: {
    backgroundColor: '#1c1008',
    borderWidth: 2,
    borderColor: '#f97316',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  bewitchedAlertTitle: {
    color: '#fb923c',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 0.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  bewitchedEntry: {
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#f97316',
    paddingLeft: 10,
  },
  bewitchedEntryText: {
    color: '#fed7aa',
    fontSize: 15,
    marginBottom: 4,
  },
  bewitchedName: {
    fontWeight: 'bold',
    color: '#fb923c',
  },
  bewitchedInstruction: {
    color: '#fde68a',
    fontSize: 13,
    lineHeight: 18,
  },
  bewitchedTransformText: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
});
