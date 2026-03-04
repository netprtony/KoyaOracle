import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal, FlatList, SafeAreaView } from 'react-native';
import { useState, useEffect } from 'react';
import { database } from '../../src/utils/database';
import rolesData from '../../assets/roles.json';

type RoleEntry = {
  id: string;
  name: string;
  description: string;
  team: string;
  iconEmoji: string;
  skills: Record<string, any>;
  winConditions: Record<string, any>;
  specialRules?: string[];
};

const roles: RoleEntry[] = rolesData as RoleEntry[];

const TEAM_LABEL: Record<string, string> = {
  villager: 'Dân Làng',
  werewolf: 'Phe Sói',
  vampire: 'Ma Cà Rồng',
  neutral: 'Trung Lập',
};

const TEAM_COLOR: Record<string, string> = {
  villager: '#22c55e',
  werewolf: '#ef4444',
  vampire: '#a855f7',
  neutral: '#f59e0b',
};

const TEAM_BG: Record<string, string> = {
  villager: '#14532d',
  werewolf: '#7f1d1d',
  vampire: '#3b0764',
  neutral: '#78350f',
};

export default function SettingsScreen() {
  const [discussionTime, setDiscussionTime] = useState('180');
  const [loading, setLoading] = useState(true);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleEntry | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const time = await database.getSettingWithDefault('discussion_time', '180');
      setDiscussionTime(time);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDiscussionTime = async () => {
    const timeValue = parseInt(discussionTime);
    if (isNaN(timeValue) || timeValue < 30 || timeValue > 600) {
      Alert.alert('Lỗi', 'Thời gian phải từ 30 đến 600 giây');
      return;
    }

    try {
      await database.saveSetting('discussion_time', discussionTime);
      Alert.alert('Thành công', 'Đã lưu cài đặt');
    } catch (error) {
      console.error('Failed to save setting:', error);
      Alert.alert('Lỗi', 'Không thể lưu cài đặt');
    }
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc muốn xóa TẤT CẢ dữ liệu? Hành động này không thể hoàn tác.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.clearAll();
              Alert.alert('Thành công', 'Đã xóa tất cả dữ liệu');
            } catch (error) {
              console.error('Failed to clear data:', error);
              Alert.alert('Lỗi', 'Không thể xóa dữ liệu');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Game Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Cài Đặt Trò Chơi</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingHeader}>
              <Text style={styles.settingLabel}>Thời gian thảo luận (giây)</Text>
              <Text style={styles.settingHint}>Mặc định: 180s (3 phút)</Text>
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={discussionTime}
                onChangeText={setDiscussionTime}
                keyboardType="number-pad"
                placeholder="180"
                placeholderTextColor="#6B7280"
              />
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveDiscussionTime}
              >
                <Text style={styles.saveButtonText}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Role Guide */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📚 Hướng Dẫn Vai Trò</Text>
          <Text style={styles.guideDesc}>
            Xem mô tả chi tiết tất cả {roles.length} vai trò trong trò chơi Ma Sói.
          </Text>
          <TouchableOpacity
            style={styles.guideButton}
            onPress={() => setShowGuideModal(true)}
          >
            <Text style={styles.guideButtonText}>📖 Xem Danh Sách Vai Trò</Text>
          </TouchableOpacity>
        </View>

        {/* Database Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💾 Quản Lý Dữ Liệu</Text>

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleClearAllData}
          >
            <Text style={styles.dangerButtonText}>🗑️ Xóa Tất Cả Dữ Liệu</Text>
          </TouchableOpacity>

          <Text style={styles.warningText}>
            ⚠️ Xóa tất cả người chơi, lịch sử trận đấu và cài đặt
          </Text>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ Thông Tin Ứng Dụng</Text>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Phiên bản</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Nền tảng</Text>
            <Text style={styles.infoValue}>React Native + Expo</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Database</Text>
            <Text style={styles.infoValue}>
              {database.isAvailable() ? '✓ SQLite' : '✗ Không khả dụng'}
            </Text>
          </View>
        </View>

        {/* Credits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👨‍💻 Credits</Text>
          <Text style={styles.creditsText}>
            Werewolf Game Master App{'\n'}
            Developed with ❤️ for Ma Sói players
          </Text>
        </View>

        {/* Spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Role Guide Modal */}
      <Modal
        visible={showGuideModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowGuideModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📚 Hướng Dẫn Vai Trò</Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowGuideModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={roles}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.roleList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.roleRow}
                onPress={() => setSelectedRole(item)}
                activeOpacity={0.75}
              >
                <Text style={styles.roleEmoji}>{item.iconEmoji}</Text>
                <View style={styles.roleRowInfo}>
                  <Text style={styles.roleRowName}>{item.name}</Text>
                  <View style={[styles.teamBadge, { backgroundColor: TEAM_BG[item.team] ?? '#1f2937' }]}>
                    <Text style={[styles.teamBadgeText, { color: TEAM_COLOR[item.team] ?? '#9ca3af' }]}>
                      {TEAM_LABEL[item.team] ?? item.team}
                    </Text>
                  </View>
                </View>
                <Text style={styles.roleRowChevron}>›</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </SafeAreaView>
      </Modal>

      {/* Role Detail Modal */}
      <Modal
        visible={!!selectedRole}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedRole(null)}
      >
        <TouchableOpacity
          style={styles.detailOverlay}
          activeOpacity={1}
          onPress={() => setSelectedRole(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.detailCard}>
            {selectedRole && (
              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                {/* Header */}
                <View style={styles.detailHeader}>
                  <Text style={styles.detailEmoji}>{selectedRole.iconEmoji}</Text>
                  <View style={styles.detailTitleGroup}>
                    <Text style={styles.detailName}>{selectedRole.name}</Text>
                    <View style={[styles.teamBadge, { backgroundColor: TEAM_BG[selectedRole.team] ?? '#1f2937' }]}>
                      <Text style={[styles.teamBadgeText, { color: TEAM_COLOR[selectedRole.team] ?? '#9ca3af' }]}>
                        {TEAM_LABEL[selectedRole.team] ?? selectedRole.team}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedRole(null)} style={styles.detailCloseBtn}>
                    <Text style={styles.modalCloseBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Description */}
                <Text style={styles.detailSectionLabel}>📝 Mô Tả</Text>
                <Text style={styles.detailDescription}>{selectedRole.description}</Text>

                {/* Night Action if any */}
                {selectedRole.skills?.nightAction && (
                  <>
                    <Text style={styles.detailSectionLabel}>🌙 Hành Động Ban Đêm</Text>
                    <View style={styles.detailInfoBox}>
                      <DetailRow label="Loại" value={selectedRole.skills.nightAction.type} />
                      <DetailRow
                        label="Tần suất"
                        value={FREQUENCY_LABEL[selectedRole.skills.nightAction.frequency] ?? selectedRole.skills.nightAction.frequency}
                      />
                      {selectedRole.skills.nightAction.targetCount !== undefined && (
                        <DetailRow label="Số mục tiêu" value={String(selectedRole.skills.nightAction.targetCount)} />
                      )}
                      {selectedRole.skills.nightAction.timeLimit !== undefined && (
                        <DetailRow label="Giới hạn thời gian" value={`${selectedRole.skills.nightAction.timeLimit}s`} />
                      )}
                    </View>
                  </>
                )}

                {/* Passive if any */}
                {selectedRole.skills?.passive && (
                  <>
                    <Text style={styles.detailSectionLabel}>⚡ Kỹ Năng Bị Động</Text>
                    <View style={styles.detailInfoBox}>
                      <DetailRow label="Loại" value={selectedRole.skills.passive.type} />
                      {selectedRole.skills.passive.trigger && (
                        <DetailRow label="Kích hoạt" value={selectedRole.skills.passive.trigger} />
                      )}
                      {selectedRole.skills.passive.effect && (
                        <DetailRow label="Hiệu ứng" value={selectedRole.skills.passive.effect} />
                      )}
                    </View>
                  </>
                )}

                {/* Special Rules */}
                {selectedRole.specialRules && selectedRole.specialRules.length > 0 && (
                  <>
                    <Text style={styles.detailSectionLabel}>⚠️ Quy Tắc Đặc Biệt</Text>
                    <View style={styles.detailInfoBox}>
                      {selectedRole.specialRules.map((rule, i) => (
                        <Text key={i} style={styles.specialRuleText}>• {rule}</Text>
                      ))}
                    </View>
                  </>
                )}

                <View style={{ height: 12 }} />
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const FREQUENCY_LABEL: Record<string, string> = {
  everyNight: 'Mỗi đêm',
  oncePerGame: 'Một lần/ván',
  firstNightOnly: 'Chỉ đêm đầu',
  conditional: 'Có điều kiện',
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailRowLabel}>{label}:</Text>
      <Text style={styles.detailRowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F9FAFB',
    marginBottom: 16,
  },
  settingItem: {
    marginBottom: 16,
  },
  settingHeader: {
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 16,
    color: '#F9FAFB',
    fontWeight: '600',
    marginBottom: 4,
  },
  settingHint: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    color: '#F9FAFB',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  saveButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  dangerButton: {
    backgroundColor: '#7F1D1D',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EF4444',
    marginBottom: 12,
  },
  dangerButtonText: {
    color: '#FCA5A5',
    fontWeight: 'bold',
    fontSize: 16,
  },
  warningText: {
    fontSize: 14,
    color: '#F59E0B',
    textAlign: 'center',
    lineHeight: 20,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  infoLabel: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  infoValue: {
    fontSize: 16,
    color: '#F9FAFB',
    fontWeight: '600',
  },
  creditsText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
  },
  // Guide section
  guideDesc: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 14,
    lineHeight: 20,
  },
  guideButton: {
    backgroundColor: '#1e3a5f',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  guideButtonText: {
    color: '#93c5fd',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Guide list modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#111827',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F9FAFB',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtnText: {
    color: '#D1D5DB',
    fontSize: 16,
    fontWeight: 'bold',
  },
  roleList: {
    padding: 12,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  roleEmoji: {
    fontSize: 28,
    marginRight: 14,
  },
  roleRowInfo: {
    flex: 1,
    gap: 4,
  },
  roleRowName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  teamBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  teamBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  roleRowChevron: {
    fontSize: 24,
    color: '#6B7280',
    marginLeft: 8,
  },
  separator: {
    height: 8,
  },
  // Role detail modal
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#1F2937',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  detailEmoji: {
    fontSize: 44,
  },
  detailTitleGroup: {
    flex: 1,
    gap: 6,
    paddingTop: 2,
  },
  detailName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F9FAFB',
  },
  detailCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailSectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#818CF8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 6,
  },
  detailDescription: {
    fontSize: 15,
    color: '#D1D5DB',
    lineHeight: 22,
  },
  detailInfoBox: {
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  detailRowLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  detailRowValue: {
    fontSize: 14,
    color: '#F9FAFB',
    flex: 1,
  },
  specialRuleText: {
    fontSize: 14,
    color: '#FCD34D',
    lineHeight: 20,
  },
});
