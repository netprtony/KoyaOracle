import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Modal, Alert, FlatList } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '../src/styles/theme';
import { useGameStore } from '../src/store/gameStore';
import { GameMode, ScenarioRole } from '../src/types';

type SortOption = 'players_asc' | 'players_desc' | 'name';

export default function ScenarioSelectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode: GameMode }>();
  const { availableScenarios, availableRoles, addCustomScenario, deleteCustomScenario } = useGameStore();

  // Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('players_asc');
  
  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<ScenarioRole[]>([]);

  // Filtered Scenarios
  const filteredScenarios = useMemo(() => {
    let result = [...(availableScenarios || [])];

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s => 
        s.name.toLowerCase().includes(query) || 
        s.roles.some(r => r.roleId.toLowerCase().includes(query))
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'players_asc') return a.playerCount - b.playerCount;
      if (sortBy === 'players_desc') return b.playerCount - a.playerCount;
      return 0;
    });

    return result;
  }, [availableScenarios, searchQuery, sortBy]);

  const handleScenarioSelect = (scenarioId: string) => {
    router.push({
      pathname: '/player-setup',
      params: {
        mode: params.mode,
        scenarioId,
      },
    });
  };

  const handleDeleteScenario = (id: string, name: string) => {
    Alert.alert(
      "Xóa kịch bản",
      `Bạn có chắc muốn xóa kịch bản "${name}"?`,
      [
        { text: "Hủy", style: "cancel" },
        { 
          text: "Xóa", 
          style: "destructive", 
          onPress: async () => {
            await deleteCustomScenario(id);
          }
        }
      ]
    );
  };

  // --- Create Modal Logic ---

  const handleAddRole = (roleId: string) => {
    setSelectedRoles(prev => {
      const existing = prev.find(r => r.roleId === roleId);
      if (existing) {
        return prev.map(r => r.roleId === roleId ? { ...r, quantity: r.quantity + 1 } : r);
      }
      return [...prev, { roleId, quantity: 1 }];
    });
  };

  const handleRemoveRole = (roleId: string) => {
    setSelectedRoles(prev => {
      const existing = prev.find(r => r.roleId === roleId);
      if (existing && existing.quantity > 1) {
        return prev.map(r => r.roleId === roleId ? { ...r, quantity: r.quantity - 1 } : r);
      }
      return prev.filter(r => r.roleId !== roleId);
    });
  };

  const handleSaveScenario = async () => {
    if (!newScenarioName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên kịch bản");
      return;
    }
    if (selectedRoles.length === 0) {
      Alert.alert("Lỗi", "Vui lòng chọn ít nhất 1 vai trò");
      return;
    }

    await addCustomScenario(newScenarioName, selectedRoles);
    setShowCreateModal(false);
    setNewScenarioName('');
    setSelectedRoles([]);
  };

  const totalPlayersInNew = selectedRoles.reduce((sum, r) => sum + r.quantity, 0);

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.header}>Chọn kịch bản</Text>
        
        {/* Controls */}
        <View style={styles.controls}>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm kịch bản..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortContainer}>
            <TouchableOpacity 
              style={[styles.sortChip, sortBy === 'players_asc' && styles.sortChipActive]}
              onPress={() => setSortBy('players_asc')}
            >
              <Text style={styles.sortText}>👥 Ít người</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.sortChip, sortBy === 'players_desc' && styles.sortChipActive]}
              onPress={() => setSortBy('players_desc')}
            >
              <Text style={styles.sortText}>👥 Đông người</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.sortChip, sortBy === 'name' && styles.sortChipActive]}
              onPress={() => setSortBy('name')}
            >
              <Text style={styles.sortText}>🔤 Tên A-Z</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* List */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.listContent}>
          {/* Create Button */}
          <TouchableOpacity 
            style={styles.createBtn}
            onPress={() => setShowCreateModal(true)}
          >
            <Text style={styles.createBtnText}>+ Tạo kịch bản mới</Text>
          </TouchableOpacity>

          {filteredScenarios.map((scenario) => {
            const isCustom = scenario.id.startsWith('custom_');
            return (
              <TouchableOpacity
                key={scenario.id}
                style={[styles.scenarioCard, isCustom && styles.customCard]}
                onPress={() => handleScenarioSelect(scenario.id)}
                onLongPress={() => isCustom && handleDeleteScenario(scenario.id, scenario.name)}
                activeOpacity={0.8}
              >
                <View style={styles.scenarioHeader}>
                  <View style={{flex: 1}}>
                    <Text style={styles.scenarioName}>
                      {scenario.name} {isCustom && <Text style={styles.customBadge}>(Tự tạo)</Text>}
                    </Text>
                  </View>
                  <Text style={styles.playerCount}>👥 {scenario.playerCount}</Text>
                </View>
                
                <View style={styles.rolesList}>
                  {scenario.roles.map((role, index) => (
                    <Text key={index} style={styles.roleText}>
                      {role.quantity > 1 ? `${role.quantity}x ` : ''}
                      {availableRoles.find(r => r.id === role.roleId)?.name || role.roleId}
                    </Text>
                  ))}
                </View>
                {isCustom && <Text style={styles.hintText}>Giữ để xóa</Text>}
              </TouchableOpacity>
            );
          })}
          {filteredScenarios.length === 0 && (
            <Text style={styles.emptyText}>Không tìm thấy kịch bản nào.</Text>
          )}
        </ScrollView>
      </View>

      {/* Create Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalPanel}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tạo kịch bản mới</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <TextInput
                style={styles.nameInput}
                placeholder="Tên kịch bản (VD: Kịch bản 9 người)"
                placeholderTextColor="#6B7280"
                value={newScenarioName}
                onChangeText={setNewScenarioName}
              />
              
              <Text style={styles.sectionTitle}>Chọn vai trò ({totalPlayersInNew} người)</Text>
              
              <View style={styles.rolesSelector}>
                <FlatList
                  data={availableRoles}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => {
                    const quantity = selectedRoles.find(r => r.roleId === item.id)?.quantity || 0;
                    return (
                      <View style={styles.roleRow}>
                        <Text style={styles.roleRowName}>{item.icon} {item.name}</Text>
                        <View style={styles.counter}>
                          <TouchableOpacity 
                            onPress={() => handleRemoveRole(item.id)}
                            style={[styles.counterBtn, quantity === 0 && styles.counterBtnDisabled]}
                            disabled={quantity === 0}
                          >
                            <Text style={styles.counterBtnText}>-</Text>
                          </TouchableOpacity>
                          <Text style={styles.counterText}>{quantity}</Text>
                          <TouchableOpacity 
                            onPress={() => handleAddRole(item.id)}
                            style={styles.counterBtn}
                          >
                            <Text style={styles.counterBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  }}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveScenario}>
              <Text style={styles.saveBtnText}>Lưu kịch bản</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  header: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  controls: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  sortContainer: {
    flexDirection: 'row',
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sortChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  sortText: {
    color: theme.colors.text,
    fontSize: 12,
  },
  scrollView: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
    gap: 12,
  },
  createBtn: {
    backgroundColor: theme.colors.secondary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  createBtnText: {
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  scenarioCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  customCard: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  scenarioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scenarioName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  customBadge: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: 'normal',
    fontStyle: 'italic',
  },
  playerCount: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  rolesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hintText: {
    color: '#6B7280',
    fontSize: 10,
    marginTop: 8,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  emptyText: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalPanel: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    padding: 20,
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
    color: theme.colors.text,
  },
  closeBtn: {
    fontSize: 24,
    color: theme.colors.textSecondary,
  },
  modalBody: {
    flex: 1,
  },
  nameInput: {
    backgroundColor: '#1F2937',
    color: '#FFF',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  rolesSelector: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 8,
  },
  roleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  roleRowName: {
    color: '#D1D5DB',
    fontSize: 16,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  counterBtn: {
    backgroundColor: '#374151',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnDisabled: {
    opacity: 0.3,
  },
  counterBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  counterText: {
    color: '#FFF',
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
