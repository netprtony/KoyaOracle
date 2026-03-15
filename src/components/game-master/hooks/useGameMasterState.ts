import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { useGameStore } from '../../../store/gameStore';
import { useRouter } from 'expo-router';
import { getNightSequence } from '../../../engine/nightSequence';
import { getRoleManager } from '../../../engine/RoleManager';
import { DaySubPhase, NightOrderDefinition } from '../../../types';
import { NightAction } from '../../../../assets/role-types';
import { SwipeEffect } from '../../SwipeableCardStack';
import { resolveNightEvents } from '../../../engine/NightResolution';
import { WinResult } from '../../../engine/WinConditionChecker';

const DEFAULT_DISCUSSION_TIME = 180;

export function useGameMasterState() {
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
    markToughGuyBitten,
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
  const [pendingDeathCauses, setPendingDeathCauses] = useState<Record<string, any>>({});
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
         session.players.filter(p => !p.isAlive).map(p => p.id),
         session.currentPhase?.number
     );

     setMorningMessages(results.messages);
     setPendingDeadIds(results.deadPlayerIds);
     setPendingDeathCauses(results.deathCauses ?? {});

     // Persist Tough Guy delayed death scheduling (GM-only)
     if (results.toughGuyBitten && results.toughGuyBitten.length > 0) {
       results.toughGuyBitten.forEach(tg => {
         markToughGuyBitten(tg.playerId, tg.bittenNight, tg.scheduledNight);
       });
     }

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
       processNightDeaths(pendingDeadIds, pendingDeathCauses);

         // Check if any hunter died - trigger revenge
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

     // Clear pending cause map for next night
     setPendingDeathCauses({});

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


  const lynchedPlayer = (session && lynchTarget) ? session.players.find(p => p.id === lynchTarget) : null;

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

      lynchPlayer(lynchTarget);

      // Check Hunter revenge
      const hunterCandidates = [lynched].filter(
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

  return {
    // Core state
    session, availableRoles, scenario,

    // Derived values
    isNightPhase, nightSequence, currentRole, alivePlayers,
    isPhysicalCardMode, isNight1, shouldShowRoleAssignment, shouldShowViewRole,
    lynchedPlayer,

    // Night navigation
    currentRoleIndex, handlePreviousRole, handleNextRole,

    // Day phase
    daySubPhase, setDaySubPhase, timeRemaining, isTimerRunning, setIsTimerRunning,
    lynchTarget, setLynchTarget,
    handleStartDiscussion, handleConfirmLynch, handleAfterAnnouncement, handleNextNight,

    // Sidebar
    isSidebarOpen, setIsSidebarOpen,
    handlePauseGame, handleRestartGame, handleEndGame,
    handleOpenOrderSettings, handleOpenSwipeEffectPicker, handleOpenTimerSettings,

    // Settings
    swipeEffect, setSwipeEffect,
    showSwipeEffectPicker, setShowSwipeEffectPicker,
    roleTimerDuration, setRoleTimerDuration,
    showTimerSettings, setShowTimerSettings,

    // Skill modal
    showSkillModal, setShowSkillModal,
    skillTargets, setSkillTargets,
    activeActionType, setActiveActionType,
    handleOpenSkillModal, handleToggleSkillTarget, handleConfirmSkillAction,

    // Dual action (Witch)
    showDualActionModal, setShowDualActionModal,

    // Role assignment (Physical Card)
    showRoleAssignModal, setShowRoleAssignModal,
    selectedPlayerIds,
    handleOpenRoleAssign, handleTogglePlayerSelection, handleSaveRoleAssignment,
    getRoleQuantity, getAssignedPlayersForRole,

    // View role
    showViewRoleModal, viewingRole,
    handleViewRole, handleCloseViewRole,

    // Role description
    showRoleDesc, setShowRoleDesc,

    // Player list
    showPlayerListModal, setShowPlayerListModal,

    // Order settings
    showOrderSettings, setShowOrderSettings,
    handleSaveOrderSettings,

    // Morning report
    morningReportVisible, morningMessages, pendingBewitchedBitten,
    handleConfirmMorningReport,

    // Seer
    showSeerResult, setShowSeerResult, seerInvestigationTarget,

    // Hunter revenge
    showHunterRevenge, hunterRevengeData,
    handleHunterShoot, handleHunterSkip,

    // Cupid / Lovers
    showCupidModal, setShowCupidModal, handleConfirmLovers,
    showLoversReveal, setShowLoversReveal, loversInfo, setLoversInfo,

    // Pastor
    showPastorModal, setShowPastorModal, hasUsedBless,
    handleConfirmBless, handleSkipBless,

    // Medium
    showMediumModal, setShowMediumModal,
    handleConfirmScry, handleSkipScry,

    // Traitor
    showTraitorModal, setShowTraitorModal,
    handleConfirmTraitor, handleSkipTraitor,

    // Bewitched
    showBewitchedAlert, handleDismissBewitchedAlert,

    // Cult Leader
    showCultRecruitModal, setShowCultRecruitModal,
    handleConfirmCultRecruit, handleSkipCultRecruit,

    // Victory
    showVictoryModal, setShowVictoryModal, gameWinner, setGameWinner,

    // Store actions (needed by modals)
    recordNightAction, clearNightActionForRole, clearMediumResult,
    saveMatchToHistory, clearGame,

    // Helpers
    getCurrentNightAction, getWolfVictim,
  };
}

export type GameMasterState = ReturnType<typeof useGameMasterState>;
