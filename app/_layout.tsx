import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useGameStore } from '../src/store/gameStore';
import { database } from '../src/utils/database';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Text, TextInput } from 'react-native';

// 👉 KHÔNG gọi preventAutoHideAsync ngoài component
// SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const loadAssets = useGameStore((state) => state.loadAssets);

  const [fontsLoaded] = useFonts({
    'TNH-Xuong': require('../assets/fonts/TNH-Xuong.otf'),
  });

  // Splash lifecycle
  useEffect(() => {
    SplashScreen.preventAutoHideAsync();
  }, []);

  // Init database + assets
  useEffect(() => {
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
  }, [loadAssets]);

  // Hide splash when ready
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Font guard
  if (!fontsLoaded) {
    return null;
  }

  // ⚠️ Set default font an toàn hơn
  // ⚠️ Set default font an toàn hơn (Casting 'any' để bypass check của TS vì defaultProps bị loại khỏi type def)
  if ((Text as any).defaultProps == null) (Text as any).defaultProps = {};
  if (!(Text as any).defaultProps.style) {
    (Text as any).defaultProps.style = { fontFamily: 'TNH-Xuong' };
  }

  if ((TextInput as any).defaultProps == null) (TextInput as any).defaultProps = {};
  if (!(TextInput as any).defaultProps.style) {
    (TextInput as any).defaultProps.style = { fontFamily: 'TNH-Xuong' };
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
            fontFamily: 'TNH-Xuong',
            fontSize: 24,
          },
          contentStyle: {
            backgroundColor: '#0a0a0a',
          },
        }}
      >
        {/* Root entry */}
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />

        {/* Other screens */}
        <Stack.Screen
          name="scenario-select"
          options={{ title: 'Chọn Kịch Bản' }}
        />

        <Stack.Screen
          name="player-setup"
          options={{ title: 'Thiết Lập Người Chơi' }}
        />

        <Stack.Screen
          name="manual-role-note"
          options={{ title: 'Ghi Nhận Vai Trò' }}
        />

        <Stack.Screen
          name="game-master-board"
          options={{
            title: 'Bảng Điều Khiển',
            presentation: 'fullScreenModal',
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
