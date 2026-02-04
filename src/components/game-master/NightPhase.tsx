import React from 'react';
import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import { gameMasterStyles as styles } from './gameMasterStyles';
import { SwipeableCardStack, SwipeEffect } from '../SwipeableCardStack';
import { CountdownTimer } from '../CountdownTimer';
import { GameSession, Role } from '../../types';
import { getSkillDisplay } from './constants';
import { NightAction } from '../../../assets/role-types';
import { resolveNightEvents } from '../../engine/NightResolution';
import { getRoleManager } from '../../engine/RoleManager';

interface NightPhaseProps {
  session: GameSession;
  availableRoles: Role[];
  nightSequence: Role[];
  currentRoleIndex: number;
  roleTimerDuration: number;
  swipeEffect: SwipeEffect;
  isPhysicalCardMode: boolean;
  isNight1: boolean;
  shouldShowRoleAssignment: boolean;
  shouldShowViewRole: boolean;
  
  // Helpers
  getRoleQuantity: (roleId: string) => number;
  
  // Handlers
  onPreviousRole: () => void;
  onNextRole: () => void;
  onOpenRoleAssign: () => void;
  onViewRole: () => void;
  onShowPlayerList: () => void;
  onShowDualAction: () => void;
  onOpenSkillModal: () => void;
  onShowRoleDesc: () => void;
}

