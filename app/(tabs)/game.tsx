import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { GameMode } from '../../src/types';
import { useGameStore } from '../../src/store/gameStore';

type GameStep = 'MODE' | 'SCENARIO' | 'PLAYERS' | 'READY';

export default function GameScreen() {
  const router = useRouter();
  const { session } = useGameStore();
  const [currentStep, setCurrentStep] = useState<GameStep>('MODE');
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);

  const handleModeSelect = (mode: GameMode) => {
    setSelectedMode(mode);
    // Navigate to scenario selection
    router.push({
      pathname: '/scenario-select',
      params: { mode },
    });
  };

  const handleEndGame = () => {
    // TODO: Implement end game logic
    router.push('/');
  };

  // If game is in progress, show game status
  if (session) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.statusIcon}>🎮</Text>
          <Text style={styles.statusTitle}>Trò Chơi Đang Diễn Ra</Text>
          <Text style={styles.statusText}>
            {session.currentPhase.type === 'NIGHT' ? '🌙 Đêm' : '☀️ Ngày'} {session.currentPhase.number}
          </Text>
          <Text style={styles.statusSubtext}>
            {session.players.filter(p => p.isAlive).length} / {session.players.length} người chơi còn sống
          </Text>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => router.push('/game-master-board')}
          >
            <Text style={styles.continueButtonText}>Tiếp Tục Trò Chơi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.endButton}
            onPress={handleEndGame}
          >
            <Text style={styles.endButtonText}>Kết Thúc Trò Chơi</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // New game setup flow
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🐺 Bắt Đầu Trò Chơi Mới</Text>
        <Text style={styles.subtitle}>Chọn chế độ chơi</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => handleModeSelect(GameMode.PHYSICAL_CARD)}
            activeOpacity={0.8}
          >
            <Text style={styles.modeIcon}>🃏</Text>
            <Text style={styles.modeTitle}>Physical Card Mode</Text>
            <Text style={styles.modeDescription}>
              Người chơi đã có bài vật lý
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modeButton}
            onPress={() => handleModeSelect(GameMode.RANDOM_ROLE)}
            activeOpacity={0.8}
          >
            <Text style={styles.modeIcon}>🎲</Text>
            <Text style={styles.modeTitle}>Random Role Mode</Text>
            <Text style={styles.modeDescription}>
              App sẽ chia vai ngẫu nhiên
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F9FAFB',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 40,
  },
  buttonContainer: {
    gap: 16,
  },
  modeButton: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#374151',
    minHeight: 160,
    justifyContent: 'center',
  },
  modeIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  modeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F9FAFB',
    marginBottom: 8,
  },
  modeDescription: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  // Game in progress styles
  statusIcon: {
    fontSize: 80,
    textAlign: 'center',
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F9FAFB',
    textAlign: 'center',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 24,
    color: '#818CF8',
    textAlign: 'center',
    marginBottom: 8,
  },
  statusSubtext: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 40,
  },
  continueButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 12,
  },
  continueButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  endButton: {
    backgroundColor: '#374151',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  endButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
