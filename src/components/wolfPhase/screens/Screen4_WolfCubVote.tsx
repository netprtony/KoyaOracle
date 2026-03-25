import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { WolfTheme } from '../../../styles/wolfPhaseTheme';
import { VoteRow, VoteCounter, ConfirmButton } from '../components';
import { useGameStore } from '../../../store/gameStore';
import { useWolfPhaseUIStore } from '../../../store/wolfPhaseUIStore';

interface Screen4_WolfCubVoteProps {
    onConfirm: (wolfCubId: string) => void;
}

export function Screen4_WolfCubVote({ onConfirm }: Screen4_WolfCubVoteProps) {
  const { session } = useGameStore();
  const { votes, toggleVote, setStep } = useWolfPhaseUIStore();

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

  const activeWolves = wolves.filter(w => !(w.roleId === 'nanh_soi' && wolves.length > 1));
  const wolfCub = activeWolves.find(w => w.roleId === 'soi_con');

  // Sói Con pre-voted
  const currentVotesCount = activeWolves.filter(w => w.roleId === 'soi_con' || votes[w.id]).length;
  const isComplete = currentVotesCount === activeWolves.length;

  const getRoleName = (roleId: string | null) => {
    switch (roleId) {
      case 'soi': return 'Werewolf';
      case 'soi_con': return 'Wolf Cub';
      case 'soi_don_doc': return 'Lone Wolf';
      case 'nanh_soi': return 'Alpha Wolf';
      case 'soi_an_chay': return 'Vegetarian Wolf';
      case 'soi_trum': return 'Big Bad Wolf';
      default: return 'Sói';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerLabel}>BIỂU QUYẾT</Text>
      <Text style={styles.title}>Trừng phạt Sói Con</Text>
      <Text style={styles.subtitle}>Cần toàn bộ bầy đồng ý. Sói Con đã tự đồng ý.</Text>
      
      <View style={styles.listWrapper}>
        <ScrollView 
          style={styles.list} 
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
        >
          {activeWolves.map(wolf => (
            <VoteRow
              key={wolf.id}
              name={wolf.name}
              roleName={getRoleName(wolf.roleId)}
              voted={wolf.roleId === 'soi_con' ? true : !!votes[wolf.id]}
              isWolfCub={wolf.roleId === 'soi_con'}
              onToggle={() => toggleVote(wolf.id)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <VoteCounter current={currentVotesCount} total={activeWolves.length} />
        
        <ConfirmButton 
          title="Xác nhận trừng phạt" 
          onPress={() => wolfCub && onConfirm(wolfCub.id)} 
          disabled={!isComplete}
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
  headerLabel: {
    fontSize: 11,
    color: WolfTheme.text.muted,
    letterSpacing: 2,
    marginBottom: 5,
  },
  title: {
    fontSize: 17,
    fontWeight: '500',
    color: WolfTheme.text.primary,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 11,
    color: WolfTheme.text.muted,
    marginBottom: 14,
    lineHeight: 15,
  },
  list: {
    flex: 1,
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 20,
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
