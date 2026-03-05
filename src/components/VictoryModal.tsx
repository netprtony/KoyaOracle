import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { WinResult } from '../engine/WinConditionChecker';

interface Player {
  id: string;
  name: string;
  roleId: string | null;
  color: string;
  isAlive: boolean;
}

interface VictoryModalProps {
  visible: boolean;
  winResult: WinResult;
  players: Player[];
  availableRoles: any[];
  onContinue: () => void;
  onNewGame: () => void;
  onEndGame: () => void;
}

// Team colors and display info
const TEAM_INFO = {
  werewolf: {
    primary: '#ef4444',
    bg: '#7f1d1d',
    icon: '🐺',
    name: 'PHE SÓI',
    message: 'Phe Sói đã chiến thắng!'
  },
  villager: {
    primary: '#10b981',
    bg: '#064e3b',
    icon: '👥',
    name: 'PHE DÂN LÀNG',
    message: 'Phe Dân Làng đã chiến thắng!'
  },
  neutral: {
    primary: '#f59e0b',
    bg: '#78350f',
    icon: '⚖️',
    name: 'TRUNG LẬP',
    message: 'Chiến thắng cá nhân!'
  },
  vampire: {
    primary: '#a855f7',
    bg: '#581c87',
    icon: '🧛',
    name: 'PHE MA CÀ RỒNG',
    message: 'Phe Ma Cà Rồng đã chiến thắng!'
  },
  lovers: {
    primary: '#ec4899',
    bg: '#831843',
    icon: '💕',
    name: 'CẶP ĐÔI',
    message: 'Cặp đôi đã chiến thắng!'
  },
  twins: {
    primary: '#06b6d4',
    bg: '#164e63',
    icon: '👯',
    name: 'SONG SINH',
    message: 'Cặp song sinh đã chiến thắng!'
  },
  cult: {
    primary: '#8b5cf6',
    bg: '#4c1d95',
    icon: '🔮',
    name: 'GIÁO PHÁI',
    message: 'Giáo phái đã chiến thắng!'
  }
};

