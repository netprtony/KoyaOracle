import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { WolfTheme } from '../../../styles/wolfPhaseTheme';
import { ConfirmButton, TargetCell } from '../components';
import { useGameStore } from '../../../store/gameStore';
import { useWolfPhaseUIStore } from '../../../store/wolfPhaseUIStore';

interface Screen3_TargetSelectProps {
  onConfirm: (targetId: string) => void;
}

export function Screen3_TargetSelect({ onConfirm }: Screen3_TargetSelectProps) {
  const { session } = useGameStore();
  const { selectedTarget, selectTarget, setStep } = useWolfPhaseUIStore();

  if (!session) return null;

  const eligibleTargets = session.players.filter(p =>
    p.isAlive &&
    p.roleId !== 'soi' &&
    p.roleId !== 'soi_con' &&
    p.roleId !== 'soi_don_doc' &&
    p.roleId !== 'nanh_soi' &&
    p.roleId !== 'soi_an_chay' &&
    p.roleId !== 'soi_trum' &&
    !p.isTraitor
  );

  const handleSelect = (playerId: string) => {
    if (selectedTarget === playerId) {
      selectTarget(null);
    } else {
      selectTarget(playerId);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>BÀN LUẬN & CHỌN MỒI</Text>
        <Text style={styles.title}>Đêm nay giết ai?</Text>
        <Text style={styles.subtitle}>Chạm để chọn mục tiêu · {eligibleTargets.length} người hợp lệ</Text>
      </View>

      {/* Target Grid */}
      <View style={styles.listWrapper}>
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={eligibleTargets}
          numColumns={2}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            // Lấy số ghế thực tế (1-based index trong session.players)
            const seatNumber = session.players.findIndex(p => p.id === item.id) + 1;
            return (
              <TargetCell
                index={seatNumber}
                name={item.name}
                selected={selectedTarget === item.id}
                revengeMode={false}
                onPress={() => handleSelect(item.id)}
              />
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Không tìm thấy mục tiêu hợp lệ</Text>
          }
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <ConfirmButton
          title="Xác nhận mục tiêu"
          onPress={() => selectedTarget && onConfirm(selectedTarget)}
          disabled={!selectedTarget}
        />

        <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
          <Text style={styles.backBtnText}>‹ QUAY LẠI DANH SÁCH BẦY</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 16,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#E01E1E',
    letterSpacing: 2.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: WolfTheme.text.muted,
    letterSpacing: 0.5,
  },

  // List
  listWrapper: {
    flex: 1,
    marginHorizontal: -8, // Compensate for item padding
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
    paddingHorizontal: 4,
  },
  emptyText: {
    color: '#484858',
    textAlign: 'center',
    marginTop: 40,
    fontStyle: 'italic',
  },

  // Footer
  footer: {
    paddingTop: 16,
    borderTopWidth: 1.5,
    borderTopColor: '#242432',
    gap: 8,
  },
  backBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    color: '#585868',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});