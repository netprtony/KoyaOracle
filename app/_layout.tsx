import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useGameStore } from '../src/store/gameStore';
import { database } from '../src/utils/database';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import { Text, TextInput } from 'react-native';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// @ts-ignore
if (Text.defaultProps == null) Text.defaultProps = {};
// @ts-ignore
Text.defaultProps.style = { fontFamily: 'TNH-Xuong' };

// @ts-ignore
if (TextInput.defaultProps == null) TextInput.defaultProps = {};
// @ts-ignore
TextInput.defaultProps.style = { fontFamily: 'TNH-Xuong' };

export default function RootLayout() {
  const loadAssets = useGameStore((state) => state.loadAssets);
  const [fontsLoaded] = useFonts({
    'TNH-Xuong': require('../assets/fonts/TNH-Xuong.otf'),
  });

  useEffect(() => {
    // Initialize database and load assets on app startup
    const initialize = async () => {
      try {
        await database.initialize();
        console.log('Database initialized');
      } catch (error) {
        console.error('Database initialization failed:', error);
      }
      loadAssets();
    };
    
    initialize();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0a0a0a',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontFamily: 'TNH-Xuong',
            fontSize: 24,
          },
          contentStyle: {
            backgroundColor: '#0a0a0a',
          },
        }}
      >
        {/* Main Tabs - Default screen */}
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
        
        {/* Modal/Stack Screens */}
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="scenario-select"
          options={{
            title: 'Chọn Kịch Bản',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="player-setup"
          options={{
            title: 'Thiết Lập Người Chơi',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="manual-role-note"
          options={{
            title: 'Ghi Nhận Vai Trò',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="game-master-board"
          options={{
            title: 'Bảng Điều Khiển',
            headerShown: true,
            presentation: 'fullScreenModal',
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
