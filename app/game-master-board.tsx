
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  Platform,
  Alert,
  Pressable,
  BackHandler,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { theme } from '../src/styles/theme';
import { useGameStore } from '../src/store/gameStore';
import { useRouter } from 'expo-router';
import { getNightSequence } from '../src/engine/nightSequence';
import { getPhaseDisplay } from '../src/engine/phaseController';
import { getRoleManager } from '../src/engine/RoleManager';
import { DaySubPhase, NightOrderDefinition } from '../src/types';
import { NightAction } from '../assets/role-types';
import { SwipeableCardStack } from '../src/components/SwipeableCardStack';
import { NightOrderEditor } from '../src/components/NightOrderEditor';
import { MorningReportModal } from '../src/components/MorningReportModal';
import { SeerInvestigationResultModal } from '../src/components/SeerInvestigationResultModal';
import { HunterRevengeModal } from '../src/components/HunterRevengeModal';
import { VictoryModal } from '../src/components/VictoryModal';
import { resolveNightEvents } from '../src/engine/NightResolution';
import { WinResult } from '../src/engine/WinConditionChecker';


// Skill type display info
const SKILL_DISPLAY: Record<string, { icon: string; name: string; verb: string }> = {
  protect: { icon: '🛡️', name: 'Bảo vệ', verb: 'bảo vệ' },
  kill: { icon: '⚔️', name: 'Tấn công', verb: 'tấn công' },
  investigate: { icon: '🔍', name: 'Điều tra', verb: 'điều tra' },
  detectRole: { icon: '👁️', name: 'Phát hiện', verb: 'soi' },
  heal: { icon: '💊', name: 'Chữa trị', verb: 'chữa trị' },
  silence: { icon: '🤐', name: 'Phong ấn', verb: 'phong ấn' },
  bless: { icon: '✨', name: 'Ban phước', verb: 'ban phước' },
  createLovers: { icon: '💕', name: 'Se duyên', verb: 'se duyên cho' },
  recruit: { icon: '📿', name: 'Thu nạp', verb: 'thu nạp' },
  exile: { icon: '🚫', name: 'Trục xuất', verb: 'trục xuất' },
  copyRole: { icon: '🎭', name: 'Sao chép', verb: 'chọn sao chép' },
  swapRoles: { icon: '🔄', name: 'Hoán đổi', verb: 'hoán đổi vai trò' },
  markTargets: { icon: '🎯', name: 'Đánh dấu', verb: 'đánh dấu' },
  gamble: { icon: '🎲', name: 'Đánh cược', verb: 'đánh cược với' },
  dual: { icon: '⚗️', name: 'Kép', verb: 'hành động' },
  none: { icon: '💤', name: 'Không', verb: '' },
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_DISCUSSION_TIME = 180; // 3 minutes

export default function GameMasterBoardScreen() {
  const {
    session,
    availableRoles,
    availableScenarios,
    recordNightAction,
    advanceToDay,
    processNightDeaths,
    processDeathWithCause,
    lynchPlayer,
    advanceToNight,
    assignRole,
    clearGame,
    initializeGame,
    updateNightOrder,
    undo,
    redo,
    commandInvoker,
  } = useGameStore();

  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [showLogPanel, setShowLogPanel] = useState(false); // Can remove this if fully verified, but keeping for safety for now or just ignoring it
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
    // Note: This logic assumes protection actions happen BEFORE Witch in the night sequence, which is standard.
    // If Priest/Bodyguard acted, their action is in session.nightActions.
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

  const getSkillDisplay = (actionType: string) => {
    return SKILL_DISPLAY[actionType] || SKILL_DISPLAY.none;
  };

  const getFrequencyText = (frequency?: string): string => {
    switch (frequency) {
      case 'everyNight': return 'Mỗi đêm';
      case 'firstNightOnly': return 'Chỉ đêm đầu';
      case 'oncePerGame': return 'Một lần/ván';
      case 'conditional': return 'Có điều kiện';
      default: return '';
    }
  };

  const getRestrictionText = (restrictions?: string[]): string => {
    if (!restrictions || restrictions.length === 0) return '';
    const texts: string[] = [];
    if (restrictions.includes('cannotTargetSamePersonConsecutively')) {
      texts.push('Không thể chọn cùng 1 người 2 đêm liên tiếp');
    }
    if (restrictions.includes('cannotTargetWerewolves')) {
      texts.push('Không thể chọn Sói');
    }
    return texts.join('. ');
  };

  // Win Condition Checking
  const checkWinCondition = () => {
    // Get fresh state explicitly to avoid stale data after state updates
    const currentSession = useGameStore.getState().session;
    const players = currentSession?.players || session.players;
    
    const alivePlayers = players.filter(p => p.isAlive);
    const allPlayers = players; // Include dead players for individual win checks
    
    console.log('🔍 Checking win conditions...');
    console.log('All players:', allPlayers.map(p => ({ 
      name: p.name, 
      alive: p.isAlive, 
      roleId: p.roleId, 
      killedBy: p.killedBy 
    })));
    
    // CHECK INDIVIDUAL WINS FIRST (highest priority)
    // Kẻ Chán Đời - wins if executed
    for (const player of allPlayers) {
      if (!player.isAlive && player.killedBy === 'execution') {
        const role = availableRoles.find(r => r.id === player.roleId);
        console.log('🎯 Found executed player:', player.name, 'Role:', role?.name, 'Win condition:', role?.winConditions?.primary);
        
        // Check for generic condition OR explicit role ID
        if (role?.winConditions?.primary === 'dieByExecution' || player.roleId === 'ke_chan_doi') {
          console.log('🎉 KẺ CHÁN ĐỜI WINS!');
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
    
    const aliveNeutrals = alivePlayers.filter(p => {
      const role = availableRoles.find(r => r.id === p.roleId);
      return role?.team === 'neutral';
    });
    
    // Werewolf win: wolves >= non-wolves
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
    
    // For dual actions (Witch), we don't strictly enforce target count in the generic check if we are handling sub-actions
    // But basic target count check is good.
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
    
    // Special handling for Seer investigation - show result immediately
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
    
    // Update local display state if needed, though we should likely read from session logs/actions for dual roles
    // Keeping simple selectedTargetId for single-action roles compatibility
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
           return; // Don't advance to day yet - wait for hunter revenge
         }
     }
     
     setMorningReportVisible(false);
     
     // Transition to Day
     advanceToDay();
     setCurrentRoleIndex(0);
     setSelectedTargetId(null);
     setDaySubPhase('SUNRISE');
     
     // Check win conditions after night deaths
     checkWinCondition();
  };

  const handleNextRole = useCallback(() => {
    if (isNightPhase) {
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
        recordNightAction(currentRole.id, selectedTargetId, activeActionType);
      }
      
      if (currentRoleIndex < nightSequence.length - 1) {
        setCurrentRoleIndex(prev => prev + 1);
        setSelectedTargetId(null);
      } else {
        if (isNight1 && isPhysicalCardMode) {
          // Auto-assign logic for remaining players
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

                // Auto assign remaining players
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

        // Instead of directly advancing, show report
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
        // Don't change phase yet - wait for hunter revenge
      } else {
        setDaySubPhase('ANNOUNCEMENT');
        
        // Check win conditions after lynching (except when hunter revenge pending)
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
      // Kill the target player with hunter shot
      processDeathWithCause(targetId, 'hunter');
      
      // Close modal and continue game
      setShowHunterRevenge(false);
      setHunterRevengeData(null);
      
      // Continue to next phase based on current phase
      if (session.currentPhase.type === 'NIGHT') {
        advanceToDay();
        setCurrentRoleIndex(0);
        setSelectedTargetId(null);
        setDaySubPhase('SUNRISE');
      } else {
        setDaySubPhase('ANNOUNCEMENT');
      }
      
      // Check win conditions after hunter shot
      checkWinCondition();
    }
  };
  
  const handleHunterSkip = () => {
    // Hunter chose not to shoot anyone
    setShowHunterRevenge(false);
    setHunterRevengeData(null);
    
    // Continue to next phase
    if (session.currentPhase.type === 'NIGHT') {
      advanceToDay();
      setCurrentRoleIndex(0);
      setSelectedTargetId(null);
      setDaySubPhase('SUNRISE');
    } else {
      setDaySubPhase('ANNOUNCEMENT');
    }
    
    // Check win conditions even if hunter skipped
    checkWinCondition();
  };

  /* Removed duplicate alivePlayers declaration */
  // alivePlayers is already declared above
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
                 // Try to restore original order if possible, or just keep as is
                 // session.players usually maintains order unless sorted.
                 // position is stored in player object.
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

  // --- RENDER HELPERS ---

  const renderRoleCardContent = (role: any, isActive: boolean = false) => {
    const nightAction = getCurrentNightAction();
    const skillInfo = nightAction ? getSkillDisplay(nightAction.type) : null;
    const hasSkill = nightAction && nightAction.type !== 'none';
    const isAssigned = isRoleFullyAssigned(role.id);
    const assignedPlayers = getAssignedPlayersForRole(role.id);
    // 1. Dead State Check
    // If there are assigned players and ALL of them are dead, interactions are disabled.
    // Logic: 
    // - For single-player roles (Seer, Witch): If player is dead -> Disabled.
    // - For group roles (Werewolves): If ALL wolves are dead -> Disabled (though game likely ends).
    // - If NO players assigned yet -> Not disabled by death (disabled by assignment check).
    const areAllAssignedDead = assignedPlayers.length > 0 && assignedPlayers.every(p => !p.isAlive);
    const deadPlayerNames = assignedPlayers.filter(p => !p.isAlive).map(p => p.name).join(', ');

    // styles.cardInner has flex:1 and padding:24.
    
    return (
      <View 
        style={styles.cardInner}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardCount}>
            Role {currentRoleIndex + 1} / {nightSequence.length}
          </Text>
          
          {shouldShowViewRole && role && isActive && (
            <TouchableOpacity 
              style={styles.viewRoleBtn}
              onPress={handleViewRole}
            >
              <Text style={styles.viewRoleBtnText}>👁️</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.cardContent, areAllAssignedDead && { opacity: 0.6 }]}>
          <Text style={styles.cardIcon}>{role.icon}
            <Text style={styles.cardTitle}>{role.name}</Text>
            <View style={styles.cardTitleRow}>
              {isActive && (
                <>
                  <TouchableOpacity onPress={() => setShowRoleDesc(true)} style={styles.infoBtn}>
                    <Text style={styles.infoBtnText}>ℹ️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowPlayerListModal(true)} style={styles.infoBtn}>
                    <Text style={styles.infoBtnText}>📋</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </Text>

          {/* DEAD STATUS OVERLAY OR TEXT */}
          {areAllAssignedDead && (
             <View style={{marginTop: 10, padding: 8, backgroundColor: '#330000', borderRadius: 8}}>
                 <Text style={{color: '#ff4444', fontWeight: 'bold', textAlign: 'center'}}>
                    🚫 ĐÃ CHẾT ({deadPlayerNames})
                 </Text>
             </View>
          )}

          {shouldShowRoleAssignment && role && isActive && (
            <TouchableOpacity 
              style={[
                styles.centralAssignBtn,
                isAssigned ? styles.centralAssignBtnDone : styles.centralAssignBtnPending
              ]}
              onPress={handleOpenRoleAssign}
            >
              <Text style={styles.centralAssignBtnText}>
                {isAssigned 
                  ? `✓ Đã gán ${getAssignedPlayersForRole(role.id).length}/${getRoleQuantity(role.id)}` 
                  : `+ Gán người chơi (${getAssignedPlayersForRole(role.id).length}/${getRoleQuantity(role.id)})`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* If Dead, do not show skill interactions, show Reset/Skip note maybe? 
            Or just hide and let user swipe. */}
        {areAllAssignedDead ? (
            <View style={styles.lockedSkillSection}>
               <Text style={styles.lockedSkillText}>Không thể thực hiện hành động.</Text>
            </View>
        ) : (isActive && hasSkill && skillInfo ? (
          (!shouldShowRoleAssignment || isAssigned) ? (
            <View style={styles.skillSection}>
              {/* Skill Badge Info */}
              <View style={styles.skillBadge}>
                <Text style={styles.skillIcon}>{skillInfo.icon}</Text>
                <View style={styles.skillInfo}>
                  <Text style={styles.skillName}>{skillInfo.name}</Text>
                  <Text style={styles.skillFrequency}>{getFrequencyText(nightAction?.frequency)}</Text>
                </View>
                {!isAssigned && (
                    <View style={styles.skillTargetCount}>
                      <Text style={styles.skillTargetCountText}>
                        {nightAction?.targetCount || 1} mục tiêu
                      </Text>
                    </View>
                )}
              </View>
              
              {nightAction?.restrictions && nightAction.restrictions.length > 0 && (
                <Text style={styles.restrictionText}>
                  ⚠️ {getRestrictionText(nightAction.restrictions)}
                </Text>
              )}
              
              {nightAction?.type === 'dual' ? (
                  // Witch Dual UI
                  <View style={{marginTop: 16, gap: 12}}>
                      {/* PRE-CALCULATE VICTIM FOR WITCH */}
                      {(() => {
                           // 2. Witch Logic application
                           // Run resolution with CURRENT actions to see who is dying
                           // But exclude Witch's current actions to see the "incoming" state?
                           // Actually resolveNightEvents handles protection logic.
                           // We want to know: "Who dies if I (Witch) do nothing?"
                           
                           // Filter out Witch actions from the simulation set
                           const actionsExcludingWitch = session.nightActions.filter(a => a.roleId !== role.id);
                           const simulation = resolveNightEvents(
                               actionsExcludingWitch,
                               session.players,
                               availableRoles,
                               session.players.filter(p => !p.isAlive).map(p => p.id)
                           );
                           
                           const potentialVictims = simulation.deadPlayerIds; 
                           // Note: deadPlayerIds from simulation are IDs.
                           // If valid victim exists, display name.
                           
                           // We only care about victims that the Witch can SAVE.
                           // Typically this is the Werewolf kill.
                           // Our resolveNightEvents combines kills. 
                           // If the Guard protected them, they won't be in deadPlayerIds.
                           // So this correctly reflects "Who is dead right now".
                           
                           const victimName = potentialVictims.length > 0 
                                ? session.players.filter(p => potentialVictims.includes(p.id)).map(p => p.name).join(', ')
                                : null;

                           return (
                               <>
                                   {/* HEAL ACTION */}
                                   <View style={styles.dualActionRow}>
                                      <View style={{flex: 1}}>
                                         <Text style={styles.dualActionTitle}>💊 Cứu người</Text>
                                         {victimName ? (
                                             <Text style={{color: '#ef4444', fontWeight: 'bold', fontSize: 13}}>
                                                 Đang hấp hối: {victimName}
                                             </Text>
                                         ) : (
                                             <Text style={{color: '#10b981', fontSize: 13}}>
                                                 Không có ai chết
                                             </Text>
                                         )}
                                         <Text style={styles.dualActionStatus}>
                                            {(() => {
                                               // Check current night
                                               const currentAction = session.nightActions.find(a => 
                                                  a.roleId === role.id && a.actionType === 'heal'
                                               );
                                               if (currentAction) {
                                                   const target = session.players.find(p => p.id === currentAction.targetPlayerId);
                                                   return target ? `Đã cứu: ${target.name}` : 'Đã bỏ qua';
                                               }
                                               
                                               // Check history
                                               const historyLog = session.matchLog.find(log => 
                                                   log.type === 'ROLE_ACTION' && 
                                                   log.metadata?.roleId === role.id && 
                                                   log.metadata?.actionType === 'heal'
                                               );
                                               if (historyLog) return `Đã dùng (Đêm ${historyLog.phase?.number})`;

                                               return 'Chưa dùng';
                                            })()}
                                         </Text>
                                      </View>
                                      <TouchableOpacity 
                                         style={[
                                             styles.smallActionBtn, 
                                             {backgroundColor: '#10b981'},
                                             (!victimName || 
                                              session.matchLog.some(l => l.metadata?.roleId === role.id && l.metadata?.actionType === 'heal') ||
                                              session.nightActions.some(a => a.roleId === role.id && a.actionType === 'heal')
                                             ) && {opacity: 0.5} 
                                         ]}
                                         disabled={
                                             !victimName || 
                                             session.matchLog.some(l => l.metadata?.roleId === role.id && l.metadata?.actionType === 'heal') ||
                                             session.nightActions.some(a => a.roleId === role.id && a.actionType === 'heal')
                                         }
                                         onPress={() => handleOpenSkillModal('heal')}
                                      >
                                         <Text style={styles.smallActionBtnText}>Chọn</Text>
                                      </TouchableOpacity>
                                   </View>
            
                                   {/* KILL ACTION */}
                                   <View style={styles.dualActionRow}>
                                      <View style={{flex: 1}}>
                                         <Text style={styles.dualActionTitle}>☠️ Giết người</Text>
                                         <Text style={styles.dualActionStatus}>
                                            {(() => {
                                               const currentAction = session.nightActions.find(a => a.roleId === role.id && a.actionType === 'kill');
                                               if (currentAction) {
                                                    const target = session.players.find(p => p.id === currentAction.targetPlayerId);
                                                    return target ? `Đã giết: ${target.name}` : 'Đã bỏ qua';
                                               }

                                               const historyLog = session.matchLog.find(log => 
                                                   log.type === 'ROLE_ACTION' && 
                                                   log.metadata?.roleId === role.id && 
                                                   log.metadata?.actionType === 'kill'
                                               );
                                               if (historyLog) return `Đã dùng (Đêm ${historyLog.phase?.number})`;

                                               return 'Chưa dùng';
                                            })()}
                                         </Text>
                                      </View>
                                      <TouchableOpacity 
                                         style={[
                                             styles.smallActionBtn, 
                                             {backgroundColor: '#ef4444'},
                                              (session.matchLog.some(l => l.metadata?.roleId === role.id && l.metadata?.actionType === 'kill') ||
                                               session.nightActions.some(a => a.roleId === role.id && a.actionType === 'kill')
                                              ) && {opacity: 0.5}
                                         ]}
                                         disabled={
                                              session.matchLog.some(l => l.metadata?.roleId === role.id && l.metadata?.actionType === 'kill') ||
                                              session.nightActions.some(a => a.roleId === role.id && a.actionType === 'kill')
                                         }
                                         onPress={() => handleOpenSkillModal('kill')}
                                      >
                                         <Text style={styles.smallActionBtnText}>Chọn</Text>
                                      </TouchableOpacity>
                                   </View>
                               </>
                           );
                      })()}
                  </View>
              ) : (
                  // Standard Single Action UI
                  <>
                      {selectedTargetId && (
                        <View style={styles.selectedTargetDisplay}>
                          <Text style={styles.selectedTargetLabel}>Đã chọn:</Text>
                          <Text style={styles.selectedTargetName}>
                            {alivePlayers.find(p => p.id === selectedTargetId)?.name || 'Không xác định'}
                          </Text>
                        </View>
                      )}
                      
                      <TouchableOpacity 
                        style={[styles.skillActionBtn, selectedTargetId && styles.skillActionBtnDone]}
                        onPress={() => handleOpenSkillModal()}
                      >
                        <Text style={styles.skillActionBtnText}>
                          {selectedTargetId 
                            ? `✓ Đã ${skillInfo.verb}` 
                            : `${skillInfo.icon} Chọn để ${skillInfo.verb}`}
                        </Text>
                      </TouchableOpacity>
                  </>
              )}
            </View>
          ) : (
            <View style={styles.lockedSkillSection}>
               <Text style={styles.lockedSkillText}>Vui lòng gán người chơi để mở khóa hành động</Text>
            </View>
          )
        ) : isActive ? (
          <View style={styles.instructionSection}>
            <Text style={styles.instructionText}>
              Gọi {role.name} dậy và thực hiện hành động.
            </Text>
            <Text style={styles.swipeHint}>Vuốt để tiếp tục ››</Text>
          </View>
        ) : null)}
      </View>
    );
  };

  const renderNightPhase = () => {
    // Prepare cards for SwipeableCardStack
    const cards = nightSequence.map((role, index) => ({
      id: role.id,
      icon: role.icon,
      name: role.name,
      content: renderRoleCardContent(role, index === currentRoleIndex),
      onLongPress: index === currentRoleIndex ? () => setShowPlayerListModal(true) : undefined,
    }));

    return (
      <View style={styles.nightContainer}>
        <SwipeableCardStack
          cards={cards}
          currentIndex={currentRoleIndex}
          onSwipeLeft={handlePreviousRole}
          onSwipeRight={handleNextRole}
          canSwipeLeft={currentRoleIndex > 0}
          canSwipeRight={currentRoleIndex < nightSequence.length - 1 || !shouldShowRoleAssignment || (!!currentRole && isRoleFullyAssigned(currentRole.id))}
        />
        
        {/* Action Buttons */}
        <View style={styles.nightActionsFixed}>
          <TouchableOpacity 
            style={[styles.actionButtonSecondary, currentRoleIndex === 0 && styles.disabledBtn]} 
            onPress={handlePreviousRole}
            disabled={currentRoleIndex === 0}
          >
            <Text style={[styles.actionBtnTextSec, currentRoleIndex === 0 && { opacity: 0.3 }]}>
              ‹ Trước
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButtonPrimary} 
            onPress={handleNextRole}
          >
            <Text style={styles.actionBtnText}>
              {currentRoleIndex === nightSequence.length - 1 ? 'Kết thúc đêm' : 'Tiếp ›'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderDayPhase = () => {
    return (
      <View style={styles.dayContainer}>
        {daySubPhase === 'SUNRISE' && (
          <View style={styles.centerContent}>
            <Text style={styles.giantIcon}>🌅</Text>
            <Text style={styles.phaseHeading}>Trời Sáng</Text>
            <Text style={styles.phaseSubtext}>Đêm {session.currentPhase.number} kết thúc.</Text>
            <TouchableOpacity style={styles.mainBtn} onPress={handleStartDiscussion}>
              <Text style={styles.mainBtnText}>Bắt đầu thảo luận</Text>
            </TouchableOpacity>
          </View>
        )}

        {daySubPhase === 'DISCUSSION' && (
           <View style={styles.centerContent}>
             <Text style={styles.phaseLabel}>THẢO LUẬN</Text>
             <Text style={[styles.timerDisplay, timeRemaining < 30 && styles.timerAlert]}>
               {formatTime(timeRemaining)}
             </Text>
             
             <View style={styles.timerControls}>
               <TouchableOpacity 
                  style={styles.iconBtn} 
                  onPress={() => setIsTimerRunning(!isTimerRunning)}
                >
                 <Text style={styles.iconBtnText}>{isTimerRunning ? '⏸' : '▶'}</Text>
               </TouchableOpacity>
             </View>
             
             <TouchableOpacity style={styles.mainBtn} onPress={() => setDaySubPhase('VOTING')}>
               <Text style={styles.mainBtnText}>Chuyển sang Bỏ phiếu</Text>
             </TouchableOpacity>
           </View>
        )}

        {daySubPhase === 'VOTING' && (
          <View style={styles.phaseContainer}>
            <Text style={styles.phaseHeading}>⚖️ Bỏ Phiếu</Text>
            <Text style={styles.phaseSubtext}>Chọn người chơi để treo cổ</Text>
            
            <ScrollView style={styles.gridList} contentContainerStyle={styles.gridContainer}>
              {alivePlayers.map(player => (
                <TouchableOpacity
                  key={player.id}
                  style={[
                    styles.gridItem,
                    lynchTarget === player.id && styles.gridItemSelected,
                    { borderColor: player.color }
                  ]}
                  onPress={() => setLynchTarget(player.id === lynchTarget ? null : player.id)}
                >
                  <View style={[styles.playerBadge, { backgroundColor: player.color }]} />
                  <Text style={styles.gridName}>{player.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={styles.bottomBar}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => { setLynchTarget(null); setDaySubPhase('ANNOUNCEMENT'); }}>
                 <Text style={styles.secondaryBtnText}>Không treo cổ</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.dangerBtn, !lynchTarget && styles.disabledBtn]} 
                onPress={handleConfirmLynch}
                disabled={!lynchTarget}
              >
                 <Text style={styles.dangerBtnText}>Xác nhận Treo cổ</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {daySubPhase === 'ANNOUNCEMENT' && (
           <View style={styles.centerContent}>
             <Text style={styles.giantIcon}>{lynchedPlayer ? '💀' : '🕊️'}</Text>
             <Text style={styles.phaseHeading}>KẾT QUẢ</Text>
             <Text style={styles.resultText}>
               {lynchedPlayer 
                 ? `${lynchedPlayer.name} đã bị treo cổ.` 
                 : 'Không ai bị treo cổ hôm nay.'}
             </Text>
             <TouchableOpacity style={styles.mainBtn} onPress={handleAfterAnnouncement}>
               <Text style={styles.mainBtnText}>Tiếp tục</Text>
             </TouchableOpacity>
           </View>
        )}

        {daySubPhase === 'SLEEP_TRANSITION' && (
           <View style={styles.centerContent}>
             <Text style={styles.giantIcon}>🌙</Text>
             <Text style={styles.phaseHeading}>ĐI NGỦ</Text>
             <Text style={styles.phaseSubtext}>Chuẩn bị cho đêm tiếp theo...</Text>
             <TouchableOpacity style={styles.nightBtn} onPress={handleNextNight}>
               <Text style={styles.nightBtnText}>Bắt đầu Đêm {session.currentPhase.number + 1}</Text>
             </TouchableOpacity>
           </View>
        )}
      </View>
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
        {isNightPhase ? renderNightPhase() : renderDayPhase()}
      </View>

      {/* SIDEBAR */}
      {isSidebarOpen && (
        <View style={styles.sidebarOverlay}>
           <TouchableOpacity 
              style={styles.sidebarBackdrop} 
              activeOpacity={1} 
              onPress={() => setIsSidebarOpen(false)} 
           />
           <View style={styles.sidebarContainer}>
              <View style={styles.sidebarHeader}>
                 <Text style={styles.sidebarTitle}>Menu</Text>
                 <TouchableOpacity onPress={() => setIsSidebarOpen(false)}>
                    <Text style={styles.closeBtn}>✕</Text>
                 </TouchableOpacity>
              </View>
              
               <View style={styles.sidebarMenu}>
                  <TouchableOpacity style={styles.menuItem} onPress={handlePauseGame}>
                     <Text style={styles.menuItemIcon}>⏸</Text>
                     <Text style={styles.menuItemText}>Tạm hoãn</Text>
                  </TouchableOpacity>
                  
                  {/* Undo/Redo Buttons */}
                  {/* Undo/Redo Buttons Removed */}
                  
                  <TouchableOpacity style={styles.menuItem} onPress={handleOpenOrderSettings}>
                     <Text style={styles.menuItemIcon}>⚙️</Text>
                     <Text style={styles.menuItemText}>Cài đặt thứ tự gọi</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.menuItem} onPress={handleRestartGame}>
                     <Text style={styles.menuItemIcon}>🔄</Text>
                     <Text style={styles.menuItemText}>Bắt đầu lại</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.menuItem, styles.menuItemDestructive]} onPress={handleEndGame}>
                     <Text style={styles.menuItemIcon}>❌</Text>
                     <Text style={[styles.menuItemText, styles.textDestructive]}>Kết thúc trò chơi</Text>
                  </TouchableOpacity>
               </View>

              <View style={styles.sidebarDivider} />
              
              <Text style={styles.sidebarSectionTitle}>Nhật ký trận đấu</Text>
              <ScrollView style={styles.sidebarLogBody}>
                  {session.matchLog.slice().reverse().map(entry => (
                    <View key={entry.id} style={styles.logRow}>
                      <Text style={styles.logTime}>{getPhaseDisplay(entry.phase)}</Text>
                      <Text style={styles.logMsg}>{entry.message}</Text>
                    </View>
                  ))}
                  {session.matchLog.length === 0 && (
                    <Text style={styles.emptyText}>Chưa có ghi chép nào.</Text>
                  )}
              </ScrollView>
           </View>
        </View>
      )}

      {/* MODALS - Keep all existing modals */}
      {/* LOG MODAL */}
      <Modal visible={showLogPanel} animationType="slide" transparent onRequestClose={() => setShowLogPanel(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalPanel}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nhật ký trận đấu</Text>
              <TouchableOpacity onPress={() => setShowLogPanel(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {session.matchLog.slice().reverse().map(entry => (
                <View key={entry.id} style={styles.logRow}>
                  <Text style={styles.logTime}>{getPhaseDisplay(entry.phase)}</Text>
                  <Text style={styles.logMsg}>{entry.message}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
                    
                    // Standard logic: prevent self-targeting for other roles
                    // Witch heal uses custom UI so we don't need special check here anymore for list mode
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
                              // Record with NO target (Skip)
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
       
       {/* MORNING REPORT MODAL */}
       <MorningReportModal
         visible={morningReportVisible}
         onClose={handleConfirmMorningReport}
         messages={morningMessages}
       />
       
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
             router.dismissAll(); // Ensure we clear stack
             router.replace('/'); // Go to home
             
             // Delay clearing state to prevent render crashes during navigation
             // and allow component to unmount gracefully
             setTimeout(() => {
                clearGame();
             }, 500);
           }}
         />
       )}
     </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 5 : 60,
    paddingBottom:10,
    backgroundColor: '#1F2937',
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phaseIndicator: {
    color: '#818CF8',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  headerIcon: {
    fontSize: 24,
  },
  logIconBtn: {
    padding: 8,
    backgroundColor: '#374151',
    borderRadius: 8,
  },
  body: {
    flex: 1,
    overflow: 'hidden',
  },
  
  // NIGHT PHASE
  nightContainer: {
    flex: 1,
    position: 'relative',
  },
  nightActionsFixed: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 12,
    zIndex: 100,
  },
  
  // CARD INNER CONTENT
  cardInner: {
    flex: 1,
    padding: 12,
  },
  cardHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardCount: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F9FAFB',
    textAlign: 'center',
  },
  infoBtn: {
    padding: 4,
  },
  infoBtnText: {
    fontSize: 15,
  },
  cardDesc: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
  },
  
  // SKILL SECTION
  skillSection: {
    flex: 1,
    width: '100%',
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
  },
  skillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
  },
  skillIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  skillInfo: {
    flex: 1,
  },
  skillName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  skillFrequency: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  skillTargetCount: {
    backgroundColor: '#374151',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  skillTargetCountText: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '600',
  },
  restrictionText: {
    color: '#FBBF24',
    fontSize: 12,
    marginTop: 10,
    fontStyle: 'italic',
  },
  selectedTargetDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 10,
    backgroundColor: '#3730A3',
    borderRadius: 8,
  },
  selectedTargetLabel: {
    color: '#A5B4FC',
    fontSize: 14,
    marginRight: 8,
  },
  selectedTargetName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skillActionBtn: {
    marginTop: 16,
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  skillActionBtnDone: {
    backgroundColor: '#059669',
  },
  skillActionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  instructionSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionText: {
    color: '#9CA3AF',
    fontSize: 18,
    textAlign: 'center',
    width: '80%',
  },
  swipeHint: {
    marginTop: 40,
    color: '#4B5563',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  
  // DUAL ACTION STYLES
  dualActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 12,
    justifyContent: 'space-between',
  },
  dualActionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dualActionStatus: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  smallActionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  smallActionBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },

  // ACTION BUTTONS
  actionButtonPrimary: {
    flex: 1,
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionButtonSecondary: {
    flex: 1,
    backgroundColor: '#374151',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  actionBtnTextSec: {
    color: '#D1D5DB',
    fontWeight: '600',
    fontSize: 16,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  
  // DAY PHASE STYLES
  dayContainer: {
    flex: 1,
    padding: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  giantIcon: {
    fontSize: 96,
    marginBottom: 24,
  },
  phaseHeading: {
    fontSize: 32,
    fontWeight: '900',
    color: '#F9FAFB',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  phaseSubtext: {
    fontSize: 18,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 40,
  },
  phaseLabel: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 20,
  },
  mainBtn: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 100,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  mainBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  nightBtn: {
    backgroundColor: '#4C1D95',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  nightBtnText: {
    color: '#E9D5FF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // TIMER
  timerDisplay: {
    fontSize: 80,
    fontWeight: 'bold',
    color: '#F9FAFB',
    fontVariant: ['tabular-nums'],
    marginBottom: 30,
  },
  timerAlert: {
    color: '#EF4444',
  },
  timerControls: {
    flexDirection: 'row',
    marginBottom: 40,
  },
  iconBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnText: {
    fontSize: 28,
    color: '#F9FAFB',
  },
  
  // GRID LIST (VOTING)
  phaseContainer: {
    flex: 1,
  },
  gridList: {
    flex: 1,
    marginVertical: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  gridItem: {
    width: (SCREEN_WIDTH - 64) / 2,
    aspectRatio: 1.5,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#374151',
  },
  gridItemSelected: {
    backgroundColor: '#312E81',
    borderColor: '#818CF8',
  },
  playerBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: 'absolute',
    top: 12,
    right: 12,
  },
  gridName: {
    color: '#F3F4F6',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // BOTTOM BAR
  bottomBar: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#374151',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#D1D5DB',
    fontWeight: 'bold',
    fontSize: 16,
  },
  dangerBtn: {
    flex: 2,
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  dangerBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resultText: {
    fontSize: 24,
    color: '#E5E7EB',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 32,
    paddingHorizontal: 20,
  },
  
  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPanel: {
    backgroundColor: '#1F2937',
    borderRadius: 24,
    width: '90%',
    maxHeight: '80%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: '#F9FAFB',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeBtn: {
    fontSize: 24,
    color: '#9CA3AF',
  },
  modalBody: {
    flex: 1,
  },
  logRow: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    paddingBottom: 16,
  },
  logTime: {
    color: '#818CF8',
    fontSize: 12,
    fontWeight: 'bold',
    width: 60,
    marginTop: 2,
  },
  logMsg: {
    flex: 1,
    color: '#D1D5DB',
    fontSize: 15,
    lineHeight: 20,
  },
  roleAssignBtn: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  roleAssignBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  viewRoleBtn: {
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewRoleBtnText: {
    fontSize: 18,
  },
  modalSubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 4,
  },
  modalFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  saveBtn: {
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#374151',
    opacity: 0.5,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // LIST STYLES
  playerListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    marginBottom: 8,
  },
  playerColorDotBig: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  playerNameList: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  playerRoleTextList: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  playerDeadText: {
    textDecorationLine: 'line-through',
    color: '#6B7280',
  },
  deadLabel: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },

  roleListLabel: {
    color: '#D1D5DB',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 8,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roleOptionDisabled: {
    opacity: 0.6,
    backgroundColor: '#111827',
  },
  roleOptionSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#1E1B4B',
  },
  playerColorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#374151',
  },
  roleOptionInfo: {
    flex: 1,
  },
  roleOptionName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F9FAFB',
    marginBottom: 2,
  },
  roleOptionNameDisabled: {
    color: '#9CA3AF',
  },
  roleOptionCount: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500', 
  },
  roleOptionCheck: {
    fontSize: 24,
    color: '#6366F1',
    fontWeight: 'bold',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    borderLeftWidth: 4,
  },
  playerRowSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#1E1B4B',
  },
  playerRowDisabled: {
    opacity: 0.5,
    backgroundColor: '#111827',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F9FAFB',
    marginBottom: 2,
  },
  playerNameSelected: {
    color: '#818CF8',
  },
  playerNameDisabled: {
    color: '#9CA3AF',
  },
  playerRoleText: {
    fontSize: 12,
    color: '#EF4444',
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#4B5563',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  checkMark: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewRoleCard: {
    backgroundColor: '#1F2937',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 280,
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  viewRoleIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  viewRoleName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 20,
  },
  viewRolePlayersList: {
    marginBottom: 20,
    alignItems: 'center',
    width: '100%',
  },
  viewRolePlayerName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  viewRoleHint: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 20,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  // SIDEBAR STYLES
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    flexDirection: 'row',
  },
  sidebarBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sidebarContainer: {
    width: '75%',
    maxWidth: 320,
    backgroundColor: '#111827',
    borderLeftWidth: 1,
    borderLeftColor: '#374151',
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingRight: 8,
  },
  sidebarTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F9FAFB',
  },
  sidebarMenu: {
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1F2937',
    borderRadius: 12,
  },
  menuItemIcon: {
    fontSize: 20,
    marginRight: 16,
  },
  menuItemText: {
    fontSize: 16,
    color: '#E5E7EB',
    fontWeight: '600',
  },
  menuItemDestructive: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  menuItemDisabled: {
    opacity: 0.4,
  },
  textDestructive: {
    color: '#EF4444',
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 24,
  },
  sidebarSectionTitle: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  sidebarLogBody: {
    flex: 1,
  },
  
  // CENTRAL ASSIGN BTN
  centralAssignBtn: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    width: '100%',
    maxWidth: 280,
  },
  centralAssignBtnPending: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: '#6366F1',
    borderStyle: 'dashed',
  },
  centralAssignBtnDone: {
    backgroundColor: 'rgba(5, 150, 105, 0.2)',
    borderColor: '#059669',
  },
  centralAssignBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F9FAFB',
    textAlign: 'center',
  },
  lockedSkillSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.6,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#374151',
    borderStyle: 'dashed',
  },
  lockedSkillText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
});
