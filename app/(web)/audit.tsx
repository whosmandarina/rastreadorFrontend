import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import api from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants';

interface AuditLog {
  id_audit?: number;
  id_user_action: number;
  action_type: string;
  target_entity?: string;
  target_id?: number;
  details: string;
  timestamp_action?: string;
  usuario_nombre?: string;
  usuario_rol?: string;
  [key: string]: any;
}

const ACTION_CONFIG: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  USER_CREATE: {
    label: 'Usuario creado',
    color: COLORS.success,
    icon: 'person-add-outline',
  },
  USER_UPDATE: {
    label: 'Usuario editado',
    color: COLORS.primary,
    icon: 'pencil-outline',
  },
  USER_DELETE: {
    label: 'Usuario eliminado',
    color: COLORS.danger,
    icon: 'trash-outline',
  },
  LOGIN: {
    label: 'Inicio de sesión',
    color: COLORS.primary,
    icon: 'log-in-outline',
  },
  LOGOUT: {
    label: 'Cierre de sesión',
    color: COLORS.textMuted,
    icon: 'log-out-outline',
  },
  GEOFENCE_CREATE: {
    label: 'Geocerca creada',
    color: COLORS.success,
    icon: 'location-outline',
  },
  GEOFENCE_UPDATE: {
    label: 'Geocerca editada',
    color: COLORS.primary,
    icon: 'location-outline',
  },
  GEOFENCE_DELETE: {
    label: 'Geocerca eliminada',
    color: COLORS.danger,
    icon: 'location-outline',
  },
};

