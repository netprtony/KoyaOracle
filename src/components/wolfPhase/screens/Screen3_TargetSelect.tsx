import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { WolfTheme } from '../../../styles/wolfPhaseTheme';
import { TargetGrid, TargetCell, ConfirmButton } from '../components';
import { useGameStore } from '../../../store/gameStore';
import { useWolfPhaseUIStore } from '../../../store/wolfPhaseUIStore';

interface Screen3_TargetSelectProps {
    onConfirm: (targetId: string) => void;
}

export function Screen3_TargetSelect({ onConfirm }: Screen3_TargetSelectProps) {
  const { session } = useGameStore();
  const { selectedTarget, selectTarget, setStep } = useWolfPhaseUIStore();

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
      <View style={styles.header}>
        <Text style={styles.headerLabel}>BÀN LUẬN & CHỌN MỒI</Text>
        <Text style={styles.title}>Đêm nay giết ai?</Text>
      </View>
      
      <ScrollView 
        style={styles.list} 
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
        indicatorStyle="white"
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
          <Text style={{ color: '#888898', textAlign: 'center', marginTop: 40, fontSize: 16 }}>
            Không có mục tiêu nào hợp lệ
          </Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.statusBox}>
           <Text style={[styles.statusLabel, selectedPlayer && { color: WolfTheme.accent.wolf }]}>
             {selectedPlayer ? 'ĐÃ CHỌN MỤC TIÊU:' : 'CHƯA CHỌN MỤC TIÊU'}
           </Text>
           {selectedPlayer && (
             <Text style={styles.targetNameDisplay}>{selectedPlayer.name}</Text>
           )}
        </View>

        <ConfirmButton 
          title="Xác nhận" 
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
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E01E1E',
    letterSpacing: 2.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  list: {
    flex: 1,
    marginHorizontal: -8, // compensate for grid padding
  },
  listContent: {
    paddingHorizontal: 8,
    paddingBottom: 40,
  },
  footer: {
    paddingTop: 16,
    borderTopWidth: 1.5,
    borderTopColor: '#242432',
    gap: 12,
  },
  statusBox: {
    backgroundColor: '#161620',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#242432',
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#585868',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  targetNameDisplay: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
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
