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
import { CupidLoversModal } from '../src/components/CupidLoversModal';
import { PastorBlessModal } from '../src/components/PastorBlessModal';
import { MediumScryModal } from '../src/components/MediumScryModal';
import { LoversRevealModal } from '../src/components/LoversRevealModal';
import { TraitorSelectModal } from '../src/components/TraitorSelectModal';
import { BewitchedTransformAlert } from '../src/components/BewitchedTransformAlert';
import { CultRecruitModal } from '../src/components/CultRecruitModal';
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
    pastorBless,
    mediumScry,
    clearMediumResult,
    saveMatchToHistory,
    assignTraitor,
    markBewitchedBitten,
    clearTransformedThisNight,
    assignLovers,
    recruitToCult,
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
  const [pendingBewitchedBitten, setPendingBewitchedBitten] = useState<{ playerId: string; playerName: string; killedBy: 'werewolf' | 'vampire' }[]>([]);
  
  // Seer Investigation State
  const [showSeerResult, setShowSeerResult] = useState(false);
  const [seerInvestigationTarget, setSeerInvestigationTarget] = useState<{ playerId: string; roleId: string | null } | null>(null);
  
  // Hunter Revenge State
  const [showHunterRevenge, setShowHunterRevenge] = useState(false);
  const [hunterRevengeData, setHunterRevengeData] = useState<{ hunterId: string; hunterName: string } | null>(null);
  
  // Victory Modal State
  const [gameWinner, setGameWinner] = useState<WinResult | null>(null);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  
  // Cupid Lovers Modal State
  const [showCupidModal, setShowCupidModal] = useState(false);
  const [loversInfo, setLoversInfo] = useState<{ player1Id: string; player2Id: string; player1Name: string; player2Name: string; sameTeam: boolean } | null>(null);
  const [showLoversReveal, setShowLoversReveal] = useState(false);
  
  // Pastor Bless Modal State
  const [showPastorModal, setShowPastorModal] = useState(false);
  const [hasUsedBless, setHasUsedBless] = useState(false);

  // Medium Scry Modal State
  const [showMediumModal, setShowMediumModal] = useState(false);

  // Traitor (Kẻ Phản Bội) Modal State
  const [showTraitorModal, setShowTraitorModal] = useState(false);

  // Bewitched (Bị Quyến) Transform Alert State
  const [showBewitchedAlert, setShowBewitchedAlert] = useState(false);

  // Cult Leader (Chủ Giáo Phái) Modal State
  const [showCultRecruitModal, setShowCultRecruitModal] = useState(false);
  
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
      router.replace('/(tabs)/game');
    }
  }, [session, router]);

  // Calculate derived values with safe checks BEFORE useCallback hooks
  const scenario = session ? availableScenarios.find((s) => s.id === session.scenarioId) : undefined;
  const isNightPhase = session?.currentPhase.type === 'NIGHT';
  const nightSequence = scenario && session ? getNightSequence(
       scenario, 
       availableRoles, 
       session.currentPhase.number, 
       session.nightOrder
  ) : [];
  
  const currentRole = isNightPhase ? nightSequence[currentRoleIndex] : null;
  const alivePlayers = session?.players.filter(p => p.isAlive) || [];

  // ── Auto-open Cupid modal when Night 1 reaches Cupid's turn ──────────
  useEffect(() => {
    if (
      currentRole?.id === 'than_tinh_yeu' &&
      session?.currentPhase.number === 1 &&
      !session?.loversAssigned &&
      !showCupidModal &&
      !showLoversReveal
    ) {
      setShowCupidModal(true);
    }
  }, [currentRoleIndex, currentRole?.id, session?.currentPhase.number, session?.loversAssigned]);

  // ── Auto-open Cult Leader modal when reaching Cult Leader's turn ──────
  useEffect(() => {
    if (
      currentRole?.id === 'chu_giao_phai' &&
      !showCultRecruitModal
    ) {
      // Only auto-open if leader is alive
      const leader = session?.players.find(p => p.roleId === 'chu_giao_phai' && p.isAlive);
      if (leader) {
        setShowCultRecruitModal(true);
      }
    }
  }, [currentRoleIndex, currentRole?.id]);

  // Physical Card Mode Detection
  const isPhysicalCardMode = session?.mode === 'PHYSICAL_CARD';
  const isNight1 = session?.currentPhase.type === 'NIGHT' && session.currentPhase.number === 1;
  const shouldShowRoleAssignment = isPhysicalCardMode && isNight1;
  const shouldShowViewRole = isPhysicalCardMode && !isNight1 && isNightPhase;

  // Helper functions with safe checks
  const getRoleQuantity = (roleId: string) => {
    const roleDef = scenario?.roles.find(r => r.roleId === roleId);
    return roleDef ? roleDef.quantity : 0;
  };

  const getAssignedPlayersForRole = (roleId: string) => {
    return session?.players.filter(p => p.roleId === roleId) || [];
  };

  const isRoleFullyAssigned = (roleId: string) => {
    const quantity = getRoleQuantity(roleId);
    const assignedCount = getAssignedPlayersForRole(roleId).length;
    return assignedCount >= quantity;
  };

  const areAllRolesAssigned = () => {
    return session?.players.every(p => p.roleId !== null) ?? false;
  };

  const roleManager = getRoleManager();

  const getCurrentNightAction = (): NightAction | undefined => {
    if (!currentRole) return undefined;
    const fullRole = roleManager.getRoleById(currentRole.id);
    return fullRole?.skills?.nightAction;
  };

  const getWolfVictim = () => {
    // Only valid in Night phase
    if (!session || session.currentPhase.type !== 'NIGHT') return null;
    
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
    
    return session?.players.find(p => p.id === victimId);
  };

  // Win Condition Checking
  const checkWinCondition = () => {
    // Get fresh state explicitly to avoid stale data after state updates
    const currentSession = useGameStore.getState().session;
    if (!currentSession && !session) return; // No session to check
    const players = currentSession?.players || session?.players || [];
    const allPlayers = players;
    const freshAlivePlayers = players.filter(p => p.isAlive);

    // Helper: effective team accounting for Traitor and Bị Quyến
    const effectiveTeam = (player: typeof allPlayers[0]) => {
      if ((player as any).isTraitor) return 'werewolf';
      if (player.roleId === 'bi_quyen') {
        const bs = (player as any).bewitchedState as string | undefined;
        if (bs === 'WOLF') return 'werewolf';
        if (bs === 'VAMPIRE') return 'vampire';
        return 'villager';
      }
      const role = availableRoles.find(r => r.id === player.roleId);
      return role?.team ?? 'villager';
    };
    
    // Check individual wins
    for (const player of allPlayers) {
      if (!player.isAlive && player.killedBy === 'execution') {
        const role = availableRoles.find(r => r.id === player.roleId);
        
        // Tanner win
        if (role?.winConditions?.primary === 'dieByExecution' || player.roleId === 'ke_chan_doi') {
          const tannerWin: WinResult = {
            hasWinner: true,
            winnerType: 'individual',
            winner: player.roleId || 'ke_chan_doi',
            winnerPlayerIds: [player.id],
            winCondition: 'dieByExecution',
            message: `😔 ${role?.name || 'Kẻ Chán Đời'} (${player.name}) đã bị treo cổ — ước nguyện cuối cùng đã thành!`,
          };
          setGameWinner(tannerWin);
          setShowVictoryModal(true);
          return;
        }
      }
    }

    // ── Cult Leader win: all alive non-leader players are cult members ──
    const cultLeader = freshAlivePlayers.find(p => p.roleId === 'chu_giao_phai');
    if (cultLeader) {
      const otherAlive = freshAlivePlayers.filter(p => p.id !== cultLeader.id);
      if (otherAlive.length > 0 && otherAlive.every(p => p.isCultMember)) {
        const cultWin: WinResult = {
          hasWinner: true,
          winnerType: 'individual',
          winner: 'chu_giao_phai',
          winnerPlayerIds: [cultLeader.id],
          winCondition: 'allAliveBelongToCult',
          message: `🙏 Chủ Giáo Phái (${cultLeader.name}) đã kết nạp hết tất cả người chơi còn sống vào giáo phái!`,
        };
        setGameWinner(cultWin);
        setShowVictoryModal(true);
        return;
      }
    }

    // ── Lovers win: exactly 2 alive, both are lovers from different teams ──
    const loversAlive = freshAlivePlayers.filter(p => (p as any).isLover);
    if (loversAlive.length === 2 && freshAlivePlayers.length === 2) {
      const lp1 = loversAlive[0];
      const lp2 = loversAlive[1];
      if ((lp1 as any).loverId === lp2.id && effectiveTeam(lp1) !== effectiveTeam(lp2)) {
        const loversWin: WinResult = {
          hasWinner: true,
          winnerType: 'team',
          winner: 'lovers',
          winnerPlayerIds: [lp1.id, lp2.id],
          winCondition: 'loversWin',
          message: `💕 Cặp Đôi ${lp1.name} & ${lp2.name} là 2 người cuối cùng sống sót — tình yêu chiến thắng tất cả!`,
        };
        setGameWinner(loversWin);
        setShowVictoryModal(true);
        return;
      }
    }
    
    // Get team counts
    const aliveWerewolves = freshAlivePlayers.filter(p => effectiveTeam(p) === 'werewolf');
    const aliveVillagers  = freshAlivePlayers.filter(p => effectiveTeam(p) === 'villager');
    const aliveVampires   = freshAlivePlayers.filter(p => effectiveTeam(p) === 'vampire');

    // Werewolf win: wolves >= non-wolves
    const nonWerewolves = freshAlivePlayers.filter(p => effectiveTeam(p) !== 'werewolf');

    if (aliveWerewolves.length > 0 && aliveWerewolves.length >= nonWerewolves.length) {
      const werewolfWin: WinResult = {
        hasWinner: true,
        winnerType: 'team',
        winner: 'werewolf',
        winnerPlayerIds: aliveWerewolves.map(p => p.id),
        winCondition: 'werewolfTeamWins',
      };
      setGameWinner(werewolfWin);
      setShowVictoryModal(true);
      return;
    }
    
    // Villager win: all werewolves dead
    if (aliveWerewolves.length === 0 && aliveVampires.length === 0 && aliveVillagers.length > 0) {
      const villagerWin: WinResult = {
        hasWinner: true,
        winnerType: 'team',
        winner: 'villager',
        winnerPlayerIds: aliveVillagers.map(p => p.id),
        winCondition: 'villagerTeamWins',
      };
      setGameWinner(villagerWin);
      setShowVictoryModal(true);
      return;
    }
  };

  // Skill Modal Handlers
  const handleOpenSkillModal = (actionType?: string) => {
    // Check for special role-specific modals
    if (currentRole?.id === 'than_tinh_yeu') {
      // Cupid only acts on Night 1, once per game
      if (session?.currentPhase.number === 1 && !session?.loversAssigned) {
        handleOpenCupidModal();
      }
      // On Night 2+ or after lovers assigned → no-op (firstNightOnly)
      return;
    }

    if (currentRole?.id === 'chu_giao_phai') {
      // Cult Leader recruits every night
      const leader = session?.players.find(p => p.roleId === 'chu_giao_phai' && p.isAlive);
      if (leader) {
        setShowCultRecruitModal(true);
      }
      return;
    }
    
    if (currentRole?.id === 'muc_su') {
      // Pastor has special bless modal
      handleOpenPastorModal();
      return;
    }

    if (currentRole?.id === 'ba_dong') {
      // Medium has special scry modal
      handleOpenMediumModal();
      return;
    }
    
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
    if (!session) return;
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
      // Search backwards for the last successful action by this role
      const lastActionLog = [...session.matchLog].reverse().find(log => 
        log.type === 'ROLE_ACTION' &&
        log.metadata?.roleId === currentRole.id &&
        log.metadata?.targetPlayerId &&
        log.phase?.type === 'NIGHT' &&
        log.phase?.number === previousNightNumber
      );

      // If we found a previous action (implied from the immediately preceding night by filter)
      if (lastActionLog) {
          
        const lastTargetId = lastActionLog.metadata!.targetPlayerId;
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

    // Night-1 only: after wolf-team confirms kill, open Traitor selection
    // if ke_phan_boi is in scenario and not yet assigned
    const currentRoleObj = availableRoles.find(r => r.id === currentRole.id);
    if (
      isNight1 &&
      currentRoleObj?.team === 'werewolf' &&
      scenario?.roles.some(r => r.roleId === 'ke_phan_boi') &&
      !session.traitorAssigned
    ) {
      setShowTraitorModal(true);
    }
  };

  // --- CUPID & PASTOR HANDLERS ---
  
  const handleOpenCupidModal = () => {
    setShowCupidModal(true);
  };
  
  const handleConfirmLovers = (player1Id: string, player2Id: string) => {
    if (!session) return;
    // Persist lovers in the store
    assignLovers(player1Id, player2Id);
    // Record the action for night resolution
    recordNightAction('than_tinh_yeu', player1Id, 'createLovers');
    // Record second target in metadata (we'll need to handle this specially)
    recordNightAction('than_tinh_yeu', player2Id, 'createLovers_target2');
    
    // Get player names and team info for reveal modal
    const player1 = session.players.find(p => p.id === player1Id);
    const player2 = session.players.find(p => p.id === player2Id);
    
    if (player1 && player2) {
      const role1 = availableRoles.find(r => r.id === player1.roleId);
      const role2 = availableRoles.find(r => r.id === player2.roleId);
      const sameTeam = role1?.team === role2?.team;
      
      setLoversInfo({
        player1Id,
        player2Id,
        player1Name: player1.name,
        player2Name: player2.name,
        sameTeam,
      });
      setShowLoversReveal(true);
    }
    
    setShowCupidModal(false);
  };

  // --- CULT LEADER HANDLERS ---

  const handleConfirmCultRecruit = (targetId: string) => {
    if (!session) return;
    recruitToCult(targetId);
    recordNightAction('chu_giao_phai', targetId, 'recruit');
    setShowCultRecruitModal(false);

    // Check cult win immediately after recruit
    checkCultWin();
  };

  const handleSkipCultRecruit = () => {
    recordNightAction('chu_giao_phai', null, undefined);
    setShowCultRecruitModal(false);
  };

  /**
   * Check if Cult Leader has won (all alive non-leader players are members).
   * Fires after recruit AND after any death.
   */
  const checkCultWin = () => {
    const currentSession = useGameStore.getState().session;
    if (!currentSession) return;
    const players = currentSession.players;

    const leader = players.find(p => p.roleId === 'chu_giao_phai' && p.isAlive);
    if (!leader) return; // Leader dead → cult can never win

    const otherAlive = players.filter(p => p.isAlive && p.id !== leader.id);
    if (otherAlive.length === 0) return; // Need at least 1 other alive

    const allRecruited = otherAlive.every(p => p.isCultMember);
    if (allRecruited) {
      const cultWin: WinResult = {
        hasWinner: true,
        winnerType: 'individual',
        winner: 'chu_giao_phai',
        winnerPlayerIds: [leader.id],
        winCondition: 'allAliveBelongToCult',
        message: `🙏 Chủ Giáo Phái (${leader.name}) đã kết nạp hết tất cả người chơi còn sống vào giáo phái!`,
      };
      setGameWinner(cultWin);
      setShowVictoryModal(true);
    }
  };
  
  const handleOpenPastorModal = () => {
    if (!session) return;
    // Check if bless was already used in history
    const blessUsedInHistory = session.matchLog.some(l => 
      l.metadata?.roleId === 'muc_su' && l.metadata?.actionType === 'bless'
    );
    setHasUsedBless(blessUsedInHistory);
    setShowPastorModal(true);
  };
  
  const handleConfirmBless = (targetId: string) => {
    // Use the dedicated pastorBless action (tracks state + isBlessed on player)
    pastorBless(targetId);
    recordNightAction('muc_su', targetId, 'bless');
    setHasUsedBless(true);
    setShowPastorModal(false);
  };

  const handleSkipBless = () => {
    // Skip this night without using bless
    recordNightAction('muc_su', null, undefined);
    setShowPastorModal(false);
  };

  // ── Medium handlers ────────────────────────────────────────────────────
  const handleOpenMediumModal = () => {
    setShowMediumModal(true);
  };

  const handleConfirmScry = (targetId: string) => {
    mediumScry(targetId);
    recordNightAction('ba_dong', targetId, 'detectRole');
    // Modal stays open to show the result overlay – closed from within MediumScryModal
  };

  const handleSkipScry = () => {
    recordNightAction('ba_dong', null, undefined);
    setShowMediumModal(false);
  };

  // --- TRAITOR HANDLERS ---

  const handleConfirmTraitor = (playerId: string) => {
    assignTraitor(playerId);
    // setShowTraitorModal is handled inside the modal's onClose
  };

  const handleSkipTraitor = () => {
    // No traitor assigned this game; modal closes itself
  };

  // --- BEWITCHED ALERT HANDLERS ---

  const handleDismissBewitchedAlert = () => {
    setShowBewitchedAlert(false);
    clearTransformedThisNight();
  };

  // --- NAVIGATION HANDLERS ---
  
  const handleNightEnd = () => {
     if (!session) return;
     const results = resolveNightEvents(
         session.nightActions,
         session.players,
         availableRoles,
         session.players.filter(p => !p.isAlive).map(p => p.id)
     );

     setMorningMessages(results.messages);
     setPendingDeadIds(results.deadPlayerIds);

     // Store Bewitched biting info for the GM alert in MorningReportModal
     if (results.bewitchedBitten && results.bewitchedBitten.length > 0) {
       setPendingBewitchedBitten(results.bewitchedBitten.map(b => ({
         playerId: b.playerId,
         playerName: session.players.find(p => p.id === b.playerId)?.name ?? b.playerId,
         killedBy: b.killedBy,
       })));
     } else {
       setPendingBewitchedBitten([]);
     }

     setMorningReportVisible(true);
  };

  const handleConfirmMorningReport = () => {
     if (!session) return;
     // Process deaths
     if (pendingDeadIds.length > 0) {
         // Pre-compute grief victims (lovers whose partner dies tonight)
         const griefVictimIds: string[] = [];
         pendingDeadIds.forEach(deadId => {
           const dead = session.players.find(p => p.id === deadId);
           if (dead?.isLover && dead.loverId) {
             const partner = session.players.find(
               p => p.id === dead.loverId && p.isAlive && !pendingDeadIds.includes(p.id)
             );
             if (partner && !griefVictimIds.includes(partner.id)) {
               griefVictimIds.push(partner.id);
             }
           }
         });

         processNightDeaths(pendingDeadIds); // Store also kills grief victims
         
         // Show grief alert
         if (griefVictimIds.length > 0) {
           const griefNames = griefVictimIds
             .map(id => session.players.find(p => p.id === id)?.name)
             .filter(Boolean)
             .join(', ');
           Alert.alert(
             '\ud83d\udc94 Li\u00ean K\u1ebft T\u00ecnh Y\u00eau',
             `${griefNames} ch\u1ebft theo v\u00ec m\u1ea5t ng\u01b0\u1eddi y\u00eau.`,
             [{ text: 'OK' }]
           );
         }

         // Check if any hunter died (night dead + grief dead) - trigger revenge
         const allDeadIds = [...pendingDeadIds, ...griefVictimIds];
         const hunterPlayer = session.players.find(p => 
           allDeadIds.includes(p.id) && p.roleId === 'tho_san'
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

     // Handle Bewitched (bi_quyen) survivors – call store action and clear state
     if (pendingBewitchedBitten.length > 0) {
       pendingBewitchedBitten.forEach(b => markBewitchedBitten(b.playerId, b.killedBy));
       setPendingBewitchedBitten([]);
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
    if (!session) return;
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

  // Early return AFTER all hooks to prevent "Rendered fewer hooks than expected" error
  if (!session) {
    return <View style={styles.container} />;
  }

  const lynchedPlayer = lynchTarget ? session.players.find(p => p.id === lynchTarget) : null;

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
    if (!session || !lynchTarget) return;
    if (lynchTarget) {
      const lynched = session.players.find(p => p.id === lynchTarget);
      if (!lynched) return;

      // Pre-compute grief victim
      const griefPartner = (lynched.isLover && lynched.loverId)
        ? session.players.find(p => p.id === lynched.loverId && p.isAlive)
        : null;

      lynchPlayer(lynchTarget);

      // Show grief alert
      if (griefPartner) {
        Alert.alert(
          '\ud83d\udc94 Li\u00ean K\u1ebft T\u00ecnh Y\u00eau',
          `${griefPartner.name} ch\u1ebft theo v\u00ec m\u1ea5t ng\u01b0\u1eddi y\u00eau (${lynched.name}).`,
          [{ text: 'OK' }]
        );
      }
      
      // Check Hunter revenge: lynched person OR grief victim
      const hunterCandidates = [lynched, griefPartner].filter(
        (p): p is NonNullable<typeof p> => !!p && p.roleId === 'tho_san'
      );

      if (hunterCandidates.length > 0) {
        setHunterRevengeData({
          hunterId: hunterCandidates[0].id,
          hunterName: hunterCandidates[0].name,
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
    // After advancing, check if any Bị Quyến players transformed
    const freshSession = useGameStore.getState().session;
    if (freshSession?.transformedThisNight && freshSession.transformedThisNight.length > 0) {
      setShowBewitchedAlert(true);
    }
  };
  
  // Hunter Revenge Handlers
  const handleHunterShoot = (targetId: string) => {
    if (!session || !hunterRevengeData) return;
    if (hunterRevengeData) {
      // Pre-compute grief victim of the shot player
      const shotPlayer = session.players.find(p => p.id === targetId);
      const griefPartner = (shotPlayer?.isLover && shotPlayer.loverId)
        ? session.players.find(p => p.id === shotPlayer.loverId && p.isAlive && p.id !== hunterRevengeData.hunterId)
        : null;

      processDeathWithCause(targetId, 'hunter');
      
      // Show grief alert
      if (griefPartner) {
        Alert.alert(
          '\ud83d\udc94 Li\u00ean K\u1ebft T\u00ecnh Y\u00eau',
          `${griefPartner.name} ch\u1ebft theo v\u00ec m\u1ea5t ng\u01b0\u1eddi y\u00eau (${shotPlayer!.name}).`,
          [{ text: 'OK' }]
        );
      }

      setShowHunterRevenge(false);
      setHunterRevengeData(null);

      // If grief victim is also a Hunter, trigger secondary revenge
      if (griefPartner?.roleId === 'tho_san') {
        setHunterRevengeData({
          hunterId: griefPartner.id,
          hunterName: griefPartner.name,
        });
        setShowHunterRevenge(true);
        return;
      }
      
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
    if (!session) return;
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

  // --- SIDEBAR HANDLERS ---
  const handlePauseGame = () => {
    setIsTimerRunning(false);
    setIsSidebarOpen(false);
    Alert.alert('Đã tạm dừng', 'Trò chơi (bộ đếm giờ) đã được tạm dừng.', [{ text: 'OK' }]);
  };

  const handleRestartGame = () => {
    if (!session) return;
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
                    let disabledReason = '';
                    
                    if (action && !action.canTargetSelf) {
                       const assignedPlayers = getAssignedPlayersForRole(currentRole?.id || '');
                       if (assignedPlayers.some(p => p.id === player.id)) {
                          isDisabled = true;
                          disabledReason = '(Không thể chọn chính mình)';
                       }
                    }

                    // Check for consecutive target restriction
                    if (!isDisabled && action && action.restrictions?.includes('cannotTargetSamePersonConsecutively')) {
                        const previousNightNumber = session.currentPhase.number - 1;
                        // Search backwards for the last successful action by this role
                        const lastActionLog = [...session.matchLog].reverse().find(log => 
                          log.type === 'ROLE_ACTION' &&
                          log.metadata?.roleId === currentRole?.id &&
                          log.metadata?.targetPlayerId &&
                          log.phase?.type === 'NIGHT' &&
                          log.phase?.number === previousNightNumber
                        );

                        // If we found a previous action from the immediately preceding night
                        if (lastActionLog) {
                            
                          const lastTargetId = lastActionLog.metadata!.targetPlayerId;
                          if (player.id === lastTargetId) {
                              isDisabled = true;
                              disabledReason = '(Đã chọn đêm trước)';
                          }
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
                          {isDisabled && <Text style={styles.playerRoleText}>{disabledReason || '(Không thể chọn)'}</Text>}
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
         bewitchedBitten={pendingBewitchedBitten}
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
       
       {/* CUPID LOVERS MODAL */}
       <CupidLoversModal
         visible={showCupidModal}
         onClose={() => setShowCupidModal(false)}
         onConfirm={handleConfirmLovers}
         players={alivePlayers}
         cupidId={session.players.find(p => p.roleId === 'than_tinh_yeu')?.id || ''}
         availableRoles={availableRoles}
       />
       
       {/* PASTOR BLESS MODAL */}
       <PastorBlessModal
         visible={showPastorModal}
         onClose={() => setShowPastorModal(false)}
         onConfirm={handleConfirmBless}
         onSkip={handleSkipBless}
         players={alivePlayers}
         hasUsedBless={hasUsedBless}
         pastorId={session.players.find(p => p.roleId === 'muc_su')?.id || ''}
         availableRoles={availableRoles}
       />

       {/* MEDIUM SCRY MODAL */}
       <MediumScryModal
         visible={showMediumModal}
         onClose={() => setShowMediumModal(false)}
         onScry={handleConfirmScry}
         onSkip={handleSkipScry}
         players={alivePlayers}
         mediumId={session.players.find(p => p.roleId === 'ba_dong')?.id || ''}
         availableRoles={availableRoles}
         lastResult={session.mediumLastResult}
         onClearResult={() => { clearMediumResult(); setShowMediumModal(false); }}
       />
       
       {/* TRAITOR SELECT MODAL */}
       <TraitorSelectModal
         visible={showTraitorModal}
         onClose={() => setShowTraitorModal(false)}
         onConfirm={handleConfirmTraitor}
         onSkip={handleSkipTraitor}
         players={session.players}
         availableRoles={availableRoles}
         wolfPlayerIds={session.players
           .filter(p => availableRoles.find(r => r.id === p.roleId)?.team === 'werewolf')
           .map(p => p.id)}
       />

       {/* BEWITCHED TRANSFORM ALERT */}
       <BewitchedTransformAlert
         visible={showBewitchedAlert}
         onDismiss={handleDismissBewitchedAlert}
         transforms={useGameStore.getState().session?.transformedThisNight ?? []}
         players={session.players}
       />

       {/* CULT LEADER RECRUIT MODAL */}
       <CultRecruitModal
         visible={showCultRecruitModal}
         onClose={() => setShowCultRecruitModal(false)}
         onConfirm={handleConfirmCultRecruit}
         onSkip={handleSkipCultRecruit}
         players={session.players}
         cultLeaderId={session.players.find(p => p.roleId === 'chu_giao_phai')?.id || ''}
         cultMemberIds={session.cultMemberIds ?? []}
         availableRoles={availableRoles}
       />

       {/* LOVERS REVEAL MODAL */}
       <LoversRevealModal
         visible={showLoversReveal}
         onClose={() => {
           setShowLoversReveal(false);
           setLoversInfo(null);
         }}
         loversInfo={loversInfo}
         players={session.players}
         availableRoles={availableRoles}
       />
       
       {/* VICTORY MODAL */}
       {showVictoryModal && gameWinner && (
         <VictoryModal
           visible={showVictoryModal}
           winResult={gameWinner}
           players={session.players}
           availableRoles={availableRoles}
           onContinue={() => setShowVictoryModal(false)}
           onNewGame={() => {
             saveMatchToHistory(gameWinner.winner ?? 'unknown');
             setShowVictoryModal(false);
             setGameWinner(null);
             clearGame();
           }}
           onEndGame={() => {
             saveMatchToHistory(gameWinner.winner ?? 'unknown');
             setShowVictoryModal(false);
             clearGame();
           }}
         />
       )}
     </View>
  );
}
