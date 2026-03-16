import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Player } from '../types';

type Props = {
  visible: boolean;
  players: Player[];
  selfId?: string | null;
  onClose: () => void;
  onSkip: () => void;
  onConfirm: (targetId: string) => void;
};

export function DoppelgangerSelectModal({ visible, players, selfId, onClose, onSkip, onConfirm }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const options = useMemo(
    () => players.filter(p => p.isAlive && p.id !== selfId),
    [players, selfId]
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 }}>
        <View style={{ backgroundColor: '#111827', borderRadius: 12, padding: 16, maxHeight: '80%' }}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>Nhan Ban - Chon 1 muc tieu</Text>
          <Text style={{ color: '#9CA3AF', marginTop: 6 }}>Mục tiêu chỉ được chọn 1 lần vào đêm đầu.</Text>

          <ScrollView style={{ marginTop: 12 }}>
            {options.map(p => {
              const isSelected = selected === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setSelected(p.id)}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: isSelected ? '#10B981' : '#374151',
                    backgroundColor: isSelected ? '#052e16' : '#1f2937',
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>{p.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <TouchableOpacity
              onPress={() => {
                setSelected(null);
                onSkip();
              }}
              style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#4B5563', alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Bỏ qua</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (!selected) return;
                onConfirm(selected);
                setSelected(null);
              }}
              disabled={!selected}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 8,
                backgroundColor: selected ? '#10B981' : '#374151',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Xác nhận</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
