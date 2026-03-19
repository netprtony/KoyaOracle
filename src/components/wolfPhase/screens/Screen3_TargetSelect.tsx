import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { WolfTheme } from '../../../styles/wolfPhaseTheme';
import { TargetGrid, TargetCell, ConfirmButton } from '../components';
import { useGameStore } from '../../../store/gameStore';
import { useWolfPhaseUIStore } from '../../../store/wolfPhaseUIStore';

interface Screen3_TargetSelectProps {
    onConfirm: (targetId: string) => void;
}

export function Screen3_TargetSelect({ onConfirm }: Screen3_TargetSelectProps) {
  const { session } = useGameStore();
  const { selectedTarget, selectTarget } = useWolfPhaseUIStore();

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
    !p.isTraitor // Traitor is on wolf team but hidden
  );

  const selectedPlayer = eligibleTargets.find(p => p.id === selectedTarget);

  return (
    <View style={styles.container}>
      <Text style={styles.headerLabel}>CHỌN MỤC TIÊU</Text>
      <Text style={styles.hint}>Chạm để chọn &nbsp;·&nbsp; 1 người</Text>
      
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
              selected={selectedTarget === player.id}
              revengeMode={false}
              onPress={() => selectTarget(player.id)}
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
        <Text style={[styles.statusText, selectedPlayer && { color: WolfTheme.accent.wolf }]}>
          {selectedPlayer ? `Mục tiêu: ${selectedPlayer.name}` : 'Chưa chọn mục tiêu'}
        </Text>
        <ConfirmButton 
          title="Xác nhận" 
          onPress={() => selectedTarget && onConfirm(selectedTarget)} 
          disabled={!selectedTarget}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerLabel: {
    fontSize: 11,
    color: WolfTheme.text.muted,
    letterSpacing: 2,
    marginBottom: 3,
  },
  hint: {
    fontSize: 11,
    color: WolfTheme.text.ghost,
    marginBottom: 11,
  },
  list: {
    flex: 1,
  },
  footer: {
    marginTop: 10,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    color: '#404050',
    textAlign: 'center',
    marginBottom: 6,
  },
});