export const VictoryModal: React.FC<VictoryModalProps> = ({
  visible,
  winResult,
  players,
  availableRoles,
  onContinue,
  onNewGame,
  onEndGame,
}) => {
  if (!winResult.hasWinner) return null;

  // Determine team info based on winner
  let teamInfo = TEAM_INFO.neutral;
  
  if (winResult.winnerType === 'team' && typeof winResult.winner === 'string') {
    teamInfo = TEAM_INFO[winResult.winner as keyof typeof TEAM_INFO] || TEAM_INFO.neutral;
  } else if (winResult.winnerType === 'group' && typeof winResult.winner === 'string') {
    teamInfo = TEAM_INFO[winResult.winner as keyof typeof TEAM_INFO] || TEAM_INFO.neutral;
  } else if (winResult.winnerType === 'individual') {
    // For individual (neutral) wins, try to show the specific role info
    const winnerRole = typeof winResult.winner === 'string'
      ? availableRoles.find(r => r.id === winResult.winner)
      : null;
    if (winnerRole) {
      teamInfo = {
        primary: '#f59e0b',
        bg: '#78350f',
        icon: winnerRole.iconEmoji || '⚖️',
        name: winnerRole.name?.toUpperCase() || 'TRUNG LẬP',
        message: winResult.message || 'Chiến thắng cá nhân!',
      };
    } else {
      teamInfo = {
        ...TEAM_INFO.neutral,
        message: winResult.message || TEAM_INFO.neutral.message,
      };
    }
  }

  // For group wins (lovers, cult, twins), also use custom message if available
  if (winResult.message && winResult.winnerType !== 'individual') {
    teamInfo = { ...teamInfo, message: winResult.message };
  }

  // Get winner players
  const winnerPlayers = players.filter(p => 
    winResult.winnerPlayerIds?.includes(p.id)
  );

  // Get win condition message
  const getWinConditionMessage = () => {
    // If a custom message is provided, use it for the condition display
    if (winResult.message) return winResult.message;
    
    switch (winResult.winCondition) {
      case 'werewolfTeamWins':
        return 'Số lượng Sói ≥ Dân làng';
      case 'villagerTeamWins':
        return 'Tất cả Sói đã bị tiêu diệt';
      case 'dieByExecution':
        return 'Kẻ Chán Đời bị treo cổ';
      case 'targetsDeadAndSelfAlive':
        return 'Mục tiêu đã chết, Du Côn còn sống';
      case 'beLastTwoSurvivors':
        return 'Là 2 người cuối cùng sống sót';
      case 'allAliveBelongToCult':
        return 'Tất cả người sống là tín đồ';
      default:
        return '';
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onContinue}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalPanel, { borderColor: teamInfo.primary }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.celebrationText}>🎉 CHIẾN THẮNG! 🎉</Text>
            <View style={[styles.teamBadge, { backgroundColor: teamInfo.bg, borderColor: teamInfo.primary }]}>
              <Text style={styles.teamIcon}>{teamInfo.icon}</Text>
              <Text style={[styles.teamName, { color: teamInfo.primary }]}>{teamInfo.name}</Text>
            </View>
            <Text style={styles.victoryMessage}>{teamInfo.message}</Text>
          </View>

          {/* Winner List */}
          <View style={styles.modalBody}>
            <Text style={styles.sectionTitle}>Người chiến thắng:</Text>
            <ScrollView style={styles.winnerList}>
              {winnerPlayers.map(player => {
                const role = availableRoles.find(r => r.id === player.roleId);
                return (
                  <View key={player.id} style={styles.winnerItem}>
                    <View style={styles.winnerInfo}>
                      <View style={[styles.playerColorDot, { backgroundColor: player.color }]} />
                      <View style={styles.winnerDetails}>
                        <Text style={styles.winnerName}>{player.name}</Text>
                        {role && (
                          <Text style={styles.winnerRole}>
                            {role.iconEmoji || role.icon || '❓'} {role.name}
                          </Text>
                        )}
                      </View>
                    </View>
                    <Text style={styles.crownIcon}>👑</Text>
                  </View>
                );
              })}
            </ScrollView>

            {/* Win Condition */}
            {winResult.winCondition && (
              <View style={styles.conditionBox}>
                <Text style={styles.conditionLabel}>Điều kiện thắng:</Text>
                <Text style={styles.conditionText}>{getWinConditionMessage()}</Text>
              </View>
            )}
          </View>

          {/* Footer Buttons */}
          <View style={styles.modalFooter}>
             {/* OPTION 1: Continue Playing */}
            <TouchableOpacity 
              style={[styles.footerBtn, { backgroundColor: '#4B5563' }]} 
              onPress={onContinue}
            >
              <Text style={styles.footerBtnText}>Tiếp tục</Text>
            </TouchableOpacity>

             {/* OPTION 2: New Game */}
            {/* <TouchableOpacity 
              style={[styles.footerBtn, styles.newGameBtn, { backgroundColor: teamInfo.primary }]} 
              onPress={onNewGame}
            >
              <Text style={styles.footerBtnText}>Ván mới</Text>
            </TouchableOpacity> */}
            
             {/* OPTION 3: End Game */}
            <TouchableOpacity 
              style={[styles.footerBtn, { backgroundColor: '#EF4444' }]} 
              onPress={onEndGame}
            >
              <Text style={styles.footerBtnText}>Kết thúc</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalPanel: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: '#1f2937',
    borderRadius: 24,
    padding: 24,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  celebrationText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fbbf24',
    marginBottom: 16,
    textAlign: 'center',
  },
  teamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 3,
    marginBottom: 12,
    gap: 12,
  },
  teamIcon: {
    fontSize: 32,
  },
  teamName: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  victoryMessage: {
    fontSize: 18,
    color: '#d1d5db',
    textAlign: 'center',
    fontWeight: '600',
  },
  modalBody: {
    flex: 1,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#9ca3af',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  winnerList: {
    maxHeight: 300,
  },
  winnerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#374151',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  winnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  playerColorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
  },
  winnerDetails: {
    flex: 1,
  },
  winnerName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  winnerRole: {
    color: '#9ca3af',
    fontSize: 14,
  },
  crownIcon: {
    fontSize: 28,
  },
  conditionBox: {
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  conditionLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  conditionText: {
    fontSize: 16,
    color: '#fbbf24',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  footerBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  newGameBtn: {
    // backgroundColor set dynamically
  },
  closeBtn: {
    backgroundColor: '#4b5563',
  },
  footerBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
