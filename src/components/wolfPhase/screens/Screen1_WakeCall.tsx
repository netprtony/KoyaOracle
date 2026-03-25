import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { WolfTheme } from '../../../styles/wolfPhaseTheme';
import { WolfAvatarRow, ConfirmButton } from '../components';
import { useGameStore } from '../../../store/gameStore';
import { useWolfPhaseUIStore } from '../../../store/wolfPhaseUIStore';

interface Screen1Props {
  onBack?: () => void;
  onSkip?: () => void;
}

export function Screen1_WakeCall({ onBack, onSkip }: Screen1Props) {
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

  const activeWolvesCount = wolves.length - asleepWolfIds.length;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        indicatorStyle="white"
        nestedScrollEnabled
      >
        <View style={styles.content}>
          <Text style={styles.upperLabel}>
            ĐÊM {session.currentPhase.number} &nbsp;·&nbsp; GIAI ĐOẠN ĐÊM
          </Text>
          
          <View style={styles.wolfCircle}>
            <Text style={styles.wolfCircleText}>SOI</Text>
          </View>

          <Text style={styles.title}>BẦY SÓI</Text>
          <Text style={styles.subtitle}>THỨC DẬY</Text>
          
          <View style={styles.divider} />
          
          <Text style={styles.infoText}>
            {activeWolvesCount} đang thức &nbsp;·&nbsp; {asleepWolfIds.length > 0 ? 'Nanh Sói ngủ đêm nay' : 'Cả bầy đều thức'}
          </Text>

          <WolfAvatarRow wolves={wolves} asleepWolfIds={asleepWolfIds} />
        </View>

        <View style={styles.footer}>
          <ConfirmButton title="Tiếp theo ›" onPress={() => setStep(1)} />
          
          <View style={styles.secondaryActions}>
            {onBack && (
              <TouchableOpacity style={styles.actionBtnSmall} onPress={onBack}>
                <Text style={styles.actionBtnText}>‹ Quay lại</Text>
              </TouchableOpacity>
            )}
            {onSkip && (
              <TouchableOpacity style={styles.actionBtnSmall} onPress={onSkip}>
                <Text style={styles.actionBtnText}>Bỏ qua đêm nay</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  content: {
    alignItems: 'center',
    paddingTop: 10,
  },
  upperLabel: {
    fontSize: 11,
    color: WolfTheme.text.muted,
    letterSpacing: 3,
    marginBottom: 18,
  },
  wolfCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
    borderColor: WolfTheme.accent.wolf,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  wolfCircleText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#C8B8A8',
    letterSpacing: 2,
  },
  title: {
    fontSize: 27,
    fontWeight: '500',
    color: WolfTheme.text.primary,
    letterSpacing: 5,
  },
  subtitle: {
    fontSize: 27,
    fontWeight: '500',
    color: WolfTheme.accent.wolf,
    letterSpacing: 5,
    marginTop: 2,
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: WolfTheme.accent.wolf,
    marginVertical: 12,
  },
  infoText: {
    fontSize: 11,
    color: WolfTheme.text.muted,
    marginBottom: 16,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 14,
    gap: 12,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
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
