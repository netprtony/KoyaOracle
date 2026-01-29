import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGameStore } from '../src/store/gameStore';
import { NightOrderEditor } from '../src/components/NightOrderEditor';
import { GameMode, NightOrderDefinition } from '../src/types';

export default function OrderSetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode: GameMode; scenarioId: string }>();
  const { availableScenarios, availableRoles, initializeGame, session } = useGameStore();
  
  // Need to retrieve the selected players passed from player-setup
  // Since we don't have a temporary store for setup state, we might need to rely on
  // the params if we passed them (we didn't yet). 
  // Alternatively, we can use the `session` if we initialized it early, but we deferred initialization.
  // Actually, standard pattern in this app so far seems to be passing data via store or params.
  // `player-setup` calls `initializeGame`. 
  // Wait, my plan said: "Update player-setup to push to order-setup instead of game-master-board".
  // But `initializeGame` was called inside `handleContinue`.
  // If `initializeGame` is called, the session is created.
  // So `order-setup` can just read from `session`?
  // YES. If `initializeGame` creates the session with default order, we can then edit it here.
  // This is the easiest way.
  
  const scenario = availableScenarios.find((s) => s.id === params.scenarioId);
  
  const handleSaveOrder = (order: NightOrderDefinition) => {
      // We need to update the session with this new order
      useGameStore.getState().updateNightOrder(order);
      
      // Proceed to game
      router.push('/game-master-board');
  };

  const handleCancel = () => {
      // Provide option to skip custom order or go back? 
      // User tapped "Start Game" in player-setup, so they expect to play. 
      // Cancelling here might mean "Create Game with Default Order".
      router.push('/game-master-board');
  };
  
  if (!session || !scenario) {
      return (
          <View style={styles.container}>
              <ActivityIndicator size="large" color="#6366F1" />
          </View>
      );
  }

  // Determine active roles from session players
  // In random role mode, roles are assigned.
  // In physical card mode, roles are determined by scenario logic (available cards).
  const activeRoleIds = scenario.roles
      .filter(r => r.quantity > 0)
      .map(r => r.roleId);

    // Initial order from session (which copied scenario)
    const initialOrder = session.nightOrder || scenario.nightOrder;

    // Convert string[] legacy or construct definition if needed
    const normalizedOrder: NightOrderDefinition = Array.isArray(initialOrder) 
       ? { firstNight: initialOrder, otherNights: initialOrder }
       : initialOrder;

  return (
    <View style={styles.container}>
       <NightOrderEditor 
          availableRoles={availableRoles}
          activeRoleIds={activeRoleIds}
          initialOrder={normalizedOrder}
          onSave={handleSaveOrder}
          onCancel={handleCancel}
       />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    padding: 16,
    paddingTop: 50, // iOS status bar
  },
});
