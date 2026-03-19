import { View, Text, TouchableOpacity } from 'react-native';
import { useGameMasterState } from '../src/components/game-master/hooks/useGameMasterState';
import { gameMasterStyles as styles } from '../src/components/game-master/gameMasterStyles';
import { NightPhase } from '../src/components/game-master/NightPhase';
import { DayPhase } from '../src/components/game-master/DayPhase';
import { GameSidebar } from '../src/components/game-master/GameSidebar';
import { GameMasterModals } from '../src/components/game-master/GameMasterModals';

export default function GameMasterBoardScreen() {
  const state = useGameMasterState();

  const {
    session, isNightPhase, nightSequence, currentRoleIndex,
    roleTimerDuration, isPhysicalCardMode, isNight1,
    shouldShowRoleAssignment,
    availableRoles, alivePlayers, lynchedPlayer,
    daySubPhase, setDaySubPhase, timeRemaining, isTimerRunning, setIsTimerRunning,
    lynchTarget, setLynchTarget,
    isSidebarOpen, setIsSidebarOpen,
    getRoleQuantity,
    handlePreviousRole, handleNextRole,
    handleJumpToNightRole,
    handleOpenRoleAssign,
    setShowPlayerListModal, setShowDualActionModal,
    handleOpenSkillModal, setShowRoleDesc,
    handleStartDiscussion, handleConfirmLynch,
    handleAfterAnnouncement, handleNextNight,
    handlePauseGame, handleRestartGame, handleEndGame,
    handleOpenOrderSettings, handleOpenTimerSettings,
  } = state;

  if (!session) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.phaseIndicator}>
            {isNightPhase ? `\u0110\u00caM ${session.currentPhase.number}` : `NG\u00c0Y ${session.currentPhase.number}`}
          </Text>
        </View>
        <TouchableOpacity style={styles.logIconBtn} onPress={() => setIsSidebarOpen(true)}>
          <Text style={styles.headerIcon}>\u2630</Text>
        </TouchableOpacity>
      </View>

      {/* BODY */}
      <View style={styles.body}>
        {isNightPhase ? (
          <NightPhase
            session={session}
            availableRoles={availableRoles}
            nightSequence={nightSequence}
            currentRoleIndex={currentRoleIndex}
            roleTimerDuration={roleTimerDuration}
            isPhysicalCardMode={isPhysicalCardMode}
            isNight1={isNight1}
            shouldShowRoleAssignment={shouldShowRoleAssignment}
            getRoleQuantity={getRoleQuantity}
            onPreviousRole={handlePreviousRole}
            onNextRole={handleNextRole}
            onJumpToRole={handleJumpToNightRole}
            onOpenRoleAssign={handleOpenRoleAssign}
            onShowPlayerList={() => setShowPlayerListModal(true)}
            onShowDualAction={() => setShowDualActionModal(true)}
            onOpenSkillModal={() => handleOpenSkillModal()}
            onShowRoleDesc={() => setShowRoleDesc(true)}
          />
        ) : (
          <DayPhase
            subPhase={daySubPhase}
            phaseNumber={session.currentPhase.number}
            timeRemaining={timeRemaining}
            isTimerRunning={isTimerRunning}
            onStartDiscussion={handleStartDiscussion}
            onToggleTimer={() => setIsTimerRunning(!isTimerRunning)}
            onStartVoting={() => setDaySubPhase('VOTING')}
            onAfterAnnouncement={handleAfterAnnouncement}
            onNextNight={handleNextNight}
            lynchedPlayer={lynchedPlayer || null}
            alivePlayers={alivePlayers}
            lynchTarget={lynchTarget}
            onSelectLynchTarget={(id) => setLynchTarget(id)}
            onConfirmLynch={handleConfirmLynch}
            onSkipLynch={() => {
              setLynchTarget(null);
              setDaySubPhase('ANNOUNCEMENT');
            }}
          />
        )}
      </View>

      {/* SIDEBAR */}
      <GameSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onPause={handlePauseGame}
        onRestart={handleRestartGame}
        onEndGame={handleEndGame}
        onOpenOrderSettings={handleOpenOrderSettings}
        onOpenTimerSettings={handleOpenTimerSettings}
        matchLog={session.matchLog}
      />

      {/* ALL MODALS */}
      <GameMasterModals {...state} />
    </View>
  );
}
