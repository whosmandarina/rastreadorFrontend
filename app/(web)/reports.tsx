import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { usersService, User } from '../../src/services/users.service';
import api from '../../src/services/api';
import { COLORS, API_URL } from '../../src/constants';
import { getToken } from '../../src/utils/storage';
import { Ionicons } from '@expo/vector-icons';

export default function ReportsScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    usersService
      .getAll()
      .then((u) => setUsers(u.filter((x) => x.rol === 'USER')))
      .catch(() => {});
    // Default to last 7 days
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  const fetchStats = async () => {
    if (!selectedUser || !startDate || !endDate) return;
    setLoadingStats(true);
    try {
      const { data } = await api.get(`/reports/stats/${selectedUser.id_user}`, {
        params: { startDate, endDate },
      });
      setStats(data);
    } catch (e) {
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  };

  const exportFile = async (type: 'pdf' | 'excel') => {
    if (!selectedUser) return;
    const token = await getToken();
    const url = `${API_URL}/reports/export/${type}/${selectedUser.id_user}?startDate=${startDate}&endDate=${endDate}`;
    // Open in new tab for web
    if (typeof window !== 'undefined') {
      // fetch with auth header and download
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const safeName = selectedUser.nombre
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_]/g, '');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const ext = type === 'pdf' ? 'pdf' : 'xlsx';
      a.download = `reporte_${safeName}_${startDate}_${endDate}_${timestamp}.${ext}`;
      a.click();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reportes</Text>
        <Text style={styles.sub}>Analiza rutas, velocidades y paradas</Text>
      </View>

      <View style={styles.body}>
        {/* Config panel */}
        <View style={styles.configPanel}>
          <Text style={styles.sectionTitle}>Configuración</Text>

          <Text style={styles.label}>Usuario rastreado</Text>
          <ScrollView
            style={styles.userList}
            showsVerticalScrollIndicator={false}
          >
            {users.map((u) => (
              <TouchableOpacity
                key={u.id_user}
                style={[
                  styles.userOption,
                  selectedUser?.id_user === u.id_user &&
                    styles.userOptionActive,
                ]}
                onPress={() => {
                  setSelectedUser(u);
                  setStats(null);
                }}
              >
                <Text
                  style={[
                    styles.userOptionText,
                    selectedUser?.id_user === u.id_user && {
                      color: COLORS.primary,
                    },
                  ]}
                >
                  {u.nombre}
                </Text>
              </TouchableOpacity>
            ))}
            {users.length === 0 && (
              <Text style={styles.emptyText}>Sin usuarios USER</Text>
            )}
          </ScrollView>

          <Text style={[styles.label, { marginTop: 16 }]}>Fecha inicio</Text>
          <TextInput
            style={styles.input}
            value={startDate}
            onChangeText={setStartDate}
            placeholder="2026-01-01"
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={styles.label}>Fecha fin</Text>
          <TextInput
            style={styles.input}
            value={endDate}
            onChangeText={setEndDate}
            placeholder="2026-12-31"
            placeholderTextColor={COLORS.textMuted}
          />

          <TouchableOpacity
            style={[
              styles.btn,
              (!selectedUser || !startDate || !endDate) && styles.btnDisabled,
            ]}
            onPress={fetchStats}
            disabled={!selectedUser || !startDate || !endDate}
          >
            <Text style={styles.btnText}>Ver estadísticas</Text>
          </TouchableOpacity>

          <View style={styles.exportRow}>
            <TouchableOpacity
              style={[styles.exportBtn, { borderColor: COLORS.danger }]}
              onPress={() => exportFile('pdf')}
              disabled={!selectedUser}
            >
              <Text style={[styles.exportText, { color: COLORS.danger }]}>
                <Ionicons name="document-text-outline" size={14} /> PDF
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportBtn, { borderColor: COLORS.success }]}
              onPress={() => exportFile('excel')}
              disabled={!selectedUser}
            >
              <Text style={[styles.exportText, { color: COLORS.success }]}>
                <Ionicons name="stats-chart-outline" size={14} /> Excel
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats panel */}
        <View style={styles.statsPanel}>
          {!selectedUser && (
            <View style={styles.placeholder}>
              <Ionicons name="stats-chart-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.placeholderText}>
                Selecciona un usuario y un rango de fechas para ver el reporte
              </Text>
            </View>
          )}

          {selectedUser && loadingStats && (
            <ActivityIndicator
              color={COLORS.primary}
              style={{ marginTop: 40 }}
            />
          )}

          {stats && !loadingStats && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.reportTitle}>
                Reporte: {selectedUser?.nombre}
              </Text>
              <Text style={styles.reportSub}>
                {startDate} → {endDate}
              </Text>

              <View style={styles.statsGrid}>
                <StatCard
                  label="Velocidad Promedio"
                  value={`${parseFloat(stats.velocidad_promedio || 0).toFixed(1)} km/h`}
                  iconName="speedometer-outline"
                  color={COLORS.primary}
                />
                <StatCard
                  label="Tiempo Detenido"
                  value={`${parseFloat(stats.tiempo_total_parado_minutos || 0).toFixed(0)} min`}
                  iconName="pause-circle-outline"
                  color={COLORS.warning}
                />
                <StatCard
                  label="Paradas"
                  value={`${(stats.paradas || []).length}`}
                  iconName="location-outline"
                  color={COLORS.accent}
                />
              </View>

              {stats.paradas?.length > 0 && (
                <>
                  <Text style={styles.subTitle}>Paradas detectadas</Text>
                  {stats.paradas.map((p: any, i: number) => (
                    <View key={i} style={styles.paradaCard}>
                      <Text style={styles.paradaNum}>#{i + 1}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.paradaTime}>
                          {new Date(p.start).toLocaleString('es-MX')} →{' '}
                          {new Date(p.end).toLocaleString('es-MX')}
                        </Text>
                        <Text style={styles.paradaDur}>
                          {p.duracion_minutos} min ·{' '}
                          {parseFloat(p.lat || 0).toFixed(4)},{' '}
                          {parseFloat(p.lng || 0).toFixed(4)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </View>
  );
}

function StatCard({ label, value, iconName, color }: any) {
  return (
    <View style={[styles.statCard, { borderColor: color + '40' }]}>
      <Ionicons name={iconName} size={24} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
  body: { flex: 1, flexDirection: 'row', padding: 16, gap: 16 },
  configPanel: { width: 240, gap: 10 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: COLORS.textSub,
    fontWeight: '500',
    marginBottom: 4,
  },
  userList: {
    maxHeight: 200,
    backgroundColor: COLORS.bgCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  userOption: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  userOptionActive: { backgroundColor: COLORS.primary + '15' },
  userOptionText: { fontSize: 13, color: COLORS.textSub },
  input: {
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: COLORS.text,
    fontSize: 14,
    marginBottom: 4,
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  exportRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  exportBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  exportText: { fontWeight: '600', fontSize: 13 },
  statsPanel: { flex: 1 },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  placeholderIcon: { fontSize: 48 },
  placeholderText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
  },
  reportTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  reportSub: { fontSize: 13, color: COLORS.textMuted, marginBottom: 20 },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },
  subTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  paradaCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    gap: 10,
  },
  paradaNum: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '700',
    width: 24,
  },
  paradaTime: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  paradaDur: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  emptyText: {
    color: COLORS.textMuted,
    padding: 16,
    textAlign: 'center',
    fontSize: 13,
  },
});
