import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';

interface TimerSettingsPickerProps {
  visible: boolean;
  onClose: () => void;
  selectedDuration: number; // in seconds
  onSelectDuration: (duration: number) => void;
}

interface DurationOption {
  label: string;
  value: number;
  description: string;
}

const DURATION_OPTIONS: DurationOption[] = [
  { label: '1 phút', value: 60, description: 'Nhanh - cho người chơi quen thuộc' },
  { label: '2 phút', value: 120, description: 'Vừa phải' },
  { label: '3 phút', value: 180, description: 'Thoải mái' },
  { label: '5 phút', value: 300, description: 'Mặc định - đủ thời gian suy nghĩ' },
  { label: '10 phút', value: 600, description: 'Dài - cho vai phức tạp' },
  { label: 'Không giới hạn', value: 0, description: 'Tắt đồng hồ đếm ngược' },
];

export const TimerSettingsPicker: React.FC<TimerSettingsPickerProps> = ({
  visible,
  onClose,
  selectedDuration,
  onSelectDuration,
}) => {
  const handleSelect = (duration: number) => {
    onSelectDuration(duration);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>⏱️ Thời gian đếm ngược</Text>
              <Text style={styles.subtitle}>Thời gian cho mỗi lượt gọi vai</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
            {DURATION_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionItem,
                  selectedDuration === option.value && styles.optionItemSelected,
                ]}
                onPress={() => handleSelect(option.value)}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <Text style={[
                    styles.optionLabel,
                    selectedDuration === option.value && styles.optionLabelSelected,
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={styles.optionDescription}>
                    {option.description}
                  </Text>
                </View>
                {selectedDuration === option.value && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <Text style={styles.footerNote}>
              💡 Đồng hồ sẽ tự động reset khi chuyển sang vai mới
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  optionsList: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionItemSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#1E1B4B',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: '#A5B4FC',
  },
  optionDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  footerNote: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default TimerSettingsPicker;
