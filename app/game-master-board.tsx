import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useGameStore } from '../src/store/gameStore';
import { useRouter } from 'expo-router';
import { getNightSequence } from '../src/engine/nightSequence';
import { getPhaseDisplay } from '../src/engine/phaseController';
import { getRoleManager } from '../src/engine/RoleManager';
import { DaySubPhase, NightOrderDefinition } from '../src/types';
import { NightAction } from '../assets/role-types';
import { SwipeEffect } from '../src/components/SwipeableCardStack';
import { SwipeEffectPicker } from '../src/components/SwipeEffectPicker';
import { TimerSettingsPicker } from '../src/components/TimerSettingsPicker';
import { NightOrderEditor } from '../src/components/NightOrderEditor';
import { MorningReportModal } from '../src/components/MorningReportModal';
import { SeerInvestigationResultModal } from '../src/components/SeerInvestigationResultModal';
import { HunterRevengeModal } from '../src/components/HunterRevengeModal';
import { VictoryModal } from '../src/components/VictoryModal';
import { resolveNightEvents } from '../src/engine/NightResolution';
import { WinResult } from '../src/engine/WinConditionChecker';

// New Components
import { gameMasterStyles as styles } from '../src/components/game-master/gameMasterStyles';
import { getSkillDisplay } from '../src/components/game-master/constants';
import { NightPhase } from '../src/components/game-master/NightPhase';
import { DayPhase } from '../src/components/game-master/DayPhase';
import { GameSidebar } from '../src/components/game-master/GameSidebar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_DISCUSSION_TIME = 180; // 3 minutes

