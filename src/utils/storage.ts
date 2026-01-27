import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { GameSession } from '../types';

const STORAGE_KEY = '@werewolf_gm_session';

/**
 * Storage adapter that works on both mobile and web
 */
class StorageAdapter {
    /**
     * Save game session to storage
     */
    async saveGame(session: GameSession): Promise<void> {
        try {
            const jsonValue = JSON.stringify(session);

            if (Platform.OS === 'web') {
                // Web: use localStorage
                if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.setItem(STORAGE_KEY, jsonValue);
                }
            } else {
                // Mobile: use AsyncStorage
                await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
            }
        } catch (error) {
            console.error('Error saving game:', error);
            throw error;
        }
    }

    /**
     * Load game session from storage
     */
    async loadGame(): Promise<GameSession | null> {
        try {
            let jsonValue: string | null = null;

            if (Platform.OS === 'web') {
                // Web: use localStorage
                if (typeof window !== 'undefined' && window.localStorage) {
                    jsonValue = window.localStorage.getItem(STORAGE_KEY);
                }
            } else {
                // Mobile: use AsyncStorage
                jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
            }

            return jsonValue != null ? JSON.parse(jsonValue) : null;
        } catch (error) {
            console.error('Error loading game:', error);
            return null;
        }
    }

    /**
     * Clear game session from storage
     */
    async clearGame(): Promise<void> {
        try {
            if (Platform.OS === 'web') {
                // Web: use localStorage
                if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.removeItem(STORAGE_KEY);
                }
            } else {
                // Mobile: use AsyncStorage
                await AsyncStorage.removeItem(STORAGE_KEY);
            }
        } catch (error) {
            console.error('Error clearing game:', error);
            throw error;
        }
    }
}

export const storage = new StorageAdapter();
