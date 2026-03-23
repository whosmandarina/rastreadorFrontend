import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { alertsService, Alert } from '../../src/services/alerts.service';
import { usersService, User } from '../../src/services/users.service';
import { Ionicons } from '@expo/vector-icons';
import { useSocketStore } from '../../src/stores/socket.store';
import { COLORS } from '../../src/constants';

const ALERT_ICON_NAMES: Record<string, string> = {
  GEOFENCE_ENTER: 'enter-outline',
  GEOFENCE_EXIT: 'exit-outline',
  BATTERY_LOW: 'battery-dead-outline',
  SIGNAL_LOST: 'wifi-outline',
  DEVICE_OFF: 'phone-portrait-outline',
};

const ALERT_COLORS: Record<string, string> = {
  GEOFENCE_ENTER: COLORS.success,
  GEOFENCE_EXIT: COLORS.warning,
  BATTERY_LOW: COLORS.danger,
  SIGNAL_LOST: COLORS.textMuted,
  DEVICE_OFF: COLORS.danger,
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  GEOFENCE_ENTER: 'Entrada a geocerca',
  GEOFENCE_EXIT: 'Salida de geocerca',
  BATTERY_LOW: 'Batería baja',
  SIGNAL_LOST: 'Señal perdida',
  DEVICE_OFF: 'Dispositivo apagado',
};

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [users, setUsers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const { recentAlerts } = useSocketStore();

  const load = () => {
    setLoading(true);
    Promise.all([
      alertsService.getAll({ limit: 100 }),
      usersService.getAll().catch(() => []),
    ])
      .then(([alertsData, usersData]) => {
        setAlerts(alertsData);
        // Build id -> nombre map for quick lookup
        const map: Record<number, string> = {};
        usersData.forEach((u: User) => {
          map[u.id_user] = u.nombre;
        });
        setUsers(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [recentAlerts.length]);

  const markRead = async (id: number) => {
    await alertsService.markRead(id);
    setAlerts((prev) =>
      prev.map((a) => (a.id_alert === id ? { ...a, is_read: true } : a)),
    );
  };

  const unread = alerts.filter((a) => !a.is_read);
  const read = alerts.filter((a) => a.is_read);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Centro de Alertas</Text>
        <Text style={styles.sub}>
          {unread.length} sin leer · {alerts.length} total
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {unread.length > 0 && (
            <>
              <Text style={styles.section}>Sin leer</Text>
              {unread.map((a) => (
                <AlertCard
                  key={a.id_alert}
                  alert={a}
                  onRead={markRead}
                  users={users}
                />
              ))}
            </>
          )}
          {read.length > 0 && (
            <>
              <Text style={styles.section}>Leídas</Text>
              {read.map((a) => (
                <AlertCard
                  key={a.id_alert}
                  alert={a}
                  onRead={markRead}
                  users={users}
                />
              ))}
            </>
          )}
          {alerts.length === 0 && (
            <Text style={styles.empty}>No hay alertas registradas</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function AlertCard({
  alert,
  onRead,
  users,
}: {
  alert: Alert;
  onRead: (id: number) => void;
  users: Record<number, string>;
}) {
  const color = ALERT_COLORS[alert.tipo_alerta] ?? COLORS.textMuted;
  const iconName = ALERT_ICON_NAMES[alert.tipo_alerta] ?? 'warning-outline';
  const typeLabel =
    ALERT_TYPE_LABELS[alert.tipo_alerta] ??
    alert.tipo_alerta.replace(/_/g, ' ');
  const userName =
    (alert as any).usuario_nombre ||
    alert.nombre ||
    (alert.id_user ? users[alert.id_user] : null);
  const date = new Date(alert.timestamp_alerta).toLocaleString('es-MX');

  return (
    <View
      style={[
        styles.card,
        !alert.is_read && { borderLeftColor: color, borderLeftWidth: 3 },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: color + '20' }]}>
        <Ionicons name={iconName as any} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.cardTop}>
          <Text style={[styles.cardType, { color }]}>{typeLabel}</Text>
          <Text style={styles.cardDate}>{date}</Text>
        </View>
        {userName && (
          <View style={styles.cardUserRow}>
            <Ionicons
              name="person-outline"
              size={12}
              color={COLORS.textMuted}
            />
            <Text style={styles.cardUser}>{userName}</Text>
          </View>
        )}
        <Text style={styles.cardDesc}>{alert.descripcion}</Text>
      </View>
      {!alert.is_read && (
        <TouchableOpacity
          style={styles.readBtn}
          onPress={() => onRead(alert.id_alert)}
        >
          <Text style={styles.readBtnText}>✓</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  sub: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  scroll: { flex: 1, padding: 16 },
  section: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardType: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  cardDate: { fontSize: 11, color: COLORS.textMuted },
  cardDesc: { fontSize: 13, color: COLORS.textSub, lineHeight: 18 },
  cardUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
    marginBottom: 3,
  },
  cardUser: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  readBtn: {
    backgroundColor: COLORS.success + '20',
    borderRadius: 8,
    padding: 8,
    alignSelf: 'center',
  },
  readBtnText: { color: COLORS.success, fontWeight: '700', fontSize: 14 },
  empty: {
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 40,
    fontSize: 14,
  },
});
