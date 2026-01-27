import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '../src/styles/theme';
import { useGameStore } from '../src/store/gameStore';
import { database, PlayerRecord } from '../src/utils/database';
import { GameMode } from '../src/types';

export default function PlayerSelectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode: GameMode; scenarioId: string }>();
  const { availableScenarios, initializeGame } = useGameStore();
  
  const scenario = availableScenarios.find((s) => s.id === params.scenarioId);
  
  const [dbPlayers, setDbPlayers] = useState<PlayerRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Add State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const players = await database.getPlayers();
      setDbPlayers(players);
    } catch (error) {
      console.error('Failed to load players:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách người chơi');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePlayer = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      if (scenario && newSelected.size >= scenario.playerCount) {
        Alert.alert('Thông báo', `Kịch bản này chỉ cần ${scenario.playerCount} người chơi.`);
        return;
      }
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleQuickAdd = async () => {
    if (!newPlayerName.trim()) return;
    try {
      // Default color for quick add
      await database.upsertPlayer(newPlayerName.trim(), '#6366F1');
      setNewPlayerName('');
      setShowAddModal(false);
      loadPlayers();
    } catch (error) {
      console.error('Failed to quick add player:', error);
    }
  };

  const handleContinue = () => {
    if (!scenario) return;

    if (selectedIds.size !== scenario.playerCount) {
       Alert.alert(
        'Số lượng người chơi chưa đủ',
        `Kịch bản này cần ${scenario.playerCount} người chơi. Hiện tại: ${selectedIds.size}`
      );
      return;
    }

    // Map selected IDs back to full player objects expected by game store
    const selectedPlayers = dbPlayers
      .filter(p => selectedIds.has(p.id))
      .map(p => ({
        name: p.name,
        color: p.color
      }));

    initializeGame(params.mode, params.scenarioId, selectedPlayers);

    if (params.mode === GameMode.PHYSICAL_CARD) {
      router.push('/manual-role-note');
    } else {
      router.push('/game-master-board');
    }
  };

  const filteredPlayers = dbPlayers.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCount = selectedIds.size;
  const requireCount = scenario?.playerCount || 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chọn Người Chơi</Text>
        <Text style={styles.subtitle}>
          Đã chọn: <Text style={{color: selectedCount === requireCount ? '#10B981' : '#F59E0B'}}>{selectedCount}</Text> / {requireCount}
        </Text>
      </View>

      <View style={styles.searchContainer}>
         <TextInput
            style={styles.searchInput}
            placeholder="Tìm người chơi..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity style={styles.quickAddBtn} onPress={() => setShowAddModal(true)}>
            <Text style={styles.quickAddText}>+</Text>
          </TouchableOpacity>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {loading ? (
          <Text style={styles.emptyText}>Đang tải...</Text>
        ) : filteredPlayers.length === 0 ? (
           <Text style={styles.emptyText}>
             {searchQuery ? 'Không tìm thấy kết quả.' : 'Chưa có người chơi nào trong dữ liệu.'}
           </Text>
        ) : (
          filteredPlayers.map(player => {
            const isSelected = selectedIds.has(player.id);
            return (
              <TouchableOpacity
                key={player.id}
                style={[
                  styles.playerCard,
                  isSelected && styles.playerCardSelected,
                  { borderLeftColor: player.color }
                ]}
                onPress={() => handleTogglePlayer(player.id)}
                activeOpacity={0.7}
              >
                <View style={styles.playerInfo}>
                  <Text style={[styles.playerName, isSelected && styles.playerNameSelected]}>
                    {player.name}
                  </Text>
                  <Text style={styles.playerStats}>
                    {player.gamesPlayed} trận
                  </Text>
                </View>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            selectedCount !== requireCount && styles.continueButtonDisabled
          ]}
          onPress={handleContinue}
          disabled={selectedCount !== requireCount}
        >
          <Text style={styles.continueButtonText}>
            Bắt Đầu Trò Chơi ({selectedCount}/{requireCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick Add Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Thêm nhanh người chơi</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Tên người chơi"
              placeholderTextColor="#9CA3AF"
              value={newPlayerName}
              onChangeText={setNewPlayerName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancel} 
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalAdd}
                onPress={handleQuickAdd}
              >
                <Text style={styles.modalAddText}>Thêm</Text>
              </TouchableOpacity>
            </View>
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
    padding: 20,
    backgroundColor: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#D1D5DB',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    color: '#F9FAFB',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  quickAddBtn: {
    width: 50,
    backgroundColor: '#374151',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  quickAddText: {
    fontSize: 24,
    color: '#F9FAFB',
    marginTop: -2,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 40,
    fontSize: 16,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#6B7280',
    borderWidth: 1,
    borderColor: '#374151',
  },
  playerCardSelected: {
    backgroundColor: '#312E81',
    borderColor: '#818CF8',
  },
  playerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E5E7EB',
  },
  playerNameSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  playerStats: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6B7280',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#818CF8',
    borderColor: '#818CF8',
  },
  checkmark: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    backgroundColor: '#111827',
  },
  continueButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#374151',
    opacity: 0.5,
  },
  continueButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F9FAFB',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 12,
    color: '#F9FAFB',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalAdd: {
    backgroundColor: '#6366F1',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalAddText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
