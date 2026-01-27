import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { database, PlayerRecord } from '../../src/utils/database';
import { theme } from '../../src/styles/theme';

export default function PlayersScreen() {
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerColor, setNewPlayerColor] = useState('#6366F1');

  const PRESET_COLORS = [
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6', 
    '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6'
  ];

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const data = await database.getPlayers();
      setPlayers(data);
    } catch (error) {
      console.error('Failed to load players:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên người chơi');
      return;
    }

    try {
      await database.upsertPlayer(newPlayerName.trim(), newPlayerColor);
      setNewPlayerName('');
      setNewPlayerColor('#6366F1');
      setShowAddModal(false);
      loadPlayers();
    } catch (error) {
      console.error('Failed to add player:', error);
      Alert.alert('Lỗi', 'Không thể thêm người chơi');
    }
  };

  const handleDeletePlayer = async (player: PlayerRecord) => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc muốn xóa ${player.name}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.deletePlayer(player.id);
              loadPlayers();
            } catch (error) {
              console.error('Failed to delete player:', error);
              Alert.alert('Lỗi', 'Không thể xóa người chơi');
            }
          },
        },
      ]
    );
  };

  // Batch Add State
  const [batchInput, setBatchInput] = useState('');

  const handleBatchAdd = async () => {
    if (!batchInput.trim()) return;

    const names = batchInput
      .split(',')
      .map(n => n.trim())
      .filter(n => n.length > 0);

    if (names.length === 0) return;

    try {
      setLoading(true);
      // Process serially or parallel - parallel is fine here
      await Promise.all(names.map(async (name, index) => {
        // Pick a random color or cycle through presets
        const color = PRESET_COLORS[(players.length + index) % PRESET_COLORS.length];
        await database.upsertPlayer(name, color);
      }));
      
      setBatchInput('');
      loadPlayers();
      Alert.alert('Thành công', `Đã thêm ${names.length} người chơi`);
    } catch (error) {
      console.error('Failed to batch add players:', error);
      Alert.alert('Lỗi', 'Không thể thêm danh sách người chơi');
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = players.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>👥 Người Chơi</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Text style={styles.addButtonText}>+ Thêm Lẻ</Text>
        </TouchableOpacity>
      </View>

      {/* Batch Add Input */}
      <View style={styles.batchContainer}>
        <TextInput
          style={styles.batchInput}
          placeholder="Nhập nhiều tên (VD: An, Bình, Cường)"
          placeholderTextColor="#9CA3AF"
          value={batchInput}
          onChangeText={setBatchInput}
          onSubmitEditing={handleBatchAdd}
        />
        <TouchableOpacity 
          style={styles.batchButton} 
          onPress={handleBatchAdd}
          disabled={!batchInput.trim()}
        >
          <Text style={styles.batchButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <TextInput
        style={styles.searchInput}
        placeholder="Tìm kiếm người chơi..."
        placeholderTextColor="#9CA3AF"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* Player List */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {loading ? (
          <Text style={styles.emptyText}>Đang tải...</Text>
        ) : filteredPlayers.length === 0 ? (
          <Text style={styles.emptyText}>
            {searchQuery ? 'Không tìm thấy người chơi' : 'Chưa có người chơi nào'}
          </Text>
        ) : (
          filteredPlayers.map(player => (
            <View key={player.id} style={styles.playerCard}>
              <View style={[styles.colorBadge, { backgroundColor: player.color }]} />
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>{player.name}</Text>
                <Text style={styles.playerStats}>
                  {player.gamesPlayed} trận • {player.gamesWon} thắng
                  {player.gamesPlayed > 0 && ` • ${Math.round((player.gamesWon / player.gamesPlayed) * 100)}%`}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeletePlayer(player)}
              >
                <Text style={styles.deleteButtonText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Player Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Thêm Người Chơi Mới</Text>

            <TextInput
              style={styles.input}
              placeholder="Tên người chơi"
              placeholderTextColor="#9CA3AF"
              value={newPlayerName}
              onChangeText={setNewPlayerName}
              autoFocus
            />

            <Text style={styles.colorLabel}>Chọn màu:</Text>
            <View style={styles.colorGrid}>
              {PRESET_COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    newPlayerColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setNewPlayerColor(color)}
                />
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  setNewPlayerName('');
                  setNewPlayerColor('#6366F1');
                }}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAddPlayer}
              >
                <Text style={styles.confirmButtonText}>Thêm</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F9FAFB',
  },
  addButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  searchInput: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    color: '#F9FAFB',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  batchContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  batchInput: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    color: '#F9FAFB',
    fontSize:16,
    borderWidth: 1,
    borderColor: '#374151',
    height:100,
    width:'100%',
  },
  batchButton: {
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4B5563',
    height:100,
  },
  batchButtonText: {
    color: '#F9FAFB',
    fontWeight: 'bold',
    fontSize: 14,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 16,
    marginTop: 40,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  colorBadge: {
    width: 12,
    height: 40,
    borderRadius: 6,
    marginRight: 12,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  playerStats: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F9FAFB',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 12,
    color: '#F9FAFB',
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  colorLabel: {
    fontSize: 14,
    color: '#D1D5DB',
    marginBottom: 12,
    fontWeight: '600',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#FFF',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#374151',
  },
  cancelButtonText: {
    color: '#D1D5DB',
    fontWeight: 'bold',
    fontSize: 16,
  },
  confirmButton: {
    backgroundColor: '#6366F1',
  },
  confirmButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
