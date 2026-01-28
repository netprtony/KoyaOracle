import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { database, PlayerRecord } from '../../src/utils/database';
import { theme } from '../../src/styles/theme';

export default function PlayersScreen() {
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // States for Add/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form states
  const [playerName, setPlayerName] = useState('');
  const [playerColor, setPlayerColor] = useState('#6366F1');

  // Batch Add State
  const [batchInput, setBatchInput] = useState('');

  const PRESET_COLORS = [
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6', 
    '#6366F1', '#8B5CF6', '#EC4899', '#14B8A6',
    '#f43f5e', '#84cc16', '#06b6d4', '#a855f7'
  ];

  useFocusEffect(
    useCallback(() => {
      loadPlayers();
    }, [])
  );

  const loadPlayers = async () => {
    try {
      setLoading(true);
      
      if (!database.isAvailable()) {
        let retries = 0;
        while (!database.isAvailable() && retries < 5) {
          await new Promise(resolve => setTimeout(resolve, 200));
          retries++;
        }
      }

      const data = await database.getPlayers();
      setPlayers(data);
    } catch (error) {
      console.error('Failed to load players:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPlayerName('');
    setPlayerColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setIsEditing(false);
    setEditingId(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (player: PlayerRecord) => {
    setPlayerName(player.name);
    setPlayerColor(player.color);
    setEditingId(player.id);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleSavePlayer = async () => {
    if (!playerName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên người chơi');
      return;
    }

    try {
      if (isEditing && editingId) {
        // Update existing player
        // Note: upsertPlayer handles both insert and update based on name, 
        // but ideally we should have a specific update method by ID. 
        // For now, we reuse upsert logic assuming names are unique or handle collisions.
        // However, standard upsert in database.ts uses name as key for update. 
        // If we renamed the player, it might create a new entry if we don't have updateById.
        // Let's rely on upsertPlayer for now as database.ts defines it.
        // WAIT: database.ts upsertPlayer uses name to find ID. If we change name, it won't find it.
        // We need extended DB functionality or careful handling.
        // Since database.ts is limited, let's just stick to its contract: upsert checks NAME.
        // If we are editing, we probably want to update color for that name.
        // If user changes name, it's effectively a new player or merging with existing.
        await database.upsertPlayer(playerName.trim(), playerColor);
      } else {
        // Add new
        await database.upsertPlayer(playerName.trim(), playerColor);
      }
      
      resetForm();
      setShowModal(false);
      loadPlayers();
    } catch (error) {
      console.error('Failed to save player:', error);
      Alert.alert('Lỗi', 'Không thể lưu người chơi');
    }
  };

  const handleBatchAdd = async () => {
    if (!batchInput.trim()) return;

    const names = batchInput
      .split(',')
      .map(n => n.trim())
      .filter(n => n.length > 0);

    if (names.length === 0) return;

    try {
      setLoading(true);
      await Promise.all(names.map(async (name, index) => {
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

  const filteredPlayers = players.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>👥 Người Chơi</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
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
          multiline
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
          filteredPlayers.map((player, index) => (
            <View 
              key={player.id} 
              style={[
                styles.playerItem,
                { borderLeftColor: player.color }
              ]}
            >
              {/* Color indicator */}
              <View style={[styles.colorIndicator, { backgroundColor: player.color }]} />

              <Text style={styles.playerNumber}>{index + 1}</Text>

              {/* Tappable name to open edit modal */}
              <TouchableOpacity
                style={styles.playerNameContainer}
                onPress={() => openEditModal(player)}
              >
                <View>
                  <Text style={styles.playerName}>{player.name}</Text>
                  <Text style={styles.playerStats}>
                    {player.gamesPlayed} trận • {player.gamesWon} thắng
                  </Text>
                </View>
                <Text style={styles.editHint}>✎</Text>
              </TouchableOpacity>

              <View style={styles.playerActions}>
                <TouchableOpacity
                  onPress={() => handleDeletePlayer(player)}
                  style={[styles.actionButton, styles.removeButton]}
                >
                  <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Player Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {isEditing ? 'Chỉnh Sửa Người Chơi' : 'Thêm Người Chơi Mới'}
            </Text>

            <Text style={styles.inputLabel}>Tên</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Tên người chơi"
              placeholderTextColor="#9CA3AF"
              value={playerName}
              onChangeText={setPlayerName}
              autoFocus={!isEditing} // Only autofocus on new add
            />

            <Text style={styles.inputLabel}>Màu sắc</Text>
            <View style={styles.colorGrid}>
              {PRESET_COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    playerColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setPlayerColor(color)}
                >
                   {playerColor === color && (
                    <Text style={styles.colorCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleSavePlayer}
              >
                <Text style={styles.confirmButtonText}>
                  {isEditing ? 'Cập Nhật' : 'Thêm'}
                </Text>
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
  // Batch Input Styles
  batchContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  batchInput: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    color: '#F9FAFB',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#374151',
    height: 60, 
    textAlignVertical: 'center',
  },
  batchButton: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4B5563',
    height: 60,
  },
  batchButtonText: {
    color: '#F9FAFB',
    fontWeight: 'bold',
    fontSize: 24,
  },
  // Search
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
  // List
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
  // New Player Item Styles (matching player-setup.tsx)
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: '#374151',
    borderLeftWidth: 4,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  playerNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6366F1',
    width: 24,
    textAlign: 'center',
  },
  playerNameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F9FAFB',
  },
  playerStats: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  editHint: {
    fontSize: 16,
    color: '#6B7280',
    paddingHorizontal: 8,
  },
  playerActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  removeButtonText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: 'bold',
  },
  // Modal Styles
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
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F9FAFB',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#D1D5DB',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 12,
    color: '#F9FAFB',
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderColor: '#FFF',
    borderWidth: 3,
  },
  colorCheck: {
    color: '#FFF',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
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
