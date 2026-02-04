import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { gameMasterStyles as styles } from './gameMasterStyles';
import { VotingPhase } from './VotingPhase';
import { Player, DaySubPhase } from '../../types';
import { formatTime } from '../../utils/timeUtils';

interface DayPhaseProps {
  subPhase: DaySubPhase;
  phaseNumber: number;
  timeRemaining: number;
  isTimerRunning: boolean;
  onStartDiscussion: () => void;
  onToggleTimer: () => void;
  onStartVoting: () => void;
  onAfterAnnouncement: () => void;
  onNextNight: () => void;
  lynchedPlayer: Player | null; // For announcement
  
  // Voting Props
  alivePlayers: Player[];
  lynchTarget: string | null;
  onSelectLynchTarget: (id: string | null) => void;
  onConfirmLynch: () => void;
  onSkipLynch: () => void;
}

export function DayPhase({
  subPhase,
  phaseNumber,
  timeRemaining,
  isTimerRunning,
  onStartDiscussion,
  onToggleTimer,
  onStartVoting,
  onAfterAnnouncement,
  onNextNight,
  lynchedPlayer,
  alivePlayers,
  lynchTarget,
  onSelectLynchTarget,
  onConfirmLynch,
  onSkipLynch
}: DayPhaseProps) {
  return (
    <View style={styles.dayContainer}>
      {subPhase === 'SUNRISE' && (
        <View style={styles.centerContent}>
          <Text style={styles.giantIcon}>🌅</Text>
          <Text style={styles.phaseHeading}>Trời Sáng</Text>
          <Text style={styles.phaseSubtext}>Đêm {phaseNumber} kết thúc.</Text>
          <TouchableOpacity style={styles.mainBtn} onPress={onStartDiscussion}>
            <Text style={styles.mainBtnText}>Bắt đầu thảo luận</Text>
          </TouchableOpacity>
        </View>
      )}

      {subPhase === 'DISCUSSION' && (
         <View style={styles.centerContent}>
           <Text style={styles.phaseLabel}>THẢO LUẬN</Text>
           <Text style={[styles.timerDisplay, timeRemaining < 30 && styles.timerAlert]}>
             {formatTime(timeRemaining)}
           </Text>
           
           <View style={styles.timerControls}>
             <TouchableOpacity 
                style={styles.iconBtn} 
                onPress={onToggleTimer}
              >
               <Text style={styles.iconBtnText}>{isTimerRunning ? '⏸' : '▶'}</Text>
             </TouchableOpacity>
           </View>
           
           <TouchableOpacity style={styles.mainBtn} onPress={onStartVoting}>
             <Text style={styles.mainBtnText}>Chuyển sang Bỏ phiếu</Text>
           </TouchableOpacity>
         </View>
      )}

      {subPhase === 'VOTING' && (
        <VotingPhase 
          alivePlayers={alivePlayers}
          lynchTarget={lynchTarget}
          onSelectTarget={onSelectLynchTarget}
          onConfirmLynch={onConfirmLynch}
          onSkipLynch={onSkipLynch}
        />
      )}

      {subPhase === 'ANNOUNCEMENT' && (
         <View style={styles.centerContent}>
           <Text style={styles.giantIcon}>{lynchedPlayer ? '💀' : '🕊️'}</Text>
           <Text style={styles.phaseHeading}>KẾT QUẢ</Text>
           <Text style={styles.resultText}>
             {lynchedPlayer 
               ? `${lynchedPlayer.name} đã bị treo cổ.` 
               : 'Không ai bị treo cổ hôm nay.'}
           </Text>
           <TouchableOpacity style={styles.mainBtn} onPress={onAfterAnnouncement}>
             <Text style={styles.mainBtnText}>Tiếp tục</Text>
           </TouchableOpacity>
         </View>
      )}

      {subPhase === 'SLEEP_TRANSITION' && (
         <View style={styles.centerContent}>
           <Text style={styles.giantIcon}>🌙</Text>
           <Text style={styles.phaseHeading}>ĐI NGỦ</Text>
           <Text style={styles.phaseSubtext}>Chuẩn bị cho đêm tiếp theo...</Text>
           <TouchableOpacity style={styles.nightBtn} onPress={onNextNight}>
             <Text style={styles.nightBtnText}>Bắt đầu Đêm {phaseNumber + 1}</Text>
           </TouchableOpacity>
         </View>
      )}
    </View>
  );
}
