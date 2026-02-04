import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { gameMasterStyles as styles } from './gameMasterStyles';
import { Player } from '../../types';

interface VotingPhaseProps {
  alivePlayers: Player[];
  lynchTarget: string | null;
  onSelectTarget: (playerId: string | null) => void;
  onConfirmLynch: () => void;
  onSkipLynch: () => void;
}

export function VotingPhase({
  alivePlayers,
  lynchTarget,
  onSelectTarget,
  onConfirmLynch,
  onSkipLynch
}: VotingPhaseProps) {
  return (
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
            onPress={() => onSelectTarget(player.id === lynchTarget ? null : player.id)}
          >
            <View style={[styles.playerBadge, { backgroundColor: player.color }]} />
            <Text style={styles.gridName}>{player.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onSkipLynch}>
           <Text style={styles.secondaryBtnText}>Không treo cổ</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.dangerBtn, !lynchTarget && styles.disabledBtn]} 
          onPress={onConfirmLynch}
          disabled={!lynchTarget}
        >
           <Text style={styles.dangerBtnText}>Xác nhận Treo cổ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
