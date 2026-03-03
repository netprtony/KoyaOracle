import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { gameMasterStyles as styles } from './gameMasterStyles';
import { Player } from '../../types';
import { ManualVotingModal } from '../ManualVotingModal';

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
  const [manualVotes, setManualVotes] = useState<Record<string, { count: number; voters: Player[] }>>({});
  const [selectedPlayerForVoting, setSelectedPlayerForVoting] = useState<Player | null>(null);
  const [showManualVoteModal, setShowManualVoteModal] = useState(false);

  const handleOpenManualVote = (player: Player) => {
    setSelectedPlayerForVoting(player);
    setShowManualVoteModal(true);
  };

  const handleConfirmManualVote = (voteCount: number, voters: Player[]) => {
    if (selectedPlayerForVoting) {
      setManualVotes((prev) => ({
        ...prev,
        [selectedPlayerForVoting.id]: { count: voteCount, voters },
      }));
    }
    setShowManualVoteModal(false);
    setSelectedPlayerForVoting(null);
  };

  const getAvailableVoters = () => {
    if (!selectedPlayerForVoting) return [];
    return alivePlayers.filter((p) => p.id !== selectedPlayerForVoting.id);
  };

  return (
    <View style={styles.phaseContainer}>
      <Text style={styles.phaseHeading}>⚖️ Bỏ Phiếu</Text>
      <Text style={styles.phaseSubtext}>Chọn người chơi để treo cổ • Nhấn giữ để ghi phiếu thủ công</Text>
      
      <ScrollView style={styles.gridList} contentContainerStyle={styles.gridContainer}>
        {alivePlayers.map(player => {
          const voteData = manualVotes[player.id];
          return (
            <View key={player.id} style={styles.voteCardWrapper}>
              <TouchableOpacity
                style={[
                  styles.gridItem,
                  lynchTarget === player.id && styles.gridItemSelected,
                  { borderColor: player.color }
                ]}
                onPress={() => onSelectTarget(player.id === lynchTarget ? null : player.id)}
                onLongPress={() => handleOpenManualVote(player)}
                delayLongPress={220}
              >
                <View style={[styles.playerBadge, { backgroundColor: player.color }]} />
                <Text style={styles.gridName}>{player.name}</Text>
                {voteData && voteData.count > 0 && (
                  <View style={styles.voteBadge}>
                    <Text style={styles.voteBadgeText}>🗳️ {voteData.count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
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

      {selectedPlayerForVoting && (
        <ManualVotingModal
          visible={showManualVoteModal}
          onClose={() => {
            setShowManualVoteModal(false);
            setSelectedPlayerForVoting(null);
          }}
          targetPlayer={selectedPlayerForVoting}
          availablePlayers={getAvailableVoters()}
          onConfirm={handleConfirmManualVote}
        />
      )}
    </View>
  );
}
