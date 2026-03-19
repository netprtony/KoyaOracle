import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { WolfTheme } from '../../../styles/wolfPhaseTheme';
import { TargetGrid, TargetCell, ConfirmButton, RevengeBanner } from '../components';
import { useGameStore } from '../../../store/gameStore';
import { useWolfPhaseUIStore } from '../../../store/wolfPhaseUIStore';

interface Screen5_RevengeProps {
    onConfirm: (targets: string[]) => void;
}

export function Screen5_Revenge({ onConfirm }: Screen5_RevengeProps) {
  const { session } = useGameStore();
  const { revengeTargets, toggleRevTarget } = useWolfPhaseUIStore();

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
      
      <ScrollView 
        style={styles.list} 
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <TargetGrid>
          {eligibleTargets.map((player, index) => (
            <TargetCell
              key={player.id}
              index={index + 1}
              name={player.name || `Người chơi ${index + 1}`}
              selected={revengeTargets.includes(player.id)}
              revengeMode={true}
              onPress={() => toggleRevTarget(player.id)}
            />
          ))}
        </TargetGrid>
        {eligibleTargets.length === 0 && (
          <Text style={{ color: '#484858', textAlign: 'center', marginTop: 20 }}>
            Không có mục tiêu hợp lệ
          </Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <ConfirmButton 
          title="Xác nhận 2 mục tiêu" 
          onPress={() => isReady && onConfirm(revengeTargets)} 
          disabled={!isReady}
        />
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
  list: {
    flex: 1,
  },
  footer: {
    marginTop: 10,
  },
});