export function NightPhase({
  session,
  availableRoles,
  nightSequence,
  currentRoleIndex,
  roleTimerDuration,
  swipeEffect,
  isPhysicalCardMode,
  isNight1,
  shouldShowRoleAssignment,
  shouldShowViewRole,
  getRoleQuantity,
  onPreviousRole,
  onNextRole,
  onOpenRoleAssign,
  onViewRole,
  onShowPlayerList,
  onShowDualAction,
  onOpenSkillModal,
  onShowRoleDesc
}: NightPhaseProps) {
  
  const currentRole = nightSequence[currentRoleIndex];
  const roleManager = getRoleManager();

  const getAssignedPlayersForRole = (roleId: string) => {
    return session.players.filter(p => p.roleId === roleId);
  };

  const isRoleFullyAssigned = (roleId: string) => {
    const quantity = getRoleQuantity(roleId);
    const assignedCount = getAssignedPlayersForRole(roleId).length;
    return assignedCount >= quantity;
  };

  const getCurrentNightAction = (): NightAction | undefined => {
    if (!currentRole) return undefined;
    const fullRole = roleManager.getRoleById(currentRole.id);
    return fullRole?.skills?.nightAction;
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

  // Helper to get current action status for a role
  const getActionStatusForRole = (roleId: string) => {
    // Check current night actions first
    const currentActions = session.nightActions.filter(a => a.roleId === roleId);
    return currentActions;
  };

  const renderActionStatus = (role: any) => {
    const currentActions = getActionStatusForRole(role.id);
    const nightAction = getCurrentNightAction();
    const skillInfo = nightAction ? getSkillDisplay(nightAction.type) : null;
    
    if (currentActions.length === 0) return null;

    // For dual actions (Witch)
    if (nightAction?.type === 'dual') {
      const healAction = currentActions.find(a => a.actionType === 'heal');
      const killAction = currentActions.find(a => a.actionType === 'kill');
      
      return (
        <View style={styles.actionStatusContainer}>
          {healAction && (
            <View style={styles.actionStatusRow}>
              <Text style={styles.actionStatusIcon}>💊</Text>
              <Text style={styles.actionStatusText}>
                {healAction.targetPlayerId 
                  ? `Đã cứu: ${session.players.find(p => p.id === healAction.targetPlayerId)?.name}`
                  : 'Bỏ qua cứu'}
              </Text>
            </View>
          )}
          {killAction && (
            <View style={styles.actionStatusRow}>
              <Text style={styles.actionStatusIcon}>☠️</Text>
              <Text style={styles.actionStatusText}>
                {killAction.targetPlayerId 
                  ? `Đã giết: ${session.players.find(p => p.id === killAction.targetPlayerId)?.name}`
                  : 'Bỏ qua giết'}
              </Text>
            </View>
          )}
        </View>
      );
    }

    // For single actions
    const action = currentActions[0];
    if (!action || !action.targetPlayerId) return null;

    const targetPlayer = session.players.find(p => p.id === action.targetPlayerId);
    
    return (
      <View style={styles.actionStatusContainer}>
        <View style={styles.actionStatusRow}>
          <Text style={styles.actionStatusIcon}>{skillInfo?.icon || '✓'}</Text>
          <Text style={styles.actionStatusText}>
            Đã {skillInfo?.verb || 'chọn'}: {targetPlayer?.name || 'Không xác định'}
          </Text>
        </View>
      </View>
    );
  };

  const renderRoleCardContent = (role: any, isActive: boolean = false) => {
    const nightAction = getCurrentNightAction();
    const skillInfo = nightAction ? getSkillDisplay(nightAction.type) : null;
    const hasSkill = nightAction && nightAction.type !== 'none';
    const isAssigned = isRoleFullyAssigned(role.id);
    const assignedPlayers = getAssignedPlayersForRole(role.id);
    const areAllAssignedDead = assignedPlayers.length > 0 && assignedPlayers.every(p => !p.isAlive);
    const deadPlayerNames = assignedPlayers.filter(p => !p.isAlive).map(p => p.name).join(', ');

    const currentActions = getActionStatusForRole(role.id);
    const hasActionTaken = currentActions.length > 0;
    
    return (
      <View style={styles.cardInner}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardCount}>
            Role {currentRoleIndex + 1} / {nightSequence.length}
          </Text>
          
          {shouldShowViewRole && role && isActive && (
            <TouchableOpacity 
              style={styles.viewRoleBtn}
              onPress={onViewRole}
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
                  <TouchableOpacity onPress={onShowRoleDesc} style={styles.infoBtn}>
                    <Text style={styles.infoBtnText}>ℹ️</Text>
                  </TouchableOpacity>
              )}
            </View>
          </Text>

          {/* DEAD STATUS */}
          {areAllAssignedDead && (
             <View style={{marginTop: 10, padding: 8, backgroundColor: '#330000', borderRadius: 8}}>
                 <Text style={{color: '#ff4444', fontWeight: 'bold', textAlign: 'center'}}>
                    🚫 ĐÃ CHẾT ({deadPlayerNames})
                 </Text>
             </View>
          )}
        </View>
        
        {/* ACTION STATUS DISPLAY */}
        {isActive && !areAllAssignedDead && hasActionTaken && (
          renderActionStatus(role)
        )}

        {/* SKILL INFO DISPLAY */}
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

              {/* For Witch - show victim info */}
              {nightAction?.type === 'dual' && (
                <View style={{marginTop: 12}}>
                  {(() => {
                    const actionsExcludingWitch = session.nightActions.filter(a => a.roleId !== role.id);
                    // Use resolver logic for visual feedback only
                    // This creates a circular dependency potentially if resolver uses generic types, but it's imported above
                    // Using simplified version or direct access to store if needed
                    const simulation = resolveNightEvents(
                        actionsExcludingWitch,
                        session.players,
                        availableRoles,
                        session.players.filter(p => !p.isAlive).map(p => p.id)
                    );
                    const victimName = simulation.deadPlayerIds.length > 0 
                      ? session.players.filter(p => simulation.deadPlayerIds.includes(p.id)).map(p => p.name).join(', ')
                      : null;
                    
                    return victimName ? (
                      <View style={{backgroundColor: '#450a0a', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ef4444'}}>
                        <Text style={{color: '#fca5a5', fontWeight: 'bold', textAlign: 'center'}}>
                          ⚠️ Đang hấp hối: {victimName}
                        </Text>
                      </View>
                    ) : (
                      <View style={{backgroundColor: '#052e16', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#10b981'}}>
                        <Text style={{color: '#86efac', fontWeight: 'bold', textAlign: 'center'}}>
                          ✓ Đêm nay không ai chết
                        </Text>
                      </View>
                    );
                  })()}
                </View>
              )}

              <Text style={styles.actionHintText}>
                {hasActionTaken ? '↓ Nhấn nút bên dưới để sửa' : '↓ Nhấn nút bên dưới để thực hiện'}
              </Text>
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
  
  // Prepare cards
  const getPlayerNameForRole = (roleId: string): string => {
    const assignedPlayers = getAssignedPlayersForRole(roleId);
    if (assignedPlayers.length > 0) {
      return assignedPlayers.map(p => p.name).join(', ');
    }
    return 'Chưa gán';
  };

  const cards = nightSequence.map((role, index) => ({
    id: role.id,
    icon: role.icon,
    name: role.name,
    playerName: getPlayerNameForRole(role.id),
    content: renderRoleCardContent(role, index === currentRoleIndex),
    onLongPress: index === currentRoleIndex ? onShowPlayerList : undefined,
  }));

  return (
    <Pressable 
      style={styles.nightContainer} 
      onLongPress={onShowPlayerList}
      delayLongPress={400}
    >
      {/* Countdown Timer Bar */}
      {roleTimerDuration > 0 && (
        <View style={styles.timerBar}>
          <CountdownTimer
            key={currentRoleIndex}
            duration={roleTimerDuration}
            autoStart={true}
            showControls={true}
          />
        </View>
      )}
      
      <SwipeableCardStack
        cards={cards}
        currentIndex={currentRoleIndex}
        onSwipeLeft={onPreviousRole}
        onSwipeRight={onNextRole}
        canSwipeLeft={currentRoleIndex > 0}
        canSwipeRight={currentRoleIndex < nightSequence.length - 1 || !shouldShowRoleAssignment || (!!currentRole && isRoleFullyAssigned(currentRole.id))}
        swipeEffect={swipeEffect}
      />
      
      {/* Action Buttons */}
      <View style={styles.nightActionsFixed}>
        <TouchableOpacity 
          style={[styles.actionButtonSmall, currentRoleIndex === 0 && styles.disabledBtn]} 
          onPress={onPreviousRole}
          disabled={currentRoleIndex === 0}
        >
          <Text style={[styles.actionBtnTextSec, currentRoleIndex === 0 && { opacity: 0.3 }]}>
            ‹
          </Text>
        </TouchableOpacity>
        
        {/* CENTRAL ACTION BUTTON LOGIC */}
        {(() => {
          if (!currentRole) return null;
          
          const nightAction = getCurrentNightAction();
          const skillInfo = nightAction ? getSkillDisplay(nightAction.type) : null;
          const hasSkill = nightAction && nightAction.type !== 'none';
          const isAssigned = isRoleFullyAssigned(currentRole.id);
          const assignedPlayers = getAssignedPlayersForRole(currentRole.id);
          const areAllAssignedDead = assignedPlayers.length > 0 && assignedPlayers.every(p => !p.isAlive);
          const currentActions = getActionStatusForRole(currentRole.id);
          const hasActionTaken = currentActions.length > 0;
          
          if (areAllAssignedDead) {
            return (
              <View style={[styles.centralActionButton, styles.centralActionButtonDisabled]}>
                <Text style={styles.centralActionButtonText}>🚫 Đã chết</Text>
              </View>
            );
          }
          
          if (shouldShowRoleAssignment && !isAssigned) {
            return (
              <TouchableOpacity 
                style={[styles.centralActionButton, styles.centralActionButtonAssign]}
                onPress={onOpenRoleAssign}
              >
                <Text style={styles.centralActionButtonText}>
                  + Gán ({getAssignedPlayersForRole(currentRole.id).length}/{getRoleQuantity(currentRole.id)})
                </Text>
              </TouchableOpacity>
            );
          }
          
          if (hasSkill && skillInfo) {
            if (nightAction?.type === 'dual') {
              return (
                <TouchableOpacity 
                  style={[
                    styles.centralActionButton, 
                    hasActionTaken ? styles.centralActionButtonDone : styles.centralActionButtonAction
                  ]}
                  onPress={onShowDualAction}
                >
                  <Text style={styles.centralActionButtonText}>
                    {hasActionTaken ? '✏️ Sửa hành động' : `${skillInfo.icon} Hành động`}
                  </Text>
                </TouchableOpacity>
              );
            }
            
            return (
              <TouchableOpacity 
                style={[
                  styles.centralActionButton, 
                  hasActionTaken ? styles.centralActionButtonDone : styles.centralActionButtonAction
                ]}
                onPress={onOpenSkillModal}
              >
                <Text style={styles.centralActionButtonText}>
                  {hasActionTaken 
                    ? `✏️ Sửa ${skillInfo.verb}` 
                    : `${skillInfo.icon} ${skillInfo.name}`}
                </Text>
              </TouchableOpacity>
            );
          }
          
          if (shouldShowRoleAssignment && isAssigned) {
            return (
              <TouchableOpacity 
                style={[styles.centralActionButton, styles.centralActionButtonDone]}
                onPress={onOpenRoleAssign}
              >
                <Text style={styles.centralActionButtonText}>
                  ✓ Đã gán {getAssignedPlayersForRole(currentRole.id).length}
                </Text>
              </TouchableOpacity>
            );
          }
          
          return (
            <View style={[styles.centralActionButton, styles.centralActionButtonDisabled]}>
              <Text style={styles.centralActionButtonText}>Không có hành động</Text>
            </View>
          );
        })()}
        
        <TouchableOpacity 
          style={styles.actionButtonSmall} 
          onPress={onNextRole}
        >
          <Text style={styles.actionBtnText}>
            {currentRoleIndex === nightSequence.length - 1 ? '✓' : '›'}
          </Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}
