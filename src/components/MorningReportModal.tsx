import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

interface MorningReportModalProps {
  visible: boolean;
  onClose: () => void;
  messages: string[];
}

export const MorningReportModal: React.FC<MorningReportModalProps> = ({ visible, onClose, messages }) => {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalPanel}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>☀️ Kết quả đêm qua</Text>
          </View>
          
          <ScrollView style={styles.modalBody}>
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
});
