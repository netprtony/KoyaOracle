import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useState, useEffect } from 'react';
import { database } from '../../src/utils/database';

export default function SettingsScreen() {
  const [discussionTime, setDiscussionTime] = useState('180');
  const [loading, setLoading] = useState(true);

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
});