export default function GameMasterBoardScreen() {
  const {
    session,
    availableRoles,
    availableScenarios,
    recordNightAction,
    clearNightActionForRole,
    advanceToDay,
    processNightDeaths,
    processDeathWithCause,
    lynchPlayer,
    advanceToNight,
    assignRole,
    clearGame,
    initializeGame,
    updateNightOrder,
  } = useGameStore();

  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [showLogPanel, setShowLogPanel] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  const [showRoleDesc, setShowRoleDesc] = useState(false);
  const [showPlayerListModal, setShowPlayerListModal] = useState(false);
  const [showOrderSettings, setShowOrderSettings] = useState(false);

  // Role Assignment Modal States (Night 1 - Physical Card)
  const [showRoleAssignModal, setShowRoleAssignModal] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  
  // View Role Modal States (Night 2+ - Physical Card)
  const [showViewRoleModal, setShowViewRoleModal] = useState(false);
  const [viewingRole, setViewingRole] = useState<{ name: string; icon?: string } | null>(null);
  
  // Day sub-phase state
  const [daySubPhase, setDaySubPhase] = useState<DaySubPhase>('SUNRISE');
  const [discussionTime, setDiscussionTime] = useState(DEFAULT_DISCUSSION_TIME);
  const [timeRemaining, setTimeRemaining] = useState(DEFAULT_DISCUSSION_TIME);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [lynchTarget, setLynchTarget] = useState<string | null>(null);
  
  // Skill Modal States
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [skillTargets, setSkillTargets] = useState<string[]>([]);
  const [activeActionType, setActiveActionType] = useState<string | undefined>(undefined);
  
  // Morning Report State
  const [morningReportVisible, setMorningReportVisible] = useState(false);
  const [morningMessages, setMorningMessages] = useState<string[]>([]);
  const [pendingDeadIds, setPendingDeadIds] = useState<string[]>([]);
  
  // Seer Investigation State
  const [showSeerResult, setShowSeerResult] = useState(false);
  const [seerInvestigationTarget, setSeerInvestigationTarget] = useState<{ playerId: string; roleId: string | null } | null>(null);
  
  // Hunter Revenge State
  const [showHunterRevenge, setShowHunterRevenge] = useState(false);
  const [hunterRevengeData, setHunterRevengeData] = useState<{ hunterId: string; hunterName: string } | null>(null);
  
  // Victory Modal State
  const [gameWinner, setGameWinner] = useState<WinResult | null>(null);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  
  // Swipe Effect Settings
  const [swipeEffect, setSwipeEffect] = useState<SwipeEffect>('default');
  const [showSwipeEffectPicker, setShowSwipeEffectPicker] = useState(false);
  
  // Timer Settings
  const [roleTimerDuration, setRoleTimerDuration] = useState(300); // 5 minutes default
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  
  // Dual Action Modal (for Witch)
  const [showDualActionModal, setShowDualActionModal] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const viewRoleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer logic
  useEffect(() => {
    return () => clearInterval(timerRef.current!);
  }, []);

  useEffect(() => {
    if (isTimerRunning && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current!);
    }
    return () => clearInterval(timerRef.current!);
  }, [isTimerRunning]);
  
  // Clear view role timer on unmount
  useEffect(() => {
    return () => {
      if (viewRoleTimerRef.current) {
        clearTimeout(viewRoleTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!session) {
      router.replace('/');
    }
  }, [session]);

  if (!session) {
    return <View style={styles.container} />;
  }

  const scenario = availableScenarios.find((s) => s.id === session.scenarioId);
  const isNightPhase = session.currentPhase.type === 'NIGHT';
  const nightSequence = scenario ? getNightSequence(
       scenario, 
       availableRoles, 
       session.currentPhase.number, 
       session.nightOrder
  ) : [];
  
  const currentRole = isNightPhase ? nightSequence[currentRoleIndex] : null;
  const alivePlayers = session.players.filter(p => p.isAlive);

  // Physical Card Mode Detection
  const isPhysicalCardMode = session.mode === 'PHYSICAL_CARD';
  const isNight1 = session.currentPhase.type === 'NIGHT' && session.currentPhase.number === 1;
  const shouldShowRoleAssignment = isPhysicalCardMode && isNight1;
  const shouldShowViewRole = isPhysicalCardMode && !isNight1 && isNightPhase;

  // Helper functions
  const getRoleQuantity = (roleId: string) => {
    const roleDef = scenario?.roles.find(r => r.roleId === roleId);
    return roleDef ? roleDef.quantity : 0;
  };

  const getAssignedPlayersForRole = (roleId: string) => {
    return session.players.filter(p => p.roleId === roleId);
  };

  const isRoleFullyAssigned = (roleId: string) => {
    const quantity = getRoleQuantity(roleId);
    const assignedCount = getAssignedPlayersForRole(roleId).length;
    return assignedCount >= quantity;
  };

  const areAllRolesAssigned = () => {
    return session.players.every(p => p.roleId !== null);
  };

  const roleManager = getRoleManager();

  const getCurrentNightAction = (): NightAction | undefined => {
    if (!currentRole) return undefined;
    const fullRole = roleManager.getRoleById(currentRole.id);
    return fullRole?.skills?.nightAction;
  };

  const getWolfVictim = () => {
    // Only valid in Night phase
    if (session.currentPhase.type !== 'NIGHT') return null;
    
    // session.nightActions contains actions for the current night only
    const wolfAction = [...session.nightActions].reverse().find(a => {
      const role = availableRoles.find(r => r.id === a.roleId);
      // Check if role is werewolf team and action is kill (or default kill)
      return role?.team === 'werewolf' && (a.actionType === 'kill' || !a.actionType);
    });
    
    if (!wolfAction || !wolfAction.targetPlayerId) {
      return null;
    }

    const victimId = wolfAction.targetPlayerId;

    // Check if victim is protected by Bodyguard or Priest THIS NIGHT
    const isProtected = session.nightActions.some(a => {
       // Bodyguard protect
       if (a.actionType === 'protect' && a.targetPlayerId === victimId) return true;
       // Priest bless
       if (a.actionType === 'bless' && a.targetPlayerId === victimId) return true;
       return false;
    });

    if (isProtected) {
       return null; // Victim saved by protection, Witch sees no one dying
    }
    
    return session.players.find(p => p.id === victimId);
  };

  // Win Condition Checking
  const checkWinCondition = () => {
    // Get fresh state explicitly to avoid stale data after state updates
    const currentSession = useGameStore.getState().session;
    const players = currentSession?.players || session.players;
    const allPlayers = players;
    const alivePlayers = players.filter(p => p.isAlive);
    
    // Check individual wins
    for (const player of allPlayers) {
      if (!player.isAlive && player.killedBy === 'execution') {
        const role = availableRoles.find(r => r.id === player.roleId);
        if (role?.winConditions?.primary === 'dieByExecution' || player.roleId === 'ke_chan_doi') {
          const winResult: WinResult = {
            hasWinner: true,
            winnerType: 'individual',
            winner: player.roleId || 'ke_chan_doi',
            winnerPlayerIds: [player.id],
            winCondition: 'dieByExecution',
          };
          setGameWinner(winResult);
          setShowVictoryModal(true);
          return;
        }
      }
    }
    
    // Get team counts
    const aliveWerewolves = alivePlayers.filter(p => {
      const role = availableRoles.find(r => r.id === p.roleId);
      return role?.team === 'werewolf';
    });
    
    const aliveVillagers = alivePlayers.filter(p => {
      const role = availableRoles.find(r => r.id === p.roleId);
      return role?.team === 'villager';
    });
    
    // Werewolf win: wolves >= non-wolves
    // Simplified logic for brevity in refactor, keeping original logic intention
    const nonWerewolves = alivePlayers.filter(p => {
       const role = availableRoles.find(r => r.id === p.roleId);
       return role?.team !== 'werewolf';
    });

    if (aliveWerewolves.length > 0 && aliveWerewolves.length >= nonWerewolves.length) {
      const winResult: WinResult = {
        hasWinner: true,
        winnerType: 'team',
        winner: 'werewolf',
        winnerPlayerIds: aliveWerewolves.map(p => p.id),
        winCondition: 'werewolfTeamWins',
      };
      setGameWinner(winResult);
      setShowVictoryModal(true);
      return;
    }
    
    // Villager win: all werewolves dead
    if (aliveWerewolves.length === 0 && aliveVillagers.length > 0) {
      const winResult: WinResult = {
        hasWinner: true,
        winnerType: 'team',
        winner: 'villager',
        winnerPlayerIds: aliveVillagers.map(p => p.id),
        winCondition: 'villagerTeamWins',
      };
      setGameWinner(winResult);
      setShowVictoryModal(true);
      return;
    }
  };

  // Skill Modal Handlers
  const handleOpenSkillModal = (actionType?: string) => {
    const nightAction = getCurrentNightAction();
    if (!nightAction) return;
    
    setActiveActionType(actionType);
    setSkillTargets([]);
    setShowSkillModal(true);
  };

  const handleToggleSkillTarget = (playerId: string) => {
    const nightAction = getCurrentNightAction();
    const targetCount = nightAction?.targetCount || 1;
    
    setSkillTargets(prev => {
      const newTargets = prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : prev.length < targetCount
        ? [...prev, playerId]
        : [...prev.slice(1), playerId];
      
      return newTargets;
    });
  };

  const handleConfirmSkillAction = () => {
    const nightAction = getCurrentNightAction();
    if (!currentRole || !nightAction) return;
    const targetCount = nightAction.targetCount || 1;
    
    // Safety check for target selection
    if (skillTargets.length < 1 && targetCount > 0) { 
       Alert.alert('Thiếu mục tiêu', `Cần chọn mục tiêu.`);
       return;
    }

    // Check for 'cannotTargetSamePersonConsecutively' restriction
    if (nightAction.restrictions?.includes('cannotTargetSamePersonConsecutively')) {
      const previousNightNumber = session.currentPhase.number - 1;
      if (previousNightNumber > 0) {
        const lastNightLog = [...session.matchLog].reverse().find(log => 
          log.type === 'ROLE_ACTION' &&
          log.metadata?.roleId === currentRole.id &&
          log.phase?.number === previousNightNumber &&
          log.phase?.type === 'NIGHT'
        );

        if (lastNightLog && lastNightLog.metadata?.targetPlayerId) {
          const lastTargetId = lastNightLog.metadata.targetPlayerId;
          if (skillTargets.includes(lastTargetId)) {
            const lastTargetName = session.players.find(p => p.id === lastTargetId)?.name || 'mục tiêu cũ';
            Alert.alert(
              'Hành động không hợp lệ', 
              `Vai trò này không thể chọn cùng 1 người 2 đêm liên tiếp.\n(Đêm trước đã chọn: ${lastTargetName})`
            );
            return;
          }
        }
      }
    }
    
    recordNightAction(currentRole.id, skillTargets[0] || null, activeActionType);
    
    // Special handling for Seer investigation
    if (currentRole.id === 'tien_tri' && skillTargets[0] && !activeActionType) {
      const targetPlayer = session.players.find(p => p.id === skillTargets[0]);
      if (targetPlayer) {
        setSeerInvestigationTarget({
          playerId: targetPlayer.id,
          roleId: targetPlayer.roleId,
        });
        setShowSeerResult(true);
      }
    }
    
    if (!activeActionType) {
        setSelectedTargetId(skillTargets[0] || null);
    }
    
    setShowSkillModal(false);
    setSkillTargets([]);
    setActiveActionType(undefined);
  };

  // --- NAVIGATION HANDLERS ---
  
  const handleNightEnd = () => {
     // Prepare the report but do not execute changes yet
     const results = resolveNightEvents(
         session.nightActions,
         session.players,
         availableRoles,
         session.players.filter(p => !p.isAlive).map(p => p.id)
     );
     
     setMorningMessages(results.messages);
     setPendingDeadIds(results.deadPlayerIds);
     setMorningReportVisible(true);
  };

  const handleConfirmMorningReport = () => {
     // Process deaths
     if (pendingDeadIds.length > 0) {
         processNightDeaths(pendingDeadIds);
         
         // Check if hunter died - trigger revenge
         const hunterPlayer = session.players.find(p => 
           pendingDeadIds.includes(p.id) && p.roleId === 'tho_san'
         );
         
         if (hunterPlayer) {
           setHunterRevengeData({
             hunterId: hunterPlayer.id,
             hunterName: hunterPlayer.name,
           });
           setShowHunterRevenge(true);
           setMorningReportVisible(false);
           return; 
         }
     }
     
     setMorningReportVisible(false);
     
     // Transition to Day
     advanceToDay();
     setCurrentRoleIndex(0);
     setSelectedTargetId(null);
     setDaySubPhase('SUNRISE');
     
     checkWinCondition();
  };

  const handleNextRole = useCallback(() => {
    if (isNightPhase) {
      // Logic for Night Role Navigation
      if (shouldShowRoleAssignment && currentRole) {
        if (!isRoleFullyAssigned(currentRole.id)) {
          const quantity = getRoleQuantity(currentRole.id);
          const assigned = getAssignedPlayersForRole(currentRole.id).length;
          Alert.alert(
            'Chưa gán đủ người chơi',
            `Vai trò ${currentRole.name} cần ${quantity} người chơi (Hiện tại: ${assigned}).`,
            [{ text: 'OK' }]
          );
          return;
        }
      }

      if (currentRole) {
        // Auto-record current state
        recordNightAction(currentRole.id, selectedTargetId, activeActionType);
      }
      
      if (currentRoleIndex < nightSequence.length - 1) {
        setCurrentRoleIndex(prev => prev + 1);
        setSelectedTargetId(null);
      } else {
        if (isNight1 && isPhysicalCardMode) {
          // Auto-assign logic
          const unassignedPlayers = session.players.filter(p => !p.roleId);
          
          if (unassignedPlayers.length > 0 && scenario) {
             const remainingRoleCounts: {roleId: string, count: number}[] = [];
             
             scenario.roles.forEach(r => {
                const assignedCount = session.players.filter(p => p.roleId === r.roleId).length;
                if (assignedCount < r.quantity) {
                   remainingRoleCounts.push({ roleId: r.roleId, count: r.quantity - assignedCount });
                }
             });

             if (remainingRoleCounts.length === 1 && remainingRoleCounts[0].count === unassignedPlayers.length) {
                const targetRole = remainingRoleCounts[0];
                const targetRoleName = availableRoles.find(r => r.id === targetRole.roleId)?.name || targetRole.roleId;

                unassignedPlayers.forEach(p => assignRole(p.id, targetRole.roleId));
                
                Alert.alert(
                  'Tự động gán',
                  `Đã tự động gán ${unassignedPlayers.length} người chơi còn lại vào vai trò "${targetRoleName}".`,
                  [{ 
                    text: 'OK', 
                    onPress: () => {
                      handleNightEnd();
                    }
                  }]
                );
                return;
             }
          }

          if (!areAllRolesAssigned()) {
            Alert.alert(
              'Chưa gán đủ vai trò',
              'Tất cả người chơi phải được gán vai trò trước khi kết thúc đêm 1.',
              [{ text: 'OK' }]
            );
            return;
          }
        }

        handleNightEnd();
      }
    }
  }, [
    currentRoleIndex, 
    nightSequence.length, 
    currentRole, 
    selectedTargetId, 
    activeActionType,
    isNightPhase, 
    shouldShowRoleAssignment, 
    isNight1, 
    isPhysicalCardMode,
    session,
    scenario,
    availableRoles,
    assignRole, 
    handleNightEnd, 
    recordNightAction
  ]);

  const handlePreviousRole = useCallback(() => {
    if (currentRoleIndex > 0) {
      setCurrentRoleIndex(prev => prev - 1);
      setSelectedTargetId(null);
    }
  }, [currentRoleIndex]);

  // Role Assignment Handlers
  const handleOpenRoleAssign = () => {
    if (currentRole) {
      const assigned = getAssignedPlayersForRole(currentRole.id);
      setSelectedPlayerIds(assigned.map(p => p.id));
      setShowRoleAssignModal(true);
    }
  };

  const handleTogglePlayerSelection = (playerId: string) => {
    if (!currentRole) return;
    
    const quantity = getRoleQuantity(currentRole.id);
    const newSelected = [...selectedPlayerIds];
    const index = newSelected.indexOf(playerId);

    if (index >= 0) {
      newSelected.splice(index, 1);
    } else {
      if (newSelected.length >= quantity) {
        Alert.alert('Đã đủ số lượng', `Vai trò này chỉ được gán tối đa ${quantity} người.`);
        return;
      }
      newSelected.push(playerId);
    }
    setSelectedPlayerIds(newSelected);
  };

  const handleSaveRoleAssignment = () => {
    if (!currentRole) return;

    const quantity = getRoleQuantity(currentRole.id);
    if (selectedPlayerIds.length !== quantity) {
      Alert.alert('Chưa đủ số lượng', `Vui lòng chọn đủ ${quantity} người chơi.`);
      return;
    }

    const currentlyAssigned = getAssignedPlayersForRole(currentRole.id);
    currentlyAssigned.forEach(p => {
      if (!selectedPlayerIds.includes(p.id)) {
        assignRole(p.id, null as any);
      }
    });

    selectedPlayerIds.forEach(pid => {
      assignRole(pid, currentRole!.id);
    });

    setShowRoleAssignModal(false);
  };

  const handleViewRole = () => {
    if (currentRole) {
      setViewingRole({ name: currentRole.name, icon: currentRole.icon });
      setShowViewRoleModal(true);
      
      viewRoleTimerRef.current = setTimeout(() => {
        setShowViewRoleModal(false);
        setViewingRole(null);
      }, 2000);
    }
  };

  const handleCloseViewRole = () => {
    if (viewRoleTimerRef.current) {
      clearTimeout(viewRoleTimerRef.current);
    }
    setShowViewRoleModal(false);
    setViewingRole(null);
  };

  // Day Phase Handlers
  const handleStartDiscussion = () => {
    setDaySubPhase('DISCUSSION');
    setTimeRemaining(discussionTime);
    setIsTimerRunning(true);
  };

  const handleConfirmLynch = () => {
    if (lynchTarget) {
      const lynched = session.players.find(p => p.id === lynchTarget);
      lynchPlayer(lynchTarget);
      
      // Check if lynched player is hunter - trigger revenge
      if (lynched && lynched.roleId === 'tho_san') {
        setHunterRevengeData({
          hunterId: lynched.id,
          hunterName: lynched.name,
        });
        setShowHunterRevenge(true);
      } else {
        setDaySubPhase('ANNOUNCEMENT');
        checkWinCondition();
      }
    }
  };

  const handleAfterAnnouncement = () => {
    setDaySubPhase('SLEEP_TRANSITION');
    setLynchTarget(null);
  };

  const handleNextNight = () => {
    advanceToNight();
    setCurrentRoleIndex(0);
    setSelectedTargetId(null);
  };
  
  // Hunter Revenge Handlers
  const handleHunterShoot = (targetId: string) => {
    if (hunterRevengeData) {
      processDeathWithCause(targetId, 'hunter');
      
      setShowHunterRevenge(false);
      setHunterRevengeData(null);
      
      if (session.currentPhase.type === 'NIGHT') {
        advanceToDay();
        setCurrentRoleIndex(0);
        setSelectedTargetId(null);
        setDaySubPhase('SUNRISE');
      } else {
        setDaySubPhase('ANNOUNCEMENT');
      }
      
      checkWinCondition();
    }
  };
  
  const handleHunterSkip = () => {
    setShowHunterRevenge(false);
    setHunterRevengeData(null);
    
    if (session.currentPhase.type === 'NIGHT') {
      advanceToDay();
      setCurrentRoleIndex(0);
      setSelectedTargetId(null);
      setDaySubPhase('SUNRISE');
    } else {
      setDaySubPhase('ANNOUNCEMENT');
    }
    
    checkWinCondition();
  };

  const lynchedPlayer = lynchTarget ? session.players.find(p => p.id === lynchTarget) : null;

  // --- SIDEBAR HANDLERS ---
  const handlePauseGame = () => {
    setIsTimerRunning(false);
    setIsSidebarOpen(false);
    Alert.alert('Đã tạm dừng', 'Trò chơi (bộ đếm giờ) đã được tạm dừng.', [{ text: 'OK' }]);
  };

  const handleRestartGame = () => {
    Alert.alert(
      'Bắt đầu lại?',
      'Bạn có chắc muốn chơi lại ván này từ đầu? Mọi tiến trình hiện tại sẽ bị xóa.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Chơi lại',
          style: 'destructive',
          onPress: () => {
             const originalPlayers = session.players.map(p => ({
               name: p.name,
               color: p.color
             })).sort((a, b) => {
                 return 0;
             });
             
             // Sort by position to ensure same order
             session.players.sort((a, b) => (a.position || 0) - (b.position || 0));
             
             const playerConfigs = session.players.map(p => ({
                 name: p.name,
                 color: p.color
             }));

             initializeGame(session.mode, session.scenarioId, playerConfigs);
             setIsSidebarOpen(false);
             setDaySubPhase('SUNRISE');
             setCurrentRoleIndex(0);
          }
        }
      ]
    );
  };

  const handleOpenOrderSettings = () => {
    setIsSidebarOpen(false);
    setShowOrderSettings(true);
  };

  const handleOpenSwipeEffectPicker = () => {
    setIsSidebarOpen(false);
    setShowSwipeEffectPicker(true);
  };

  const handleOpenTimerSettings = () => {
    setIsSidebarOpen(false);
    setShowTimerSettings(true);
  };

  const handleSaveOrderSettings = (newOrder: NightOrderDefinition) => {
    updateNightOrder(newOrder);
    setShowOrderSettings(false);
    setCurrentRoleIndex(0);
    Alert.alert("Đã cập nhật", "Thứ tự gọi đêm đã được cập nhật.");
  };

  const handleEndGame = () => {
    Alert.alert(
      'Kết thúc trò chơi?',
      'Bạn có chắc chắn muốn kết thúc và trở về màn hình chính?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Kết thúc', 
          style: 'destructive', 
          onPress: () => {
            clearGame();
            router.replace('/');
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.phaseIndicator}>
            {isNightPhase ? `ĐÊM ${session.currentPhase.number}` : `NGÀY ${session.currentPhase.number}`}
          </Text>
        </View>
        <TouchableOpacity style={styles.logIconBtn} onPress={() => setIsSidebarOpen(true)}>
          <Text style={styles.headerIcon}>☰</Text>
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
            swipeEffect={swipeEffect}
            isPhysicalCardMode={isPhysicalCardMode}
            isNight1={isNight1}
            shouldShowRoleAssignment={shouldShowRoleAssignment}
            shouldShowViewRole={shouldShowViewRole}
            getRoleQuantity={getRoleQuantity}
            onPreviousRole={handlePreviousRole}
            onNextRole={handleNextRole}
            onOpenRoleAssign={handleOpenRoleAssign}
            onViewRole={handleViewRole}
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
        onOpenSwipeEffect={handleOpenSwipeEffectPicker}
        onOpenTimerSettings={handleOpenTimerSettings}
        matchLog={session.matchLog}
      />

      {/* SWIPE EFFECT PICKER */}
      <SwipeEffectPicker
        visible={showSwipeEffectPicker}
        onClose={() => setShowSwipeEffectPicker(false)}
        selectedEffect={swipeEffect}
        onSelectEffect={setSwipeEffect}
      />

      {/* TIMER SETTINGS PICKER */}
      <TimerSettingsPicker
        visible={showTimerSettings}
        onClose={() => setShowTimerSettings(false)}
        selectedDuration={roleTimerDuration}
        onSelectDuration={setRoleTimerDuration}
      />

      {/* MODALS */}
      {/* ROLE DESCRIPTION MODAL */}
      <Modal visible={showRoleDesc} animationType="fade" transparent onRequestClose={() => setShowRoleDesc(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalPanel, { height: 'auto', minHeight: '30%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 30 }}>{currentRole?.icon}</Text>
                <Text style={styles.modalTitle}>{currentRole?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowRoleDesc(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.cardDesc}>{currentRole?.description}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* SKILL TARGET SELECTION MODAL */}
      <Modal visible={showSkillModal} animationType="slide" transparent onRequestClose={() => setShowSkillModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalPanel, { height: '80%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {(() => {
                     const action = getCurrentNightAction();
                     return action ? `${getSkillDisplay(action.type).name}` : 'Chọn mục tiêu';
                  })()}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {(() => {
                     const action = getCurrentNightAction();
                     const targetCount = action?.targetCount || 1;
                     return `Chọn ${skillTargets.length}/${targetCount} mục tiêu`;
                  })()}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowSkillModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {currentRole?.id === 'phu_thuy' && activeActionType === 'heal' ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                   {getWolfVictim() ? (
                      <>
                         <Text style={{ fontSize: 20, color: '#9CA3AF', marginBottom: 20, textAlign: 'center' }}>
                            Người bị sói cắn đêm nay
                         </Text>
                         <View style={[styles.playerRow, { 
                              borderColor: '#EF4444', 
                              backgroundColor: '#450a0a', 
                              borderWidth: 2,
                              width: '100%',
                              justifyContent: 'center',
                              marginBottom: 30
                         }]}>
                             <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#FCA5A5', textAlign: 'center' }}>
                                {getWolfVictim()?.name}
                             </Text>
                         </View>
                         <Text style={{ fontSize: 16, color: '#D1D5DB', textAlign: 'center' }}>
                            Bạn có muốn dùng bình thuốc Cứu không?
                         </Text>
                      </>
                   ) : (
                      <View style={{ alignItems: 'center' }}>
                         <Text style={{ fontSize: 50, marginBottom: 20 }}>🛡️</Text>
                         <Text style={{ fontSize: 20, color: '#10B981', textAlign: 'center' }}>
                            Đêm nay không có ai bị Sói cắn.
                         </Text>
                      </View>
                   )}
                </View>
              ) : (
                alivePlayers.length === 0 ? (
                  <Text style={styles.emptyText}>Không còn người chơi sống sót.</Text>
                ) : (
                  alivePlayers.map(player => {
                    const isSelected = skillTargets.includes(player.id);
                    const action = getCurrentNightAction();
                    const targetCount = action?.targetCount || 1;
                    
                    let isDisabled = false;
                    
                    if (action && !action.canTargetSelf) {
                       const assignedPlayers = getAssignedPlayersForRole(currentRole?.id || '');
                       if (assignedPlayers.some(p => p.id === player.id)) {
                          isDisabled = true;
                       }
                    }
  
                    return (
                      <TouchableOpacity
                        key={player.id}
                        style={[
                          styles.playerRow,
                          isSelected && styles.playerRowSelected,
                          isDisabled && styles.playerRowDisabled,
                          { borderLeftColor: player.color }
                        ]}
                        onPress={() => !isDisabled && handleToggleSkillTarget(player.id)}
                        disabled={isDisabled}
                        activeOpacity={0.7}
                      >
                        <View style={styles.playerInfo}>
                          <Text style={[styles.playerName, isSelected && styles.playerNameSelected, isDisabled && styles.playerNameDisabled]}>
                            {player.name}
                          </Text>
                          {isDisabled && <Text style={styles.playerRoleText}>(Không thể chọn)</Text>}
                        </View>
                        <View style={[styles.checkBox, isSelected && styles.checkBoxSelected]}>
                          {isSelected && <Text style={styles.checkMark}>✓</Text>}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )
              )}
            </ScrollView>
            
            <View style={styles.modalFooter}>
              {currentRole?.id === 'phu_thuy' && activeActionType === 'heal' ? (
                  <View style={{ flexDirection: 'row', gap: 16, width: '100%', justifyContent: 'center' }}>
                     {/* SKIP BUTTON */}
                     <TouchableOpacity 
                       style={[styles.saveBtn, { backgroundColor: '#4B5563', flex: 1 }]}
                       onPress={() => {
                          if (currentRole && activeActionType) {
                              recordNightAction(currentRole.id, null, activeActionType);
                              setShowSkillModal(false);
                              setSkillTargets([]);
                              setActiveActionType(undefined);
                          }
                       }}
                     >
                       <Text style={styles.saveBtnText}>Không cứu</Text>
                     </TouchableOpacity>
                     
                     {/* SAVE BUTTON - Only if victim exists */}
                     {getWolfVictim() && (
                         <TouchableOpacity 
                           style={[styles.saveBtn, { backgroundColor: '#10B981', flex: 1 }]}
                           onPress={() => {
                              const victim = getWolfVictim();
                              if (currentRole && activeActionType && victim) {
                                  // Record decision to heal victim
                                  recordNightAction(currentRole.id, victim.id, activeActionType);
                                  setShowSkillModal(false);
                                  setSkillTargets([]);
                                  setActiveActionType(undefined);
                              }
                           }}
                         >
                           <Text style={styles.saveBtnText}>Cứu người</Text>
                         </TouchableOpacity>
                     )}
                  </View>
              ) : (
                <TouchableOpacity 
                  style={[
                    styles.saveBtn, 
                    (skillTargets.length < (getCurrentNightAction()?.targetCount || 1)) && styles.disabledBtn
                  ]}
                  onPress={handleConfirmSkillAction}
                  disabled={skillTargets.length < (getCurrentNightAction()?.targetCount || 1)}
                >
                  <Text style={styles.saveBtnText}>Xác nhận hành động</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* MORNING REPORT MODAL */}
      <MorningReportModal 
         visible={morningReportVisible}
         onClose={handleConfirmMorningReport}
         messages={morningMessages}
      />

      {/* DUAL ACTION MODAL (for Witch) */}
      <Modal visible={showDualActionModal} animationType="slide" transparent onRequestClose={() => setShowDualActionModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalPanel, { height: 'auto', maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Hành động của Phù Thủy</Text>
                <Text style={styles.modalSubtitle}>Chọn hành động muốn thực hiện</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDualActionModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              {(() => {
                if (!currentRole) return null;
                
                // Calculate victim info
                const actionsExcludingWitch = session.nightActions.filter(a => a.roleId !== currentRole.id);
                const simulation = resolveNightEvents(
                    actionsExcludingWitch,
                    session.players,
                    availableRoles,
                    session.players.filter(p => !p.isAlive).map(p => p.id)
                );
                const victimName = simulation.deadPlayerIds.length > 0 
                  ? session.players.filter(p => simulation.deadPlayerIds.includes(p.id)).map(p => p.name).join(', ')
                  : null;
                
                // Check if heal was already used
                const healUsedInHistory = session.matchLog.some(l => 
                  l.metadata?.roleId === currentRole.id && l.metadata?.actionType === 'heal'
                );
                const healUsedThisNight = session.nightActions.some(a => 
                  a.roleId === currentRole.id && a.actionType === 'heal'
                );
                const healAction = session.nightActions.find(a => 
                  a.roleId === currentRole.id && a.actionType === 'heal'
                );
                
                // Check if kill was already used  
                const killUsedInHistory = session.matchLog.some(l => 
                  l.metadata?.roleId === currentRole.id && l.metadata?.actionType === 'kill'
                );
                const killUsedThisNight = session.nightActions.some(a => 
                  a.roleId === currentRole.id && a.actionType === 'kill'
                );
                const killAction = session.nightActions.find(a => 
                  a.roleId === currentRole.id && a.actionType === 'kill'
                );
                
                return (
                  <View style={{gap: 16}}>
                    {/* HEAL ACTION */}
                    <View style={[styles.dualActionCard, healUsedInHistory && {opacity: 0.5}]}>
                      <View style={styles.dualActionCardHeader}>
                        <Text style={styles.dualActionCardIcon}>💊</Text>
                        <View style={{flex: 1}}>
                          <Text style={styles.dualActionCardTitle}>Cứu người</Text>
                          {victimName ? (
                            <Text style={{color: '#ef4444', fontWeight: 'bold', fontSize: 13}}>
                              Đang hấp hối: {victimName}
                            </Text>
                          ) : (
                            <Text style={{color: '#10b981', fontSize: 13}}>
                              Không có ai chết đêm nay
                            </Text>
                          )}
                        </View>
                      </View>
                      
                      {healUsedThisNight && healAction && (
                        <View style={styles.dualActionStatusBar}>
                          <Text style={styles.dualActionStatusText}>
                            ✓ {healAction.targetPlayerId 
                              ? `Đã cứu: ${session.players.find(p => p.id === healAction.targetPlayerId)?.name}`
                              : 'Đã bỏ qua'}
                          </Text>
                          <TouchableOpacity 
                            style={styles.dualActionClearBtn}
                            onPress={() => {
                              clearNightActionForRole(currentRole.id, 'heal');
                            }}
                          >
                            <Text style={styles.dualActionClearBtnText}>Xóa</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      
                      {!healUsedThisNight && !healUsedInHistory && (
                        <TouchableOpacity 
                          style={[styles.dualActionButton, {backgroundColor: '#10b981'}, !victimName && {opacity: 0.5}]}
                          onPress={() => {
                            setShowDualActionModal(false);
                            handleOpenSkillModal('heal');
                          }}
                          disabled={!victimName}
                        >
                          <Text style={styles.dualActionButtonText}>
                            {victimName ? 'Chọn cứu' : 'Không có ai để cứu'}
                          </Text>
                        </TouchableOpacity>
                      )}
                      
                      {healUsedInHistory && !healUsedThisNight && (
                        <Text style={styles.dualActionUsedText}>Đã dùng ở đêm trước</Text>
                      )}
                    </View>
                    
                    {/* KILL ACTION */}
                    <View style={[styles.dualActionCard, killUsedInHistory && {opacity: 0.5}]}>
                      <View style={styles.dualActionCardHeader}>
                        <Text style={styles.dualActionCardIcon}>☠️</Text>
                        <View style={{flex: 1}}>
                          <Text style={styles.dualActionCardTitle}>Giết người</Text>
                          <Text style={{color: '#9ca3af', fontSize: 13}}>
                            Chọn một người để giết
                          </Text>
                        </View>
                      </View>
                      
                      {killUsedThisNight && killAction && (
                        <View style={styles.dualActionStatusBar}>
                          <Text style={styles.dualActionStatusText}>
                            ✓ {killAction.targetPlayerId 
                              ? `Đã giết: ${session.players.find(p => p.id === killAction.targetPlayerId)?.name}`
                              : 'Đã bỏ qua'}
                          </Text>
                          <TouchableOpacity 
                            style={styles.dualActionClearBtn}
                            onPress={() => {
                              clearNightActionForRole(currentRole.id, 'kill');
                            }}
                          >
                            <Text style={styles.dualActionClearBtnText}>Xóa</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      
                      {!killUsedThisNight && !killUsedInHistory && (
                        <TouchableOpacity 
                          style={[styles.dualActionButton, {backgroundColor: '#ef4444'}]}
                          onPress={() => {
                            setShowDualActionModal(false);
                            handleOpenSkillModal('kill');
                          }}
                        >
                          <Text style={styles.dualActionButtonText}>Chọn giết</Text>
                        </TouchableOpacity>
                      )}
                      
                      {killUsedInHistory && !killUsedThisNight && (
                        <Text style={styles.dualActionUsedText}>Đã dùng ở đêm trước</Text>
                      )}
                    </View>
                  </View>
                );
              })()}
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.saveBtn, {backgroundColor: '#4B5563'}]}
                onPress={() => setShowDualActionModal(false)}
              >
                <Text style={styles.saveBtnText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ROLE ASSIGNMENT MODAL (Night 1 - Physical Card) */}
      <Modal visible={showRoleAssignModal} animationType="slide" transparent onRequestClose={() => setShowRoleAssignModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalPanel, { height: '80%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  Gán người chơi cho {currentRole?.name}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Đã chọn: {selectedPlayerIds.length}/{currentRole ? getRoleQuantity(currentRole.id) : 0}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowRoleAssignModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.roleListLabel}>Danh sách người chơi:</Text>
              {session.players.map(player => {
                const isAssignedToOther = player.roleId && player.roleId !== currentRole?.id;
                const isSelected = selectedPlayerIds.includes(player.id);
                
                const otherRoleName = isAssignedToOther 
                  ? availableRoles.find(r => r.id === player.roleId)?.name 
                  : '';

                return (
                  <TouchableOpacity
                    key={player.id}
                    style={[
                      styles.roleOption,
                      isAssignedToOther && styles.roleOptionDisabled,
                      isSelected && styles.roleOptionSelected,
                    ]}
                    onPress={() => !isAssignedToOther && handleTogglePlayerSelection(player.id)}
                    disabled={Boolean(isAssignedToOther)}
                  >
                    <View style={[styles.playerColorDot, { backgroundColor: player.color }]} />
                    <View style={styles.roleOptionInfo}>
                      <Text style={[
                        styles.roleOptionName,
                        isAssignedToOther && styles.roleOptionNameDisabled
                      ]}>
                        {player.name}
                      </Text>
                      {isAssignedToOther && (
                        <Text style={styles.roleOptionCount}>
                          (Đang là {otherRoleName})
                        </Text>
                      )}
                    </View>
                    {isSelected && (
                      <Text style={styles.roleOptionCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[
                  styles.saveBtn,
                  (!currentRole || selectedPlayerIds.length !== getRoleQuantity(currentRole.id)) && styles.saveBtnDisabled
                ]}
                onPress={handleSaveRoleAssignment}
                disabled={!currentRole || selectedPlayerIds.length !== getRoleQuantity(currentRole.id)}
              >
                <Text style={styles.saveBtnText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* VIEW ROLE MODAL (Night 2+ - Physical Card) */}
      <Modal visible={showViewRoleModal} animationType="fade" transparent onRequestClose={handleCloseViewRole}>
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={handleCloseViewRole}
        >
          <View style={styles.viewRoleCard}>
            {viewingRole && (
              <>
                <Text style={styles.viewRoleIcon}>{viewingRole.icon}</Text>
                <Text style={styles.viewRoleName}>{viewingRole.name}</Text>
                
                {currentRole && getAssignedPlayersForRole(currentRole.id).length > 0 && (
                   <View style={styles.viewRolePlayersList}>
                      {getAssignedPlayersForRole(currentRole.id).map(p => (
                        <Text key={p.id} style={[styles.viewRolePlayerName, { color: p.color }]}>
                          • {p.name}
                        </Text>
                      ))}
                   </View>
                )}

                <Text style={styles.viewRoleHint}>Tự động đóng sau 2 giây...</Text>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* PLAYER LIST MODAL (Long Press) */}
      <Modal visible={showPlayerListModal} animationType="slide" transparent onRequestClose={() => setShowPlayerListModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalPanel, { height: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Danh sách người chơi</Text>
              <TouchableOpacity onPress={() => setShowPlayerListModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {session.players.map(player => {
                 const role = availableRoles.find(r => r.id === player.roleId);
                 return (
                   <View key={player.id} style={styles.playerListItem}>
                     <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={[styles.playerColorDotBig, { backgroundColor: player.color }]} />
                        <View>
                           <Text style={[styles.playerNameList, !player.isAlive && styles.playerDeadText]}>
                              {player.name}
                           </Text>
                           <Text style={styles.playerRoleTextList}>
                              {role ? `${role.icon} ${role.name}` : 'Chưa có vai trò'}
                           </Text>
                        </View>
                     </View>
                     {!player.isAlive && <Text style={styles.deadLabel}>Đã chết</Text>}
                   </View>
                 );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ORDER SETTINGS MODAL */}
      <Modal
        visible={showOrderSettings}
        animationType="slide"
        onRequestClose={() => setShowOrderSettings(false)}
      >
         <View style={{flex: 1, backgroundColor: '#111827', paddingTop: 50}}>
             {scenario && (
                 <NightOrderEditor 
                    availableRoles={availableRoles}
                    activeRoleIds={scenario.roles.filter(r => r.quantity > 0).map(r => r.roleId)}
                    initialOrder={session.nightOrder || scenario.nightOrder}
                    onSave={handleSaveOrderSettings}
                    onCancel={() => setShowOrderSettings(false)}
                 />
             )}
         </View>
       </Modal>
       
       {/* SEER INVESTIGATION RESULT MODAL */}
       {seerInvestigationTarget && (
         <SeerInvestigationResultModal
           visible={showSeerResult}
           onClose={() => setShowSeerResult(false)}
           targetPlayer={session.players.find(p => p.id === seerInvestigationTarget.playerId) || null}
           targetRole={availableRoles.find(r => r.id === seerInvestigationTarget.roleId) || null}
         />
       )}
       
       {/* HUNTER REVENGE MODAL */}
       {hunterRevengeData && (
         <HunterRevengeModal
           visible={showHunterRevenge}
           onShoot={handleHunterShoot}
           onSkip={handleHunterSkip}
           hunterName={hunterRevengeData.hunterName}
           alivePlayers={session.players.filter(p => p.isAlive && p.id !== hunterRevengeData.hunterId)}
         />
       )}
       
       {/* VICTORY MODAL */}
       {showVictoryModal && gameWinner && (
         <VictoryModal
           visible={showVictoryModal}
           winResult={gameWinner}
           players={session.players}
           availableRoles={availableRoles}
           onContinue={() => setShowVictoryModal(false)}
           onNewGame={() => {
             setShowVictoryModal(false);
             setGameWinner(null);
             clearGame();
           }}
           onEndGame={() => {
             setShowVictoryModal(false);
             router.dismissAll(); 
             router.replace('/'); 
             
             setTimeout(() => {
                clearGame();
             }, 500);
           }}
         />
       )}
     </View>
  );
}
