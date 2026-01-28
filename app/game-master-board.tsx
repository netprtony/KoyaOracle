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
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { theme } from '../src/styles/theme';
import { useGameStore } from '../src/store/gameStore';
import { getNightSequence } from '../src/engine/nightSequence';
import { getPhaseDisplay } from '../src/engine/phaseController';
import { getRoleManager } from '../src/engine/RoleManager';
import { DaySubPhase } from '../src/types';
import { NightAction, SkillType } from '../assets/role-types';
import { SwipeableCardStack } from '../app/components/SwipeableCardStack';

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
    lynchPlayer,
    advanceToNight,
    assignRole,
    clearGame,
    initializeGame,
  } = useGameStore();

  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [showLogPanel, setShowLogPanel] = useState(false); // Can remove this if fully verified, but keeping for safety for now or just ignoring it
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showRoleDesc, setShowRoleDesc] = useState(false);
  const [showPlayerListModal, setShowPlayerListModal] = useState(false);

  // Role Assignment Modal States (Night 1 - Physical Card)
  const [showRoleAssignModal, setShowRoleAssignModal] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  
  // View Role Modal States (Night 2+ - Physical Card)
  const [showViewRoleModal, setShowViewRoleModal] = useState(false);
  const [viewingRole, setViewingRole] = useState<{ name: string; icon: string } | null>(null);
  
  // Day sub-phase state
  const [daySubPhase, setDaySubPhase] = useState<DaySubPhase>('SUNRISE');
  const [discussionTime, setDiscussionTime] = useState(DEFAULT_DISCUSSION_TIME);
  const [timeRemaining, setTimeRemaining] = useState(DEFAULT_DISCUSSION_TIME);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [lynchTarget, setLynchTarget] = useState<string | null>(null);
  
  // Skill Modal States
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [skillTargets, setSkillTargets] = useState<string[]>([]);
  
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

  if (!session) return null;

  const scenario = availableScenarios.find((s) => s.id === session.scenarioId);
  const nightSequence = scenario ? getNightSequence(scenario, availableRoles) : [];
  const isNightPhase = session.currentPhase.type === 'NIGHT';
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

  // Skill Modal Handlers
  const handleOpenSkillModal = () => {
    const nightAction = getCurrentNightAction();
    if (!nightAction) return;
    setSkillTargets([]);
    setShowSkillModal(true);
  };

  const handleToggleSkillTarget = (playerId: string) => {
    const nightAction = getCurrentNightAction();
    const targetCount = nightAction?.targetCount || 1;
    
    setSkillTargets(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      } else if (prev.length < targetCount) {
        return [...prev, playerId];
      } else {
        return [...prev.slice(1), playerId];
      }
    });
  };

  const handleConfirmSkillAction = () => {
    const nightAction = getCurrentNightAction();
    if (!currentRole || !nightAction) return;
    
    const targetCount = nightAction.targetCount || 1;
    if (skillTargets.length < targetCount) {
      Alert.alert('Thiếu mục tiêu', `Cần chọn ${targetCount} mục tiêu.`);
      return;
    }
    
    recordNightAction(currentRole.id, skillTargets[0] || null);
    setSelectedTargetId(skillTargets[0] || null);
    
    setShowSkillModal(false);
    setSkillTargets([]);
  };

  // --- NAVIGATION HANDLERS ---

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
        recordNightAction(currentRole.id, selectedTargetId);
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
                      advanceToDay();
                      setCurrentRoleIndex(0);
                      setSelectedTargetId(null);
                      setDaySubPhase('SUNRISE');
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

        advanceToDay();
        setCurrentRoleIndex(0);
        setSelectedTargetId(null);
        setDaySubPhase('SUNRISE');
      }
    }
  }, [
    currentRoleIndex, 
    nightSequence.length, 
    currentRole, 
    selectedTargetId, 
    isNightPhase, 
    shouldShowRoleAssignment, 
    isNight1, 
    isPhysicalCardMode,
    session,
    scenario,
    availableRoles,
    assignRole, 
    advanceToDay, 
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

  useEffect(() => {
    return () => {
      if (viewRoleTimerRef.current) {
        clearTimeout(viewRoleTimerRef.current);
      }
    };
  }, []);

  // Day Phase Handlers
  const handleStartDiscussion = () => {
    setDaySubPhase('DISCUSSION');
    setTimeRemaining(discussionTime);
    setIsTimerRunning(true);
  };

  const handleConfirmLynch = () => {
    if (lynchTarget) {
      lynchPlayer(lynchTarget);
      setDaySubPhase('ANNOUNCEMENT');
    }
  };

  const handleAfterAnnouncement = () => {
    setDaySubPhase('SLEEP_TRANSITION');
    setLynchTarget(null);
  };

  const handleNextNight = () => {
    advanceToNight();
    setCurrentRoleIndex(0);
    setDaySubPhase('SUNRISE');
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

  // --- RENDER HELPERS ---

  const renderRoleCardContent = (role: any, isActive: boolean = false) => {
    const nightAction = getCurrentNightAction();
    const skillInfo = nightAction ? getSkillDisplay(nightAction.type) : null;
    const hasSkill = nightAction && nightAction.type !== 'none';

    // styles.cardInner has flex:1 and padding:24.
    
    return (
      <Pressable 
        style={styles.cardInner}
        onLongPress={isActive ? () => setShowPlayerListModal(true) : undefined}
        delayLongPress={500}
        disabled={!isActive}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardCount}>
            Role {currentRoleIndex + 1} / {nightSequence.length}
          </Text>
          
          {shouldShowRoleAssignment && role && isActive && (
            <TouchableOpacity 
              style={styles.roleAssignBtn}
              onPress={handleOpenRoleAssign}
            >
              <Text style={styles.roleAssignBtnText}>
                {isRoleFullyAssigned(role.id) 
                  ? `✓ ${getAssignedPlayersForRole(role.id).length}/${getRoleQuantity(role.id)}` 
                  : `+ ${getAssignedPlayersForRole(role.id).length}/${getRoleQuantity(role.id)}`}
              </Text>
            </TouchableOpacity>
          )}

          {shouldShowViewRole && role && isActive && (
            <TouchableOpacity 
              style={styles.viewRoleBtn}
              onPress={handleViewRole}
            >
              <Text style={styles.viewRoleBtnText}>👁️</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardIcon}>{role.icon}</Text>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{role.name}</Text>
            {isActive && (
              <TouchableOpacity onPress={() => setShowRoleDesc(true)} style={styles.infoBtn}>
                <Text style={styles.infoBtnText}>ℹ️</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {isActive && hasSkill && skillInfo ? (
          <View style={styles.skillSection}>
            <View style={styles.skillBadge}>
              <Text style={styles.skillIcon}>{skillInfo.icon}</Text>
              <View style={styles.skillInfo}>
                <Text style={styles.skillName}>{skillInfo.name}</Text>
                <Text style={styles.skillFrequency}>{getFrequencyText(nightAction?.frequency)}</Text>
              </View>
              <View style={styles.skillTargetCount}>
                <Text style={styles.skillTargetCountText}>
                  {nightAction?.targetCount || 1} mục tiêu
                </Text>
              </View>
            </View>
            
            {nightAction?.restrictions && nightAction.restrictions.length > 0 && (
              <Text style={styles.restrictionText}>
                ⚠️ {getRestrictionText(nightAction.restrictions)}
              </Text>
            )}
            
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
              onPress={handleOpenSkillModal}
            >
              <Text style={styles.skillActionBtnText}>
                {selectedTargetId 
                  ? `✓ Đã ${skillInfo.verb}` 
                  : `${skillInfo.icon} Chọn để ${skillInfo.verb}`}
              </Text>
            </TouchableOpacity>
          </View>
        ) : isActive ? (
          <View style={styles.instructionSection}>
            <Text style={styles.instructionText}>
              Gọi {role.name} dậy và thực hiện hành động.
            </Text>
            <Text style={styles.swipeHint}>Vuốt để tiếp tục ››</Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  const renderNightPhase = () => {
    // Prepare cards for SwipeableCardStack
    const cards = nightSequence.map((role, index) => ({
      id: role.id,
      icon: role.icon,
      name: role.name,
      content: renderRoleCardContent(role, index === currentRoleIndex),
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
              {alivePlayers.length === 0 ? (
                <Text style={styles.emptyText}>Không còn người chơi sống sót.</Text>
              ) : (
                alivePlayers.map(player => {
                  const isSelected = skillTargets.includes(player.id);
                  const action = getCurrentNightAction();
                  const targetCount = action?.targetCount || 1;
                  
                  let isDisabled = false;
                  if (action && !action.canTargetSelf && player.id === getAssignedPlayersForRole(currentRole?.id || '')[0]?.id) {
                     isDisabled = true;
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
              )}
            </ScrollView>
            
            <View style={styles.modalFooter}>
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
    paddingTop: Platform.OS === 'android' ? 40 : 60,
    paddingBottom: 20,
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
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 12,
    zIndex: 100,
  },
  
  // CARD INNER CONTENT
  cardInner: {
    flex: 1,
    padding: 24,
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
    fontSize: 48,
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
    fontSize: 20,
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
  
  // ACTION BUTTONS
  actionButtonPrimary: {
    flex: 1,
    backgroundColor: '#6366F1',
    paddingVertical: 16,
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
    paddingVertical: 16,
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
});
