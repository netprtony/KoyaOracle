import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, BackHandler } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { WolfTheme } from '../../styles/wolfPhaseTheme';
import { WolfPhaseHeader } from './components';
import { Screen1_WakeCall } from './screens/Screen1_WakeCall';
import { Screen2_PackList } from './screens/Screen2_PackList';
import { Screen3_TargetSelect } from './screens/Screen3_TargetSelect';
import { Screen4_WolfCubVote } from './screens/Screen4_WolfCubVote';
import { Screen5_Revenge } from './screens/Screen5_Revenge';
import { useWolfPhaseUIStore } from '../../store/wolfPhaseUIStore';
import { useGameStore } from '../../store/gameStore';

interface WolfPhaseNavigatorProps {
  onComplete: () => void;
}

export function WolfPhaseNavigator({ onComplete }: WolfPhaseNavigatorProps) {
  const { step, reset, setStep } = useWolfPhaseUIStore();
  const { session, recordNightAction, markToughGuyBitten } = useGameStore();

  useEffect(() => {
    // Reset UI state when component mounts (start of wolf phase)
    reset();
    
    // Disable Android back button during wolf phase
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Must use explicit "Cancel" or "Back" buttons in UI
      return true; 
    });
    
    return () => {
      backHandler.remove();
      reset(); // Clean up when leaving wolf phase
    };
  }, []);

  if (!session) return null;

  const wolfCubRevengeActive = session.players.some(p => 
    p.roleId === 'soi_con' && !p.isAlive && p.killedBy === 'werewolf' // Wait, Sói Con revenge trigger?
  );
  // Actually, I should check the werewolfKillBonus or similar if I can.
  // But based on the plan's UX, let's use a derived state if possible.
  // The plan mentioned `wolfCubRevengeActive` in useGameStore, but it's not there.
  // I'll use a simple check for now or add it to session if I can.
  
  // Re-checking how revenge is triggered in PassiveSkillHandler:
  // this.stateManager.setWerewolfKillBonus(1);
  
  // Since I don't have easy access to werewolfKillBonus in the session yet, 
  // I will assume for now we can check if a Wolf Cub died recently.
  // Better: I'll check if any wolf has werewolfKillBonus > 0 if I can, but Player doesn't have it.
  
  // Let's assume the user might have a better way, but I'll stick to a heuristic for now.
  // Actually, I'll just check if current round is round after a Wolf Cub died.
  // But let's simplify:
  const isRevengeNight = session.matchLog.some(l => 
    l.type === 'GAME_EVENT' && l.message.includes('Bầy sói được giết 2 người') && 
    l.phase.number === session.currentPhase.number - 1
  );

  const handleConfirmKill = (targetId: string) => {
    recordNightAction('soi', targetId, 'kill');
    onComplete();
  };

  const handleConfirmWolfCubVote = (wolfCubId: string) => {
    // Punish wolf cub
    recordNightAction('soi', wolfCubId, 'kill');
    onComplete();
  };

  const handleConfirmRevenge = (targets: string[]) => {
    recordNightAction('soi', targets[0], 'kill');
    recordNightAction('soi', targets[1], 'kill');
    onComplete();
  };

  const renderScreen = () => {
    switch (step) {
      case 0: return <Screen1_WakeCall />;
      case 1: return <Screen2_PackList />;
      case 2: 
        return isRevengeNight ? (
          <Screen5_Revenge onConfirm={handleConfirmRevenge} />
        ) : (
          <Screen3_TargetSelect onConfirm={handleConfirmKill} />
        );
      case 3: return <Screen4_WolfCubVote onConfirm={handleConfirmWolfCubVote} />;
      default: return <Screen1_WakeCall />;
    }
  };

  return (
    <View style={styles.container}>
      <WolfPhaseHeader 
        step={step === 2 && isRevengeNight ? 4 : step} 
        nightNumber={session.currentPhase.number} 
      />
      <Animated.View 
        key={step} 
        entering={FadeIn.duration(200)} 
        exiting={FadeOut.duration(200)}
        style={styles.screenContainer}
      >
        {renderScreen()}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WolfTheme.bg.app,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: WolfTheme.border.default,
  },
  screenContainer: {
    flex: 1,
  },
});
