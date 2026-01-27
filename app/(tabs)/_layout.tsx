import { Tabs } from 'expo-router';
import { Platform, Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0a0a0a',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        tabBarStyle: {
          backgroundColor: '#1F2937',
          borderTopColor: '#374151',
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 20 : 5,
          paddingTop: 5,
          height: Platform.OS === 'ios' ? 85 : 60,
        },
        tabBarActiveTintColor: '#818CF8',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="players"
        options={{
          title: 'Người Chơi',
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="👥" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="game"
        options={{
          title: 'Trò Chơi',
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="🎮" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Lịch Sử',
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="📜" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Cài Đặt',
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="⚙️" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

// Simple icon component using emoji
function TabBarIcon({ name, color }: { name: string; color: string }) {
  return (
    <Text style={{ fontSize: 24, opacity: color === '#818CF8' ? 1 : 0.6 }}>
      {name}
    </Text>
  );
}
