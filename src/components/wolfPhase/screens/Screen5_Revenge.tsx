import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { WolfTheme } from '../../../styles/wolfPhaseTheme';
import { TargetGrid, TargetCell, ConfirmButton, RevengeBanner } from '../components';
import { useGameStore } from '../../../store/gameStore';
import { useWolfPhaseUIStore } from '../../../store/wolfPhaseUIStore';

interface Screen5_RevengeProps {
    onConfirm: (targets: string[]) => void;
}

export function Screen5_Revenge({ onConfirm }: Screen5_RevengeProps) {
  const { session } = useGameStore();
  const { revengeTargets, toggleRevTarget, setStep } = useWolfPhaseUIStore();

  if (!session) return null;

  // Filter eligible targets (alive, not on wolf team)
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

  const isReady = revengeTargets.length === 2;

  return (
    <View style={styles.container}>
      <RevengeBanner />
      
      <View style={styles.countRow}>
        <Text style={styles.countLabel}>Chọn 2 mục tiêu</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{revengeTargets.length} / 2</Text>
        </View>
      </View>
      
      <View style={styles.listWrapper}>
        <FlatList 
          style={styles.list}
          contentContainerStyle={{ paddingBottom: 20, flexGrow: 1, paddingHorizontal: 8 }}
          data={eligibleTargets.length > 0 ? eligibleTargets : ([] as typeof eligibleTargets)}
          numColumns={2}
          keyExtractor={item => item.id}
          scrollEnabled={true}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          decelerationRate="fast"
          bounces={true}
          overScrollMode="auto"
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => {
            if (!item.id) {
              return <Text style={{ color: '#484858', textAlign: 'center', marginTop: 20, width: '100%' }}>Không có mục tiêu hợp lệ</Text>;
            }
            return (
              <View style={styles.gridItemWrapper}>
                <TargetCell
                  index={eligibleTargets.indexOf(item) + 1}
                  name={item.name || `Người chơi ${eligibleTargets.indexOf(item) + 1}`}
                  selected={revengeTargets.includes(item.id)}
                  revengeMode={true}
                  onPress={() => toggleRevTarget(item.id)}
                />
              </View>
            );
          }}
          ListEmptyComponent={<Text style={{ color: '#484858', textAlign: 'center', marginTop: 20, width: '100%' }}>Không có mục tiêu hợp lệ</Text>}
        />
      </View>

      <View style={styles.footer}>
        <ConfirmButton 
          title="Xác nhận 2 mục tiêu" 
          onPress={() => isReady && onConfirm(revengeTargets)} 
          disabled={!isReady}
        />
        
        <View style={styles.secondaryActions}>
          <TouchableOpacity style={styles.actionBtnSmall} onPress={() => setStep(1)}>
            <Text style={styles.actionBtnText}>‹ Quay lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  countLabel: {
    fontSize: 11,
    color: WolfTheme.text.muted,
  },
  countBadge: {
    backgroundColor: '#180808',
    borderWidth: 1,
    borderColor: '#261010',
    paddingVertical: 2,
    paddingHorizontal: 9,
    borderRadius: 5,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: WolfTheme.text.primary,
  },
  listWrapper: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  gridItemWrapper: {
    width: '50%',
    padding: 4,
  },
  footer: {
    marginTop: 10,
    gap: 12,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionBtnSmall: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#242432',
    borderRadius: 10,
  },
  actionBtnText: {
    color: '#585868',
    fontSize: 12,
    fontWeight: '500',
  },
});
