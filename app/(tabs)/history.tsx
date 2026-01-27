import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { database, MatchRecord } from '../../src/utils/database';
import { useGameStore } from '../../src/store/gameStore';
import { getPhaseDisplay } from '../../src/engine/phaseController';

export default function HistoryScreen() {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<MatchRecord | null>(null);
  const { availableScenarios } = useGameStore();

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      setLoading(true);
      const data = await database.getMatches(50);
      setMatches(data);
    } catch (error) {
      console.error('Failed to load matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScenarioName = (scenarioId: string) => {
    const scenario = availableScenarios.find(s => s.id === scenarioId);
    return scenario?.name || 'Kịch bản không xác định';
  };

  const renderMatchDetail = () => {
    if (!selectedMatch) return null;

    const players = JSON.parse(selectedMatch.playersJson);
    const logs = JSON.parse(selectedMatch.logJson);

    return (
      <Modal
        visible={!!selectedMatch}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedMatch(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi Tiết Trận Đấu</Text>
              <TouchableOpacity onPress={() => setSelectedMatch(null)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Match Info */}
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>Kịch bản:</Text>
                <Text style={styles.infoValue}>{getScenarioName(selectedMatch.scenarioId)}</Text>
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>Chế độ:</Text>
                <Text style={styles.infoValue}>
                  {selectedMatch.mode === 'PHYSICAL_CARD' ? '🃏 Physical Card' : '🎲 Random Role'}
                </Text>
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>Thời gian:</Text>
                <Text style={styles.infoValue}>{formatDate(selectedMatch.createdAt)}</Text>
              </View>

              {selectedMatch.winner && (
                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Người thắng:</Text>
                  <Text style={styles.infoValue}>{selectedMatch.winner}</Text>
                </View>
              )}

              {/* Players */}
              <Text style={styles.sectionTitle}>Người Chơi ({players.length})</Text>
              {players.map((player: any, index: number) => (
                <View key={index} style={styles.playerRow}>
                  <View style={[styles.playerBadge, { backgroundColor: player.color }]} />
                  <Text style={styles.playerName}>{player.name}</Text>
                  <Text style={[styles.playerStatus, !player.isAlive && styles.playerDead]}>
                    {player.isAlive ? '✓ Sống' : '✗ Chết'}
                  </Text>
                </View>
              ))}

              {/* Match Log */}
              <Text style={styles.sectionTitle}>Nhật Ký Trận Đấu</Text>
              {logs.map((entry: any) => (
                <View key={entry.id} style={styles.logEntry}>
                  <Text style={styles.logPhase}>{getPhaseDisplay(entry.phase)}</Text>
                  <Text style={styles.logMessage}>{entry.message}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📜 Lịch Sử Trận Đấu</Text>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {loading ? (
          <Text style={styles.emptyText}>Đang tải...</Text>
        ) : matches.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>Chưa có trận đấu nào</Text>
            <Text style={styles.emptySubtext}>Bắt đầu một trò chơi mới từ tab Trò Chơi</Text>
          </View>
        ) : (
          matches.map(match => {
            const players = JSON.parse(match.playersJson);
            return (
              <TouchableOpacity
                key={match.id}
                style={styles.matchCard}
                onPress={() => setSelectedMatch(match)}
                activeOpacity={0.7}
              >
                <View style={styles.matchHeader}>
                  <Text style={styles.matchScenario}>{getScenarioName(match.scenarioId)}</Text>
                  <Text style={styles.matchDate}>{formatDate(match.createdAt)}</Text>
                </View>
                <View style={styles.matchInfo}>
                  <Text style={styles.matchMode}>
                    {match.mode === 'PHYSICAL_CARD' ? '🃏 Physical Card' : '🎲 Random Role'}
                  </Text>
                  <Text style={styles.matchPlayers}>👥 {players.length} người chơi</Text>
                </View>
                {match.winner && (
                  <Text style={styles.matchWinner}>🏆 {match.winner}</Text>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {renderMatchDetail()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F9FAFB',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 18,
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
  },
  matchCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  matchScenario: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F9FAFB',
    flex: 1,
  },
  matchDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  matchInfo: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  matchMode: {
    fontSize: 14,
    color: '#D1D5DB',
  },
  matchPlayers: {
    fontSize: 14,
    color: '#D1D5DB',
  },
  matchWinner: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F9FAFB',
  },
  closeBtn: {
    fontSize: 24,
    color: '#9CA3AF',
  },
  modalBody: {
    flex: 1,
  },
  infoSection: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 16,
    color: '#F9FAFB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#818CF8',
    marginTop: 20,
    marginBottom: 12,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  playerBadge: {
    width: 8,
    height: 24,
    borderRadius: 4,
    marginRight: 12,
  },
  playerName: {
    flex: 1,
    fontSize: 16,
    color: '#F9FAFB',
  },
  playerStatus: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  playerDead: {
    color: '#EF4444',
  },
  logEntry: {
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#818CF8',
  },
  logPhase: {
    fontSize: 12,
    color: '#818CF8',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  logMessage: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
  },
});
