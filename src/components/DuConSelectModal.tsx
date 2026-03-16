import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Player } from '../types';

type Props = {
  visible: boolean;
  players: Player[];
  selfId?: string | null;
  onClose: () => void;
  onSkip: () => void;
  onConfirm: (target1Id: string, target2Id: string) => void;
};

export function DuConSelectModal({ visible, players, selfId, onClose, onSkip, onConfirm }: Props) {
  const [selected, setSelected] = useState<string[]>([]);

  const options = useMemo(
    () => players.filter(p => p.isAlive && p.id !== selfId),
    [players, selfId]
  );

  const toggle = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  };

  const handleConfirm = () => {
    if (selected.length !== 2) return;
    onConfirm(selected[0], selected[1]);
    setSelected([]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 }}>
        <View style={{ backgroundColor: '#111827', borderRadius: 12, padding: 16, maxHeight: '80%' }}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>Du Con - Chon 2 muc tieu</Text>
          <Text style={{ color: '#9CA3AF', marginTop: 6 }}>Da chon: {selected.length}/2</Text>

          <ScrollView style={{ marginTop: 12 }}>
            {options.map(p => {
              const isSelected = selected.includes(p.id);
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => toggle(p.id)}
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
                setSelected([]);
                onSkip();
              }}
              style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#4B5563', alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Bỏ qua</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={selected.length !== 2}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 8,
                backgroundColor: selected.length === 2 ? '#10B981' : '#374151',
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
