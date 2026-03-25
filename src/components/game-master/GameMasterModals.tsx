import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useGameStore } from '../../store/gameStore';
import { gameMasterStyles as styles } from './gameMasterStyles';
import { getSkillDisplay } from './constants';
import { TimerSettingsPicker } from '../TimerSettingsPicker';
import { NightOrderEditor } from '../NightOrderEditor';
import { MorningReportModal } from '../MorningReportModal';
import { SeerInvestigationResultModal } from '../SeerInvestigationResultModal';
import { HunterRevengeModal } from '../HunterRevengeModal';
import { VictoryModal } from '../VictoryModal';
import { CupidLoversModal } from '../CupidLoversModal';
import { PastorBlessModal } from '../PastorBlessModal';
import { MediumScryModal } from '../MediumScryModal';
import { LoversRevealModal } from '../LoversRevealModal';
import { TraitorSelectModal } from '../TraitorSelectModal';
import { BewitchedTransformAlert } from '../BewitchedTransformAlert';
import { CultRecruitModal } from '../CultRecruitModal';
import { DuConSelectModal } from '../DuConSelectModal';
import { DoppelgangerSelectModal } from '../DoppelgangerSelectModal';
import { RedRidingHoodRevealModal } from '../RedRidingHoodRevealModal';
import { resolveNightEvents } from '../../engine/NightResolution';
import { GameMasterState } from './hooks/useGameMasterState';

export function GameMasterModals(props: GameMasterState) {
  const {
    session, availableRoles, scenario, currentRole, alivePlayers,
    showSkillModal, setShowSkillModal, skillTargets, setSkillTargets,
    activeActionType, setActiveActionType,
    handleToggleSkillTarget, handleConfirmSkillAction,
    showDualActionModal, setShowDualActionModal,
    showRoleAssignModal, setShowRoleAssignModal,
    selectedPlayerIds, getRoleQuantity, getAssignedPlayersForRole,
    handleTogglePlayerSelection, handleSaveRoleAssignment,
    showRoleDesc, setShowRoleDesc,
    showPlayerListModal, setShowPlayerListModal,
    showOrderSettings, setShowOrderSettings, handleSaveOrderSettings,
    morningReportVisible, morningMessages, pendingBewitchedBitten,
    handleConfirmMorningReport,
    showSeerResult, setShowSeerResult, seerInvestigationTarget,
    showHunterRevenge, hunterRevengeData, handleHunterShoot, handleHunterSkip,
    showCupidModal, setShowCupidModal, handleConfirmLovers,
    showPastorModal, setShowPastorModal, hasUsedBless,
    handleConfirmBless, handleSkipBless,
    showMediumModal, setShowMediumModal, handleConfirmScry, handleSkipScry,
    showLoversReveal, setShowLoversReveal, loversInfo, setLoversInfo,
    showTraitorModal, setShowTraitorModal, handleConfirmTraitor, handleSkipTraitor,
    showBewitchedAlert, handleDismissBewitchedAlert,
    showCultRecruitModal, setShowCultRecruitModal,
    handleConfirmCultRecruit, handleSkipCultRecruit,
    showDuConModal, setShowDuConModal,
    handleConfirmDuConTargets, handleSkipDuConTargets,
    showDoppelgangerModal, setShowDoppelgangerModal,
    handleConfirmDoppelgangerTarget, handleSkipDoppelgangerTarget,
    showRedRidingHoodRevealModal,
    redRidingHoodRevealData, handleCloseRedRidingHoodReveal,
    showVictoryModal, setShowVictoryModal, gameWinner, setGameWinner,
    roleTimerDuration, setRoleTimerDuration,
    showTimerSettings, setShowTimerSettings,
    handleOpenSkillModal,
    recordNightAction, clearNightActionForRole, clearMediumResult,
    saveMatchToHistory, clearGame,
    getCurrentNightAction, getWolfVictim,
  } = props;

  if (!session) return null;

  return (
    <>
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
            <ScrollView
              style={[styles.modalBody, styles.modalBodyScroll]}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
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
            
            <ScrollView
              style={[styles.modalBody, styles.modalBodyScroll]}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
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
                  session.players.filter(p => !p.isAlive).map(p => p.id),
                  session.currentPhase.number,
                  session.wolfInfectedRound
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
            
            <ScrollView
              style={[styles.modalBody, styles.modalBodyScroll]}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
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
            <ScrollView
              style={[styles.modalBody, styles.modalBodyScroll]}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
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

       <DuConSelectModal
         visible={showDuConModal}
         onClose={() => setShowDuConModal(false)}
         onSkip={handleSkipDuConTargets}
         onConfirm={handleConfirmDuConTargets}
         players={session.players}
         selfId={session.duConPlayerId}
       />

       <DoppelgangerSelectModal
         visible={showDoppelgangerModal}
         onClose={() => setShowDoppelgangerModal(false)}
         onSkip={handleSkipDoppelgangerTarget}
         onConfirm={handleConfirmDoppelgangerTarget}
         players={session.players}
         selfId={session.doppelgangerPlayerId}
       />

       <RedRidingHoodRevealModal
         visible={showRedRidingHoodRevealModal}
         onClose={handleCloseRedRidingHoodReveal}
         wolfName={redRidingHoodRevealData?.wolfName}
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
    </>
  );
}
