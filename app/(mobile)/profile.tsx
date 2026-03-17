import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuthStore } from '../../src/stores/auth.store';
import { Ionicons } from '@expo/vector-icons';
import { useTrackingStore } from '../../src/stores/tracking.store';
import { COLORS } from '../../src/constants';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const { isTracking, stopTracking } = useTrackingStore();

  const handleLogout = async () => {
    if (isTracking) stopTracking();
    await logout();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.nombre?.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user?.nombre}</Text>
        <Text style={styles.correo}>{user?.correo}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.rol}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.card}>
        <InfoRow label="Nombre" value={user?.nombre ?? '—'} />
        <InfoRow label="Correo" value={user?.correo ?? '—'} />
        <InfoRow label="Rol" value={user?.rol ?? '—'} />
        <InfoRow label="ID" value={`#${user?.id}`} last />
      </View>

      {/* Tracking warning */}
      {isTracking && (
        <View style={styles.trackingBanner}>
          <Ionicons name='radio-outline' size={20} color={COLORS.success} />
          <Text style={styles.trackingBannerText}>
            El rastreo está activo. Se detendrá automáticamente al cerrar sesión.
          </Text>
        </View>
      )}

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 24, paddingTop: 60, gap: 16, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', gap: 8, marginBottom: 8 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 36, color: '#fff', fontWeight: '800' },
  name: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  correo: { fontSize: 14, color: COLORS.textMuted },
  roleBadge: { backgroundColor: COLORS.primary + '20', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.primary + '40' },
  roleText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  card: { backgroundColor: COLORS.bgCard, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLabel: { fontSize: 14, color: COLORS.textMuted },
  rowValue: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  trackingBanner: { backgroundColor: COLORS.success + '15', borderRadius: 12, padding: 14, flexDirection: 'row', gap: 10, borderWidth: 1, borderColor: COLORS.success + '30' },
  trackingBannerText: { flex: 1, fontSize: 13, color: COLORS.success, lineHeight: 20 },
  logoutBtn: { backgroundColor: COLORS.danger + '15', borderWidth: 1, borderColor: COLORS.danger + '40', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  logoutText: { color: COLORS.danger, fontSize: 16, fontWeight: '700' },
});