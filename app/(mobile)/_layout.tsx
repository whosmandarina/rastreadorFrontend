import { Tabs } from 'expo-router';
import { COLORS } from '../../src/constants';
import { Text } from 'react-native';

export default function MobileLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.bgCard,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Rastreo', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📡</Text> }} />
      <Tabs.Screen name="map" options={{ title: 'Mi Mapa', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🗺</Text> }} />
      <Tabs.Screen name="status" options={{ title: 'Estado', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📊</Text> }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text> }} />
    </Tabs>
  );
}
