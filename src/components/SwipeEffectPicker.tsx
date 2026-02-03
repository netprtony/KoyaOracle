import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

export type SwipeEffect = 'default' | 'cube' | 'scroll' | 'card' | 'tilt';

interface SwipeEffectOption {
  id: SwipeEffect;
  name: string;
  icon: string;
  description: string;
}

const SWIPE_EFFECTS: SwipeEffectOption[] = [
  {
    id: 'default',
    name: 'Mặc định',
    icon: '↔️',
    description: 'Trượt ngang + xoay nhẹ',
  },
  {
    id: 'cube',
    name: 'Hình khối',
    icon: '📦',
    description: 'Xoay 3D như khối lập phương',
  },
  {
    id: 'scroll',
    name: 'Cuộn',
    icon: '📜',
    description: 'Cuộn dọc với thu nhỏ dần',
  },
  {
    id: 'card',
    name: 'Thẻ',
    icon: '🃏',
    description: 'Thẻ trượt + card mới pop up',
  },
  {
    id: 'tilt',
    name: 'Nghiêng',
    icon: '📐',
    description: 'Nghiêng perspective + trượt',
  },
];

interface SwipeEffectPickerProps {
  visible: boolean;
  onClose: () => void;
  selectedEffect: SwipeEffect;
  onSelectEffect: (effect: SwipeEffect) => void;
}

export const SwipeEffectPicker: React.FC<SwipeEffectPickerProps> = ({
  visible,
  onClose,
  selectedEffect,
  onSelectEffect,
}) => {
  const handleSelect = (effect: SwipeEffect) => {
    onSelectEffect(effect);
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
            <Text style={styles.title}>Hiệu ứng vuốt</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Chọn hiệu ứng khi chuyển sang người chơi tiếp theo
          </Text>

          <ScrollView style={styles.optionsList}>
            {SWIPE_EFFECTS.map((effect) => (
              <TouchableOpacity
                key={effect.id}
                style={[
                  styles.optionItem,
                  selectedEffect === effect.id && styles.optionItemSelected,
                ]}
                onPress={() => handleSelect(effect.id)}
                activeOpacity={0.7}
              >
                <View style={styles.optionIcon}>
                  <Text style={styles.optionIconText}>{effect.icon}</Text>
                </View>
                <View style={styles.optionContent}>
                  <Text style={[
                    styles.optionName,
                    selectedEffect === effect.id && styles.optionNameSelected,
                  ]}>
                    {effect.name}
                  </Text>
                  <Text style={styles.optionDescription}>
                    {effect.description}
                  </Text>
                </View>
                {selectedEffect === effect.id && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  optionsList: {
    paddingHorizontal: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionItemSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#1E1B4B',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionIconText: {
    fontSize: 24,
  },
  optionContent: {
    flex: 1,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  optionNameSelected: {
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
});

export default SwipeEffectPicker;
