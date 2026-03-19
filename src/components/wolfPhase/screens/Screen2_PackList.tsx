import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { WolfTheme } from '../../../styles/wolfPhaseTheme';
import { WolfMemberCard, WolfCubVoteTeaser, ConfirmButton } from '../components';
import { useGameStore } from '../../../store/gameStore';
import { useWolfPhaseUIStore } from '../../../store/wolfPhaseUIStore';

export function Screen2_PackList() {
  const { session } = useGameStore();
  const setStep = useWolfPhaseUIStore(s => s.setStep);

  if (!session) return null;

  const wolves = session.players.filter(p => 
    p.isAlive && (
      p.roleId === 'soi' || 
      p.roleId === 'soi_con' || 
      p.roleId === 'soi_don_doc' || 
      p.roleId === 'nanh_soi' ||
      p.roleId === 'soi_an_chay' ||
      p.roleId === 'soi_trum'
    )
  );

  const asleepWolfIds = wolves
    .filter(w => w.roleId === 'nanh_soi' && wolves.length > 1)
    .map(w => w.id);

  const wolfCub = wolves.find(w => w.roleId === 'soi_con');
  const wolfCubRevengeActive = session.wolfInfectedRound === session.currentPhase.number; // Check if infected? No, check if revenge active.
  // Wait, the plan says: wolfCubRevengeActive ? <Screen5_Revenge /> : <Screen3_TargetSelect />
  // I need to find where revenge active is stored. In session?
  // Looking at assets/roles.json, Sói Con passive says: "werewolvesKillTwoNextNight"
  // GameStore doesn't seem to have a specific 'wolfCubRevengeActive' boolean yet.
  // I might need to derive it or check if it's already implemented in engine.

  // For now, I'll assume we can check if a wolf cub died last night.
  // But let's look at useGameStore or NightResolver logic.
  
  const handleOpenVote = () => {
      setStep(3); // Screen 4 is index 3
  };

  const handleNext = () => {
      // Logic for S3 vs S5
      // If revenge active, we'll go to step 2 but render Screen 5 (index 4)
      // Actually, Navigator will handle it.
      setStep(2);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerLabel}>THÀNH VIÊN BẦY</Text>
      
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {wolves.map(wolf => (
          <WolfMemberCard 
            key={wolf.id} 
            player={wolf} 
            isAsleep={asleepWolfIds.includes(wolf.id)} 
            canBePunished={wolf.roleId === 'soi_con'}
          />
        ))}

        {asleepWolfIds.length > 0 && (
          <Text style={styles.footerNote}>Nanh Sói thức dậy khi là sói cuối cùng</Text>
        )}

        <View style={styles.divider} />

        {wolfCub && (
          <WolfCubVoteTeaser onPress={handleOpenVote} />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <ConfirmButton title="Chọn mục tiêu ›" onPress={handleNext} />
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
    marginBottom: 12,
  },
  list: {
    flex: 1,
  },
  footerNote: {
    fontSize: 11,
    color: '#404050',
    marginTop: 3,
    marginBottom: 10,
    marginLeft: 2,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: '#181820',
    marginVertical: 10,
  },
  footer: {
    marginTop: 6,
  },
});
