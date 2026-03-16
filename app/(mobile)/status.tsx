import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as Battery from 'expo-battery';
import { useTrackingStore } from '../../src/stores/tracking.store';
import { COLORS, BATTERY_LOW_THRESHOLD } from '../../src/constants';

export default function StatusScreen() {
  const { status, isTracking, pendingCount, syncPending, lastUpdate, speed, accuracy, currentLocation } = useTrackingStore();
  const [netType, setNetType] = useState<string>('—');
  const [isOnline, setIsOnline] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [batteryState, setBatteryState] = useState<string>('—');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected === true);
      setNetType(state.type ?? '—');
    });

    Battery.getBatteryLevelAsync().then((l) => setBatteryLevel(Math.round(l * 100))).catch(() => {});
    Battery.getBatteryStateAsync().then((s) => {
      const labels: Record<number, string> = { 0: 'Desconocido', 1: 'Sin cargar', 2: 'Cargando', 3: 'Completo' };
      setBatteryState(labels[s] ?? '—');
    }).catch(() => {});

    return () => unsub();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    await syncPending();
    setSyncing(false);
  };

  const batteryColor = batteryLevel !== null
    ? batteryLevel <= BATTERY_LOW_THRESHOLD ? COLORS.danger
    : batteryLevel <= 30 ? COLORS.warning
    : COLORS.success
    : COLORS.textMuted;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Estado del dispositivo</Text>

      {/* Tracking */}
      <Section title="Rastreo">
        <Row label="Estado" value={status.replace('_', ' ')} valueColor={isTracking ? COLORS.success : COLORS.textMuted} />
        <Row label="Activo" value={isTracking ? 'Sí' : 'No'} valueColor={isTracking ? COLORS.success : COLORS.danger} />
        <Row label="Última actualización" value={lastUpdate ? new Date(lastUpdate).toLocaleString('es-MX') : '—'} />
        <Row label="Velocidad" value={speed !== null ? `${speed} km/h` : '—'} />
        <Row label="Precisión GPS" value={accuracy !== null ? `${Math.round(accuracy)} m` : '—'} />
        {currentLocation && (
          <Row label="Posición" value={`${currentLocation.latitud.toFixed(5)}, ${currentLocation.longitud.toFixed(5)}`} />
        )}
      </Section>

      {/* Battery */}
      <Section title="Batería">
        <Row label="Nivel" value={batteryLevel !== null ? `${batteryLevel}%` : '—'} valueColor={batteryColor} />
        <Row label="Estado" value={batteryState} />
        {batteryLevel !== null && batteryLevel <= BATTERY_LOW_THRESHOLD && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>⚠️ Batería baja — frecuencia de rastreo reducida automáticamente</Text>
          </View>
        )}
      </Section>

      {/* Network */}
      <Section title="Conectividad">
        <Row label="Internet" value={isOnline ? 'Conectado' : 'Sin conexión'} valueColor={isOnline ? COLORS.success : COLORS.danger} />
        <Row label="Tipo de red" value={netType} />
      </Section>

      {/* Offline queue */}
      <Section title="Cola offline">
        <Row label="Ubicaciones pendientes" value={`${pendingCount}`} valueColor={pendingCount > 0 ? COLORS.warning : COLORS.success} />
        {pendingCount > 0 && (
          <>
            <Text style={styles.offlineSub}>
              Se sincronizarán automáticamente al recuperar conexión, o puedes hacerlo manualmente:
            </Text>
            <TouchableOpacity
              style={[styles.syncBtn, (!isOnline || syncing) && { opacity: 0.5 }]}
              onPress={handleSync}
              disabled={!isOnline || syncing}
            >
              <Text style={styles.syncText}>{syncing ? 'Sincronizando...' : '🔄 Sincronizar ahora'}</Text>
            </TouchableOpacity>
          </>
        )}
        {pendingCount === 0 && (
          <Text style={styles.allSyncedText}>✅ Todo sincronizado</Text>
        )}
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingTop: 60, gap: 4, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 16 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingHorizontal: 4 },
  sectionCard: { backgroundColor: COLORS.bgCard, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLabel: { fontSize: 14, color: COLORS.textSub },
  rowValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  warningBox: { margin: 12, backgroundColor: COLORS.warning + '15', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: COLORS.warning + '40' },
  warningText: { fontSize: 12, color: COLORS.warning, lineHeight: 18 },
  offlineSub: { fontSize: 12, color: COLORS.textMuted, paddingHorizontal: 16, paddingVertical: 8, lineHeight: 18 },
  syncBtn: { margin: 12, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  syncText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  allSyncedText: { padding: 16, color: COLORS.success, fontSize: 14, textAlign: 'center' },
});
