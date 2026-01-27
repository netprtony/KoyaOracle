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
} from 'react-native';
import { GestureDetector, Gesture, ScrollView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  withTiming,
} from 'react-native-reanimated';
import { theme } from '../src/styles/theme';
import { useGameStore } from '../src/store/gameStore';
import { getNightSequence } from '../src/engine/nightSequence';
import { getPhaseDisplay } from '../src/engine/phaseController';
import { DaySubPhase } from '../src/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
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
  } = useGameStore();

  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [showLogPanel, setShowLogPanel] = useState(false);
  const [showRoleDesc, setShowRoleDesc] = useState(false);

  
  // Day sub-phase state
  const [daySubPhase, setDaySubPhase] = useState<DaySubPhase>('SUNRISE');
  const [discussionTime, setDiscussionTime] = useState(DEFAULT_DISCUSSION_TIME);
  const [timeRemaining, setTimeRemaining] = useState(DEFAULT_DISCUSSION_TIME);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [lynchTarget, setLynchTarget] = useState<string | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const translateX = useSharedValue(0);

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- NAVIGATION HANDLERS ---

  const handleNextRole = useCallback(() => {
    if (isNightPhase) {
      if (currentRole) {
        recordNightAction(currentRole.id, selectedTargetId);
      }
      
      if (currentRoleIndex < nightSequence.length - 1) {
        setCurrentRoleIndex(prev => prev + 1);
        setSelectedTargetId(null);
        translateX.value = 0; // Immediate reset
      } else {
        advanceToDay();
        setCurrentRoleIndex(0);
        setSelectedTargetId(null);
        setDaySubPhase('SUNRISE');
        translateX.value = 0;
      }
    }
  }, [currentRoleIndex, nightSequence.length, currentRole, selectedTargetId, isNightPhase]);

  const handlePreviousRole = useCallback(() => {
    if (currentRoleIndex > 0) {
      setCurrentRoleIndex(prev => prev - 1);
      setSelectedTargetId(null);
      // Animate previous card in from Left
      translateX.value = -SCREEN_WIDTH;
      translateX.value = withTiming(0, { duration: 300 });
    } else {
      translateX.value = withSpring(0);
    }
  }, [currentRoleIndex]);

  // --- GESTURE & ANIMATION ---

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20]) // prevent accidental swipes
    .onUpdate((event) => {
      if (isNightPhase) {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      if (isNightPhase) {
        if (event.translationX > SWIPE_THRESHOLD) {
          // Swipe Right (Next)
          translateX.value = withTiming(SCREEN_WIDTH, { duration: 200 }, () => {
             runOnJS(handleNextRole)();
          });
        } else if (event.translationX < -SWIPE_THRESHOLD) {
          // Swipe Left (Previous)
          translateX.value = withTiming(-SCREEN_WIDTH, { duration: 200 }, () => {
            runOnJS(handlePreviousRole)();
          });
        } else {
          // Reset
          translateX.value = withSpring(0);
        }
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-15, 0, 15],
      'clamp'
    );
    return {
      transform: [
        { translateX: translateX.value },
        { rotate: `${rotate}deg` }
      ],
    };
  });

  const nextCardStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      Math.abs(translateX.value),
      [0, SCREEN_WIDTH],
      [0.9, 1],
      'clamp'
    );
    const opacity = interpolate(
      Math.abs(translateX.value),
      [0, SCREEN_WIDTH],
      [0.6, 1],
      'clamp'
    );
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  // --- DAY PHASE LOGIC ---

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

  const alivePlayers = session.players.filter((p) => p.isAlive);
  const lynchedPlayer = lynchTarget ? session.players.find(p => p.id === lynchTarget) : null;

  // --- RENDER HELPERS ---

  const renderRoleCard = () => {
    if (!currentRole) return null;
    
    // Calculate next role for "Next Card" preview
    const nextRole = currentRoleIndex < nightSequence.length - 1 
      ? nightSequence[currentRoleIndex + 1] 
      : { name: 'Trời sáng', icon: '🌅' };

    return (
      <View style={styles.cardContainer}>
        {/* Background "Next" Card */}
        <Animated.View style={[styles.card, styles.nextCard, nextCardStyle]}>
          <Text style={styles.cardIconSmall}>{nextRole.icon}</Text>
          <Text style={styles.cardTitleSmall}>{nextRole.name}</Text>
        </Animated.View>

        {/* Active Card */}
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.card, cardStyle]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardCount}>
                Role {currentRoleIndex + 1} / {nightSequence.length}
              </Text>
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.cardIcon}>{currentRole.icon}</Text>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>{currentRole.name}</Text>
                <TouchableOpacity onPress={() => setShowRoleDesc(true)} style={styles.infoBtn}>
                  <Text style={styles.infoBtnText}>ℹ️</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Target Selection in ScrollView inside Card */}
            {currentRole.nightActionType === 'selectTarget' ? (
               <View style={styles.targetSection}>
                 <Text style={styles.sectionTitle}>🎯 Chọn mục tiêu ({alivePlayers.length})</Text>
                 <ScrollView 
                    style={styles.targetList} 
                    contentContainerStyle={{ paddingBottom: 20 }}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                 >
                   {alivePlayers.length === 0 ? (
                      <Text style={styles.emptyText}>Không còn người chơi nào sống.</Text>
                   ) : (
                     alivePlayers.map(player => (
                       <TouchableOpacity
                         key={player.id}
                         style={[
                           styles.targetItem,
                           selectedTargetId === player.id && styles.targetItemSelected,
                           { borderLeftColor: player.color }
                         ]}
                         onPress={() => setSelectedTargetId(player.id)}
                         activeOpacity={0.7}
                       >
                         <Text style={[
                           styles.targetName,
                           selectedTargetId === player.id && styles.targetNameSelected
                         ]}>
                           {player.name}
                         </Text>
                         {selectedTargetId === player.id && <Text style={styles.checkIcon}>✓</Text>}
                       </TouchableOpacity>
                     ))
                   )}
                 </ScrollView>
               </View>
            ) : (
               <View style={styles.instructionSection}>
                 <Text style={styles.instructionText}>
                   Gọi {currentRole.name} dậy và thực hiện hành động.
                 </Text>
                 <Text style={styles.swipeHint}>Vuốt phải để tiếp tục ››</Text>
               </View>
            )}
          </Animated.View>
        </GestureDetector>
        
        {/* Action Bar (Fixed at bottom of screen usually, but here part of card view) */}
        <View style={styles.nightActions}>
          <TouchableOpacity 
            style={styles.actionButtonSecondary} 
            onPress={handlePreviousRole}
            disabled={currentRoleIndex === 0}
          >
            <Text style={[styles.actionBtnTextSec, currentRoleIndex === 0 && { opacity: 0.3 }]}>Previous</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButtonPrimary, !selectedTargetId && currentRole.nightActionType === 'selectTarget' && styles.disabledBtn]} 
            onPress={handleNextRole}
            disabled={currentRole.nightActionType === 'selectTarget' && !selectedTargetId}
          >
            <Text style={styles.actionBtnText}>Next Role</Text>
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
        <TouchableOpacity style={styles.logIconBtn} onPress={() => setShowLogPanel(true)}>
          <Text style={styles.headerIcon}>📜</Text>
        </TouchableOpacity>
      </View>

      {/* BODY */}
      <View style={styles.body}>
        {isNightPhase ? renderRoleCard() : renderDayPhase()}
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827', // darker bg
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 60,
    paddingBottom: 20,
    backgroundColor: '#1F2937', // dark surface
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phaseIndicator: {
    color: '#818CF8', // indigo-400
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
  
  // CARD STYLES
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: SCREEN_WIDTH - 40,
    height: '75%',
    backgroundColor: '#1F2937',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
    padding: 24,
    borderWidth: 1,
    borderColor: '#374151',
    zIndex: 2,
    alignItems: 'center',
  },
  nextCard: {
    position: 'absolute',
    zIndex: 1,
    top: 40, // slightly lower
    transform: [{ scale: 0.9 }],
    backgroundColor: '#111827', // darker
    opacity: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeader: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  cardCount: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    alignItems: 'center',
    marginBottom: 10,
  },
  cardIcon: {
    fontSize: 48, // Reduced from 80
    marginBottom: 4,
  },
  cardIconSmall: {
    fontSize: 40,
    marginBottom: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 24, // Reduced from 28
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
  cardTitleSmall: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#9CA3AF',
  },
  cardDesc: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
  },
  
  // TARGET SELECTION
  targetSection: {
    flex: 1,
    width: '100%',
    marginTop: 4,
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 4,
  },
  sectionTitle: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '600',
    padding: 12,
  },
  targetList: {
    flex: 1,
    paddingHorizontal: 8,
  },
  targetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  targetItemSelected: {
    backgroundColor: '#3730A3', // indigo-900
    borderLeftColor: '#818CF8', // indigo-400
  },
  targetName: {
    color: '#E5E7EB',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
  },
  targetNameSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  checkIcon: {
    color: '#818CF8',
    fontWeight: 'bold',
    fontSize: 20,
    marginLeft: 'auto',
  },
  emptyText: {
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
  
  // INSTRUCTIONS
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

  // CARD ACTIONS
  nightActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
    gap: 12,
  },
  actionButtonPrimary: {
    flex: 1,
    backgroundColor: '#6366F1', // indigo-500
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonSecondary: {
    flex: 1,
    backgroundColor: '#374151',
    paddingVertical: 14,
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
    backgroundColor: '#4C1D95', // violet-900
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
    backgroundColor: '#312E81', // indigo-950
    borderColor: '#818CF8', // indigo-400
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
    justifyContent: 'flex-end',
  },
  modalPanel: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '80%',
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
});