const ACTION_TYPES = [
  { value: '', label: 'Todos' },
  { value: 'USER_CREATE', label: 'Crear usuario' },
  { value: 'USER_UPDATE', label: 'Editar usuario' },
  { value: 'USER_DELETE', label: 'Eliminar usuario' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
];

const TIMEZONE = 'America/Mexico_City';
function fmtDate(date: string | undefined) {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleString('es-MX', { timeZone: TIMEZONE });
}

function getDate(log: AuditLog): string {
  return (
    log.timestamp_action ||
    (log as any).created_at ||
    (log as any).timestamp ||
    ''
  );
}

export default function AuditScreen() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const params: any = { limit: 200 };
      if (filterAction) params.action_type = filterAction;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const { data } = await api.get('/audit', { params });
      setLogs(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setLogs([]);
      const status = e?.response?.status;
      if (status === 404) {
        setLoadError(
          'El endpoint de auditoría no está disponible aún. Asegúrate de que el backend tenga la ruta /api/audit.',
        );
      } else if (status === 403) {
        setLoadError('No tienes permisos para ver la auditoría.');
      } else {
        setLoadError(
          e?.response?.data?.message ||
            'Error al cargar los registros de auditoría.',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.details?.toLowerCase().includes(search.toLowerCase()) ||
      l.usuario_nombre?.toLowerCase().includes(search.toLowerCase()) ||
      l.action_type?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Auditoría del Sistema</Text>
          <Text style={styles.sub}>{logs.length} acciones registradas</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={load}>
          <Ionicons name="refresh-outline" size={18} color={COLORS.primary} />
          <Text style={styles.refreshText}>Actualizar</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        <TextInput
          style={[styles.input, { flex: 2 }]}
          placeholder="Buscar en detalles o usuario..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Desde (yyyy-mm-dd)"
          placeholderTextColor={COLORS.textMuted}
          value={startDate}
          onChangeText={setStartDate}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Hasta (yyyy-mm-dd)"
          placeholderTextColor={COLORS.textMuted}
          value={endDate}
          onChangeText={setEndDate}
        />
        <TouchableOpacity style={styles.filterApplyBtn} onPress={load}>
          <Ionicons name="search-outline" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Action type filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pills}
        contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}
      >
        {ACTION_TYPES.map((a) => (
          <TouchableOpacity
            key={a.value}
            style={[styles.pill, filterAction === a.value && styles.pillActive]}
            onPress={() => {
              setFilterAction(a.value);
            }}
          >
            <Text
              style={[
                styles.pillText,
                filterAction === a.value && styles.pillTextActive,
              ]}
            >
              {a.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Table */}
      {loadError ? (
        <View style={styles.errorBox}>
          <Ionicons
            name="alert-circle-outline"
            size={22}
            color={COLORS.danger}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.errorTitle}>
              No se pudieron cargar los registros
            </Text>
            <Text style={styles.errorText}>{loadError}</Text>
          </View>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.table} showsVerticalScrollIndicator={false}>
          {/* Header row */}
          <View style={[styles.row, styles.tableHeader]}>
            <Text style={[styles.cell, styles.cellHeader, { flex: 1.5 }]}>
              Fecha y hora
            </Text>
            <Text style={[styles.cell, styles.cellHeader, { flex: 1 }]}>
              Acción
            </Text>
            <Text style={[styles.cell, styles.cellHeader, { flex: 1 }]}>
              Usuario
            </Text>
            <Text style={[styles.cell, styles.cellHeader, { flex: 2 }]}>
              Detalle
            </Text>
          </View>

          {filtered.map((log, i) => {
            const cfg = ACTION_CONFIG[log.action_type] ?? {
              label: log.action_type,
              color: COLORS.textMuted,
              icon: 'information-circle-outline',
            };
            return (
              <View key={i} style={styles.row}>
                <Text style={[styles.cell, styles.cellDate, { flex: 1.5 }]}>
                  {fmtDate(getDate(log))}
                </Text>
                <View style={[styles.cell, { flex: 1 }]}>
                  <View
                    style={[
                      styles.actionBadge,
                      {
                        backgroundColor: cfg.color + '18',
                        borderColor: cfg.color + '40',
                      },
                    ]}
                  >
                    <Ionicons
                      name={cfg.icon as any}
                      size={12}
                      color={cfg.color}
                    />
                    <Text
                      style={[styles.actionText, { color: cfg.color }]}
                      numberOfLines={1}
                    >
                      {cfg.label}
                    </Text>
                  </View>
                </View>
                <View style={[styles.cell, { flex: 1 }]}>
                  <Text style={styles.cellUser} numberOfLines={1}>
                    {log.usuario_nombre ||
                      (log.id_user_action
                        ? `Deleted User #${log.id_user_action}`
                        : 'System')}
                  </Text>
                  {log.usuario_rol && (
                    <Text style={styles.cellRole}>{log.usuario_rol}</Text>
                  )}
                </View>
                <Text
                  style={[styles.cell, styles.cellDetail, { flex: 2 }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {log.details}
                </Text>
              </View>
            );
          })}

          {filtered.length === 0 && (
            <View style={styles.empty}>
              <Ionicons
                name="document-text-outline"
                size={40}
                color={COLORS.textMuted}
              />
              <Text style={styles.emptyText}>
                No hay registros de auditoría
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  sub: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary + '15',
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  refreshText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  filters: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  input: {
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: COLORS.text,
    fontSize: 13,
  },
  filterApplyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pills: { paddingVertical: 8, maxHeight: 44 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  pillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  pillTextActive: { color: '#fff' },
  table: { flex: 1, paddingHorizontal: 16 },
  tableHeader: { backgroundColor: COLORS.bgInput, borderRadius: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 10,
  },
  cell: { paddingHorizontal: 8 },
  cellHeader: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingVertical: 10,
  },
  cellDate: { fontSize: 11, color: COLORS.textSub },
  cellUser: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  cellRole: { fontSize: 11, color: COLORS.textMuted },
  cellDetail: { fontSize: 12, color: COLORS.textSub, lineHeight: 18 },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  actionText: { fontSize: 11, fontWeight: '700' },
  errorBox: {
    margin: 16,
    backgroundColor: COLORS.danger + '10',
    borderWidth: 1,
    borderColor: COLORS.danger + '40',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.danger,
    marginBottom: 4,
  },
  errorText: { fontSize: 13, color: COLORS.textSub, lineHeight: 20 },
  retryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'center',
  },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },
});
