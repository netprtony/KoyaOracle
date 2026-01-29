import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { theme } from '../../src/styles/theme';
import { Role, NightOrderDefinition } from '../../src/types';

interface NightOrderEditorProps {
  availableRoles: Role[];
  activeRoleIds: string[]; // Roles present in the game/scenario
  initialOrder: NightOrderDefinition;
  onSave: (order: NightOrderDefinition) => void;
  onCancel: () => void;
}

export const NightOrderEditor: React.FC<NightOrderEditorProps> = ({
  availableRoles,
  activeRoleIds,
  initialOrder,
  onSave,
  onCancel,
}) => {
  const [activeTab, setActiveTab] = useState<'firstNight' | 'otherNights'>('firstNight');
  const [firstNightOrder, setFirstNightOrder] = useState<string[]>([]);
  const [otherNightsOrder, setOtherNightsOrder] = useState<string[]>([]);

  // Initialize state from props
  useEffect(() => {
    // Ensure all active roles are present in the list (if missing, append them)
    const normalizeOrder = (currentOrder: string[]) => {
      const existing = new Set(currentOrder);
      const missing = activeRoleIds.filter(id => !existing.has(id));
      // Filter out roles that might be in the order but not active (e.g. removed roles)
      const cleaned = currentOrder.filter(id => activeRoleIds.includes(id));
      return [...cleaned, ...missing];
    };

    setFirstNightOrder(normalizeOrder(initialOrder.firstNight || []));
    setOtherNightsOrder(normalizeOrder(initialOrder.otherNights || []));
  }, [initialOrder, activeRoleIds]);

  const currentOrder = activeTab === 'firstNight' ? firstNightOrder : otherNightsOrder;
  const setOrder = activeTab === 'firstNight' ? setFirstNightOrder : setOtherNightsOrder;

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...currentOrder];
    if (direction === 'up') {
      if (index === 0) return;
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    } else {
      if (index === newOrder.length - 1) return;
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    }
    setOrder(newOrder);
  };

  const getRoleName = (id: string) => {
    const role = availableRoles.find(r => r.id === id);
    return role ? `${role.icon} ${role.name}` : id;
  };
   
  const handleSave = () => {
    onSave({
      firstNight: firstNightOrder,
      otherNights: otherNightsOrder
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Thứ tự gọi đêm</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'firstNight' && styles.activeTab]}
          onPress={() => setActiveTab('firstNight')}
        >
          <Text style={[styles.tabText, activeTab === 'firstNight' && styles.activeTabText]}>Đêm 1</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'otherNights' && styles.activeTab]}
          onPress={() => setActiveTab('otherNights')}
        >
          <Text style={[styles.tabText, activeTab === 'otherNights' && styles.activeTabText]}>Đêm thường</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listHeader}>
         <Text style={styles.helpText}>Sắp xếp thứ tự gọi các vai trò.</Text>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {currentOrder.map((roleId, index) => (
          <View key={roleId} style={styles.row}>
            <Text style={styles.index}>{index + 1}</Text>
            <View style={styles.roleInfo}>
              <Text style={styles.roleName}>{getRoleName(roleId)}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity 
                style={[styles.moveBtn, index === 0 && styles.disabledBtn]} 
                onPress={() => moveItem(index, 'up')}
                disabled={index === 0}
              >
                <Text style={styles.moveBtnText}>▲</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.moveBtn, index === currentOrder.length - 1 && styles.disabledBtn]} 
                onPress={() => moveItem(index, 'down')}
                disabled={index === currentOrder.length - 1}
              >
                <Text style={styles.moveBtnText}>▼</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {currentOrder.length === 0 && (
            <Text style={styles.emptyText}>Không có vai trò nào để sắp xếp.</Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>Hủy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F9FAFB',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  activeTab: {
    backgroundColor: '#374151',
    borderBottomWidth: 2,
    borderBottomColor: '#6366F1',
  },
  tabText: {
    color: '#9CA3AF',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  listHeader: {
      padding: 12,
      backgroundColor: '#1F2937',
  },
  helpText: {
      color: '#9CA3AF',
      fontSize: 12,
      textAlign: 'center',
  },
  list: {
    flex: 1,
    backgroundColor: '#111827',
  },
  listContent: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  index: {
    width: 24,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    color: '#E5E7EB',
    fontSize: 16,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  moveBtn: {
    width: 32,
    height: 32,
    backgroundColor: '#374151',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: {
    opacity: 0.3,
  },
  moveBtnText: {
    color: '#FFF',
    fontSize: 12,
  },
  emptyText: {
      color: '#6B7280',
      textAlign: 'center',
      marginTop: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    backgroundColor: '#1F2937',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  cancelBtnText: {
    color: '#E5E7EB',
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#6366F1',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
