import React, { useEffect } from 'react';
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
  onBack?: () => void;
  onSkip?: () => void;
  isPhysicalCardMode?: boolean;
  onOpenRoleAssign?: (roleId: string) => void;
}

export function WolfPhaseNavigator({ 
  onComplete, 
  onBack, 
  onSkip, 
  isPhysicalCardMode, 
  onOpenRoleAssign 
}: WolfPhaseNavigatorProps) {
  const { step, reset, setStep } = useWolfPhaseUIStore();
  const { session, recordNightAction } = useGameStore();

  useEffect(() => {
    // Reset UI state when component mounts (start of wolf phase)
    reset();
  }, []);

  useEffect(() => {
    // Disable Android back button during wolf phase
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // If we're at the first step, we can use onBack if provided
      if (step === 0 && onBack) {
        onBack();
        return true;
      }
      // Must use explicit "Cancel" or "Back" buttons in UI
      return true; 
    });
    
    return () => {
      backHandler.remove();
    };
  }, [step, onBack]);

  if (!session) return null;

  // Check for revenge night log entry from previous night
  const isRevengeNight = session.matchLog.some(l => 
    l.type === 'GAME_EVENT' && 
    l.message.includes('Bầy sói được giết 2 người') && 
    l.metadata?.round === session.currentPhase.number - 1
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
      case 0: return <Screen1_WakeCall onBack={onBack} onSkip={onSkip} />;
      case 1: return <Screen2_PackList isPhysicalCardMode={isPhysicalCardMode} onOpenRoleAssign={onOpenRoleAssign} />;
      case 2: 
        return isRevengeNight ? (
          <Screen5_Revenge onConfirm={handleConfirmRevenge} />
        ) : (
          <Screen3_TargetSelect onConfirm={handleConfirmKill} />
        );
      case 3: return <Screen4_WolfCubVote onConfirm={handleConfirmWolfCubVote} />;
      default: return <Screen1_WakeCall onBack={onBack} onSkip={onSkip} />;
    }
  };

  return (
    <View style={styles.container}>
      <WolfPhaseHeader 
        step={step === 2 && isRevengeNight ? 4 : (step > 3 ? 0 : step)} 
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
