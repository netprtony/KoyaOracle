import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '../src/styles/theme';
import { useGameStore } from '../src/store/gameStore';
import { GameMode } from '../src/types';

export default function ScenarioSelectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode: GameMode }>();
  const availableScenarios = useGameStore((state) => state.availableScenarios);

  const handleScenarioSelect = (scenarioId: string) => {
    router.push({
      pathname: '/player-setup',
      params: {
        mode: params.mode,
        scenarioId,
      },
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.header}>Chọn kịch bản</Text>
        <Text style={styles.subheader}>
          Chế độ: {params.mode === GameMode.PHYSICAL_CARD ? '🃏 Physical Card' : '🎲 Random Role'}
        </Text>

        <View style={styles.scenarioList}>
          {(availableScenarios || []).map((scenario) => (
            <TouchableOpacity
              key={scenario.id}
              style={styles.scenarioCard}
              onPress={() => handleScenarioSelect(scenario.id)}
              activeOpacity={0.8}
            >
              <View style={styles.scenarioHeader}>
                <Text style={styles.scenarioName}>{scenario.name}</Text>
                <Text style={styles.playerCount}>👥 {scenario.playerCount} người</Text>
              </View>
              
              <View style={styles.rolesList}>
                {scenario.roles.map((role, index) => (
                  <Text key={index} style={styles.roleText}>
                    • {role.quantity}x {role.roleId}
                  </Text>
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
  },
  header: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subheader: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  scenarioList: {
    gap: theme.spacing.md,
  },
  scenarioCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  scenarioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  scenarioName: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
  },
  playerCount: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  rolesList: {
    gap: theme.spacing.xs,
  },
  roleText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
});
