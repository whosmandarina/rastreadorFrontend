import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '../../src/stores/auth.store';
import { Ionicons } from '@expo/vector-icons';
import { useTrackingStore, TrackingStatus } from '../../src/stores/tracking.store';
import { consentService } from '../../src/services/consent.service';
import ConsentScreen from '../../src/components/ConsentScreen';
import { COLORS } from '../../src/constants';

const STATUS_CONFIG: Record<TrackingStatus, { label: string; color: string; icon: string; bg: string }> = {
  IDLE:          { label: 'Inactivo',               color: COLORS.textMuted, icon: 'pause-circle-outline',   bg: COLORS.bgInput },
  ACTIVE:        { label: 'Rastreando',             color: COLORS.success,   icon: 'radio-outline',          bg: COLORS.success + '15' },
  PAUSED:        { label: 'Pausado',                color: COLORS.warning,   icon: 'pause-circle-outline',   bg: COLORS.warning + '15' },
  NO_GPS:        { label: 'Sin señal GPS',          color: COLORS.accent,    icon: 'location-outline',       bg: COLORS.accent + '15' },
  NO_INTERNET:   { label: 'Sin internet (offline)', color: COLORS.warning,   icon: 'wifi-outline',           bg: COLORS.warning + '15' },
  LOW_BATTERY:   { label: 'Batería baja',           color: COLORS.warning,   icon: 'battery-dead-outline',   bg: COLORS.warning + '15' },
  OFFLINE_SAVING:{ label: 'Guardando offline',      color: COLORS.primary,   icon: 'cloud-offline-outline',  bg: COLORS.primary + '15' },
};

export default function HomeScreen() {
  const { user } = useAuthStore();
  const {
    status, isTracking, battery, speed, accuracy,
    pendingCount, lastUpdate, currentLocation, hasConsent,
    startTracking, stopTracking, setConsent, syncPending,
  } = useTrackingStore();

  const [checkingConsent, setCheckingConsent] = useState(true);
  const [showConsent, setShowConsent] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => { checkConsent(); }, []);

  const checkConsent = async () => {
    if (!user?.id) { setCheckingConsent(false); return; }
    try {
      await consentService.getByUser(user.id);
      setConsent(true);
    } catch {
      setConsent(false);
      setShowConsent(true);
    } finally {
      setCheckingConsent(false);
    }
  };

  const handleAcceptConsent = async () => {
    if (!user?.id) return;
    await consentService.register(user.id);
    setConsent(true);
    setShowConsent(false);
  };

  const handleToggleTracking = async () => {
    if (isTracking) {
      stopTracking();
    } else {
      if (!hasConsent) { setShowConsent(true); return; }
      setStarting(true);
      await startTracking();
      setStarting(false);
    }
  };

  if (checkingConsent) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (showConsent) {
    return <ConsentScreen onAccept={handleAcceptConsent} onDecline={() => setShowConsent(false)} />;
  }

  const statusCfg = STATUS_CONFIG[status];
  const lastUpdateStr = lastUpdate ? new Date(lastUpdate).toLocaleTimeString('es-MX') : '—';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoCircle}><Text style={styles.logoIcon}>⬡</Text></View>
          <View>
            <Text style={styles.greeting}>Hola, {user?.nombre?.split(' ')[0]}</Text>
            <Text style={styles.greetingSub}>App de rastreo</Text>
          </View>
        </View>
      </View>

      <View style={[styles.statusCard, { backgroundColor: statusCfg.bg, borderColor: statusCfg.color + '40' }]}>
        <Ionicons name={statusCfg.icon as any} size={28} color={statusCfg.color} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.statusLabel, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          {isTracking && lastUpdate && <Text style={styles.statusSub}>Última actualización: {lastUpdateStr}</Text>}
        </View>
        {status === 'ACTIVE' && <View style={styles.activeDot} />}
      </View>

      <TouchableOpacity
        style={[styles.trackBtn, isTracking ? styles.trackBtnStop : styles.trackBtnStart]}
        onPress={handleToggleTracking}
        disabled={starting}
      >
        {starting ? <ActivityIndicator color="#fff" size="large" /> : (
          <>
            <Ionicons name={isTracking ? 'stop-circle' : 'play-circle'} size={40} color='#fff' />
            <Text style={styles.trackBtnText}>{isTracking ? 'Detener rastreo' : 'Iniciar rastreo'}</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.grid}>
        <StatCard icon="battery-half-outline" label="Batería" value={battery !== null ? `${battery}%` : '—'} color={battery !== null && battery <= 15 ? COLORS.accent : COLORS.success} />
        <StatCard icon="speedometer-outline" label="Velocidad" value={speed !== null ? `${speed} km/h` : '—'} color={COLORS.primary} />
        <StatCard icon="locate-outline" label="Precisión GPS" value={accuracy !== null ? `${Math.round(accuracy)}m` : '—'} color={COLORS.primaryDark} />
        <StatCard icon="location-outline" label="Coordenadas" value={currentLocation ? `${currentLocation.latitud.toFixed(4)}, ${currentLocation.longitud.toFixed(4)}` : '—'} color={COLORS.textSub} small />
      </View>

      {pendingCount > 0 && (
        <View style={styles.offlineCard}>
          <View style={styles.offlineLeft}>
            <Ionicons name='cloud-offline-outline' size={22} color={COLORS.primary} />
            <View>
              <Text style={styles.offlineTitle}>{pendingCount} ubicaciones pendientes</Text>
              <Text style={styles.offlineSub}>Se sincronizarán cuando haya conexión</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.syncBtn} onPress={syncPending}>
            <Text style={styles.syncBtnText}>Sincronizar</Text>
          </TouchableOpacity>
        </View>
      )}

      {!hasConsent && (
        <TouchableOpacity style={styles.consentCard} onPress={() => setShowConsent(true)}>
          <Text style={styles.consentText}>⚠️ Necesitas aceptar el consentimiento para activar el rastreo</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function StatCard({ icon, label, value, color, small }: any) {
  return (
    <View style={[styles.statCard, small && styles.statCardWide]}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.statValue, { color, fontSize: small ? 12 : 18 }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingTop: 60, gap: 16, paddingBottom: 40 },
  header: { marginBottom: 4 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoCircle: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  logoIcon: { fontSize: 22, color: '#fff' },
  greeting: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  greetingSub: { fontSize: 13, color: COLORS.textMuted },
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, padding: 16, borderWidth: 1 },
  statusLabel: { fontSize: 16, fontWeight: '700' },
  statusSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  activeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.success },
  trackBtn: { borderRadius: 20, paddingVertical: 28, alignItems: 'center', justifyContent: 'center', gap: 8 },
  trackBtnStart: { backgroundColor: COLORS.primary },
  trackBtnStop: { backgroundColor: COLORS.accent },
  trackBtnText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: COLORS.bgCard, borderRadius: 14, padding: 16, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: COLORS.border },
  statCardWide: { minWidth: '100%' },
  statValue: { fontWeight: '800' },
  statLabel: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center' },
  offlineCard: { backgroundColor: COLORS.primary + '15', borderWidth: 1, borderColor: COLORS.primary + '40', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  offlineLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  offlineTitle: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  offlineSub: { fontSize: 11, color: COLORS.textMuted },
  syncBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  syncBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  consentCard: { backgroundColor: COLORS.warning + '15', borderWidth: 1, borderColor: COLORS.warning + '40', borderRadius: 14, padding: 14 },
  consentText: { fontSize: 13, color: COLORS.warning, lineHeight: 20 },
});