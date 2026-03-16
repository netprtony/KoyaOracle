import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';

type Props = {
  visible: boolean;
  wolfName?: string;
  onClose: () => void;
};

export function RedRidingHoodRevealModal({ visible, wolfName, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 }}>
        <View style={{ backgroundColor: '#111827', borderRadius: 12, padding: 16 }}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>Khăn Đỏ</Text>
          {wolfName ? (
            <Text style={{ color: '#FCA5A5', marginTop: 8, fontSize: 18, fontWeight: '700' }}>
              Bạn đã phát hiện một sói: {wolfName}
            </Text>
          ) : (
            <Text style={{ color: '#9CA3AF', marginTop: 8 }}>Không con sói hợp lệ để tiết lộ trong đêm nay.</Text>
          )}

          <TouchableOpacity
            onPress={onClose}
            style={{ marginTop: 16, padding: 12, borderRadius: 8, backgroundColor: '#10B981', alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
