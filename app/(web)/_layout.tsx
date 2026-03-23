import { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Stack, useRouter, usePathname } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth.store';
import { useSocketStore } from '../../src/stores/socket.store';
import { COLORS } from '../../src/constants';
import { Ionicons } from '@expo/vector-icons';

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    icon: 'map-outline',
    iconActive: 'map',
    route: '/(web)/dashboard',
    roles: ['ADMIN', 'SUPERVISOR'],
  },
  {
    label: 'Usuarios',
    icon: 'people-outline',
    iconActive: 'people',
    route: '/(web)/users',
    roles: ['ADMIN', 'SUPERVISOR'],
  },
  {
    label: 'Geocercas',
    icon: 'location-outline',
    iconActive: 'location',
    route: '/(web)/geofences',
    roles: ['ADMIN', 'SUPERVISOR'],
  },
  {
    label: 'Reportes',
    icon: 'bar-chart-outline',
    iconActive: 'bar-chart',
    route: '/(web)/reports',
    roles: ['ADMIN', 'SUPERVISOR'],
  },
  {
    label: 'Alertas',
    icon: 'notifications-outline',
    iconActive: 'notifications',
    route: '/(web)/alerts',
    roles: ['ADMIN', 'SUPERVISOR'],
  },
  {
    label: 'Auditoría',
    icon: 'shield-outline',
    iconActive: 'shield',
    route: '/(web)/audit',
    roles: ['ADMIN'],
  },
  {
    label: 'Mi Perfil',
    icon: 'person-outline',
    iconActive: 'person',
    route: '/(web)/profile',
    roles: ['ADMIN', 'SUPERVISOR'],
  },
];

export default function WebLayout() {
  const { user, token, logout } = useAuthStore();
  const { connect, disconnect, connected, recentAlerts } = useSocketStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (token) connect(token);
    return () => disconnect();
  }, [token]);

  const allowedNav = NAV_ITEMS.filter((item) =>
    item.roles.includes(user?.rol || ''),
  );
  const unreadCount = recentAlerts.length;

  return (
    <View style={styles.shell}>
      <View style={styles.sidebar}>
        <View style={styles.brand}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoIcon}>⬡</Text>
          </View>
          <Text style={styles.logoText}>rastreador</Text>
        </View>

        <View style={styles.statusRow}>
          <View
            style={[
              styles.dot,
              {
                backgroundColor: connected
                  ? COLORS.primaryLight
                  : COLORS.danger,
              },
            ]}
          />
          <Text style={styles.statusText}>
            {connected ? 'En línea' : 'Desconectado'}
          </Text>
        </View>

        <ScrollView style={styles.nav} showsVerticalScrollIndicator={false}>
          {allowedNav.map((item) => {
            const routeKey = item.route.replace('/(web)/', '');
            const isActive =
              pathname === `/${routeKey}` || pathname.endsWith(routeKey);
            return (
              <TouchableOpacity
                key={item.route}
                style={[styles.navItem, isActive && styles.navItemActive]}
                onPress={() => router.push(item.route as any)}
              >
                <Ionicons
                  name={(isActive ? item.iconActive : item.icon) as any}
                  size={18}
                  color={isActive ? COLORS.textOnDark : '#6b9ab8'}
                />
                <Text
                  style={[styles.navLabel, isActive && styles.navLabelActive]}
                >
                  {item.label}
                </Text>
                {item.label === 'Alertas' && unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.userSection}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.nombre?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.nombre}
              </Text>
              <Text style={styles.userRole}>{user?.rol}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.main}>
        <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.bg },
  sidebar: {
    width: 220,
    backgroundColor: COLORS.bgDark,
    paddingTop: 24,
    paddingHorizontal: 12,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: { fontSize: 18, color: '#fff' },
  logoText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textOnDark,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, color: '#6b9ab8' },
  nav: { flex: 1 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 2,
  },
  navItemActive: { backgroundColor: COLORS.primary + '35' },
  navLabel: { fontSize: 14, color: '#6b9ab8', flex: 1 },
  navLabelActive: { color: COLORS.textOnDark, fontWeight: '700' },
  badge: {
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  userSection: {
    borderTopWidth: 1,
    borderTopColor: '#0a2d42',
    paddingTop: 12,
    paddingBottom: 24,
    gap: 10,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  userName: { fontSize: 13, color: COLORS.textOnDark, fontWeight: '600' },
  userRole: { fontSize: 11, color: '#6b9ab8' },
  logoutBtn: {
    backgroundColor: COLORS.danger + '20',
    borderWidth: 1,
    borderColor: COLORS.danger + '50',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  logoutText: { color: COLORS.danger, fontSize: 13, fontWeight: '600' },
  main: { flex: 1, backgroundColor: COLORS.bg },
});
