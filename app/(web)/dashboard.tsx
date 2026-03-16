import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, TextInput, Modal,
} from 'react-native';
import { useSocketStore, LiveUser } from '../../src/stores/socket.store';
import { usersService, User } from '../../src/services/users.service';
import { geofencesService, Geofence } from '../../src/services/geofences.service';
import { useAuthStore } from '../../src/stores/auth.store';
import { COLORS } from '../../src/constants';

const STATUS_COLORS: Record<string, string> = {
  ONLINE: COLORS.success,
  OFFLINE: COLORS.textMuted,
  UNKNOWN: COLORS.warning,
};
const STATUS_LABELS: Record<string, string> = {
  ONLINE: 'En línea',
  OFFLINE: 'Sin conexión',
  UNKNOWN: 'Desconocido',
};

function buildLeafletHTML(users: LiveUser[], geofences: Geofence[]): string {
  const userMarkers = users.filter((u) => u.latitud && u.longitud).map((u) => `
    L.circleMarker([${u.latitud}, ${u.longitud}], {
      radius: 10, fillColor: "${u.status === 'ONLINE' ? '#2a9d6e' : '#7a8a8d'}",
      color: "#fff", weight: 2, opacity: 1, fillOpacity: 0.9
    }).bindPopup("<b>${u.nombre || 'Usuario ' + u.id_user}</b><br/>Estado: ${u.status}<br/>Batería: ${u.bateria ?? '—'}%").addTo(map);
  `).join('\n');

  const geofenceLayers = geofences.map((g) => {
    if (g.tipo === 'CIRCLE') {
      const c = g.coordenadas;
      const lat = c?.lat ?? c?.latitude ?? 0;
      const lng = c?.lng ?? c?.longitude ?? c?.long ?? 0;
      const r = g.radio ?? 150;
      return `
        L.circle([${lat}, ${lng}], { radius: ${r}, color: '#249a98', fillColor: '#249a98', fillOpacity: 0.1, weight: 2, dashArray: '6,4' })
          .bindTooltip('<b>${g.nombre}</b><br/>Radio: ${r}m', { direction: 'top' }).addTo(map);
        L.marker([${lat}, ${lng}], { icon: L.divIcon({
          html: '<div style="background:#2a8fa015;border:1.5px solid #2a8fa0;border-radius:6px;padding:2px 8px;font-size:11px;color:#2a8fa0;font-weight:700;white-space:nowrap;">${g.nombre}</div>',
          className: '', iconAnchor: [0,0]
        })}).addTo(map);`;
    } else if (g.tipo === 'POLYGON' && Array.isArray(g.coordenadas)) {
      const ll = g.coordenadas.map((c: any) => `[${c.lat ?? c.latitude}, ${c.lng ?? c.longitude}]`).join(',');
      return `L.polygon([${ll}], { color: '#e8a24a', fillColor: '#e8a24a', fillOpacity: 0.1, weight: 2, dashArray: '6,4' })
        .bindTooltip('<b>${g.nombre}</b>', { direction: 'top' }).addTo(map);`;
    }
    return '';
  }).join('\n');

  const center = users[0]?.latitud ? `[${users[0].latitud}, ${users[0].longitud}]` : '[19.2433, -103.7247]';

  return `<!DOCTYPE html><html><head>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>*{margin:0;padding:0}#map{width:100vw;height:100vh}</style>
  </head><body><div id="map"></div><script>
    const map = L.map('map').setView(${center}, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
    ${geofenceLayers}
    ${userMarkers}
  </script></body></html>`;
}

export default function DashboardScreen() {
  const { user: currentUser } = useAuthStore();
  const { liveUsers, recentAlerts, connected } = useSocketStore();
  const [users, setUsers] = useState<User[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const isAdmin = currentUser?.rol === 'ADMIN';
  const [showGeoPanel, setShowGeoPanel] = useState(false);
  const [showGeoModal, setShowGeoModal] = useState(false);
  const [editingGeo, setEditingGeo] = useState<Geofence | null>(null);
  const [geoForm, setGeoForm] = useState({ nombre: '', tipo: 'CIRCLE' as 'CIRCLE' | 'POLYGON', lat: '', lng: '', radio: '150' });
  const [savingGeo, setSavingGeo] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([usersService.getAll().catch(() => []), geofencesService.getAll().catch(() => [])])
      .then(([u, g]) => { setUsers(u); setGeofences(g); }).finally(() => setLoading(false));
  };
  useEffect(() => { loadData(); }, []);

  const liveList = Object.values(liveUsers);
  const enriched = users
    .filter((u) => u.nombre?.toLowerCase().includes(search.toLowerCase()) || u.correo?.toLowerCase().includes(search.toLowerCase()))
    .map((u) => ({ ...u, live: liveUsers[u.id_user] }));

  const html = buildLeafletHTML(liveList, geofences);

  const openCreateGeo = () => { setGeoForm({ nombre: '', tipo: 'CIRCLE', lat: '', lng: '', radio: '150' }); setEditingGeo(null); setShowGeoModal(true); };
  const openEditGeo = (g: Geofence) => {
    const c = g.tipo === 'CIRCLE' ? g.coordenadas : g.coordenadas?.[0] ?? {};
    setGeoForm({ nombre: g.nombre, tipo: g.tipo, lat: String(c?.lat ?? ''), lng: String(c?.lng ?? ''), radio: String(g.radio ?? 150) });
    setEditingGeo(g); setShowGeoModal(true);
  };
  const saveGeo = async () => {
    setSavingGeo(true);
    try {
      const payload: any = {
        nombre: geoForm.nombre, tipo: geoForm.tipo,
        coordenadas: geoForm.tipo === 'CIRCLE' ? { lat: parseFloat(geoForm.lat), lng: parseFloat(geoForm.lng) } : [{ lat: parseFloat(geoForm.lat), lng: parseFloat(geoForm.lng) }],
        radio: geoForm.tipo === 'CIRCLE' ? parseFloat(geoForm.radio) : undefined,
      };
      if (editingGeo) await geofencesService.update(editingGeo.id_geofence, payload);
      else await geofencesService.create(payload);
      setShowGeoModal(false); loadData();
    } catch (e: any) { alert(e?.response?.data?.message || 'Error al guardar'); }
    finally { setSavingGeo(false); }
  };
  const deleteGeo = async (id: number) => {
    if (!confirm('¿Eliminar esta geocerca?')) return;
    await geofencesService.delete(id); loadData();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Centro de Mando</Text>
          <Text style={styles.headerSub}>{liveList.filter(u => u.status === 'ONLINE').length} activos · {recentAlerts.length} alertas · {geofences.length} geocercas</Text>
        </View>
        <View style={styles.headerRight}>
          {isAdmin && (
            <TouchableOpacity style={[styles.geoToggleBtn, showGeoPanel && styles.geoToggleBtnActive]} onPress={() => setShowGeoPanel(!showGeoPanel)}>
              <Text style={[styles.geoToggleText, showGeoPanel && styles.geoToggleTextActive]}>📍 Geocercas</Text>
            </TouchableOpacity>
          )}
          <View style={[styles.connBadge, { backgroundColor: connected ? COLORS.success + '20' : COLORS.accent + '20' }]}>
            <View style={[styles.connDot, { backgroundColor: connected ? COLORS.success : COLORS.accent }]} />
            <Text style={[styles.connText, { color: connected ? COLORS.success : COLORS.accent }]}>{connected ? 'En línea' : 'Sin socket'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.mapContainer}>
          {Platform.OS === 'web' ? (
            <iframe key={JSON.stringify(geofences) + JSON.stringify(liveList)} srcDoc={html}
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12 } as any} title="mapa" />
          ) : (
            <View style={{ flex: 1, backgroundColor: COLORS.bgInput, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: COLORS.textMuted }}>Mapa disponible en web</Text>
            </View>
          )}
          {recentAlerts.length > 0 && (
            <View style={styles.alertsOverlay}>
              <Text style={styles.alertsOverlayTitle}>🔔 Alertas recientes</Text>
              {recentAlerts.slice(0, 3).map((a, i) => <Text key={i} style={styles.alertOverlayText} numberOfLines={1}>• {a.tipo_alerta} — {a.descripcion}</Text>)}
            </View>
          )}
          {geofences.length > 0 && (
            <View style={styles.legendOverlay}>
              <Text style={styles.legendTitle}>Geocercas</Text>
              {geofences.slice(0, 4).map((g) => (
                <View key={g.id_geofence} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: g.tipo === 'CIRCLE' ? COLORS.primary : COLORS.warning }]} />
                  <Text style={styles.legendText} numberOfLines={1}>{g.nombre}</Text>
                  {g.radio && <Text style={styles.legendMeta}>{g.radio}m</Text>}
                </View>
              ))}
              {geofences.length > 4 && <Text style={styles.legendMore}>+{geofences.length - 4} más</Text>}
            </View>
          )}
        </View>

        <View style={styles.panel}>
          {showGeoPanel ? (
            <>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>Geocercas</Text>
                <TouchableOpacity style={styles.addBtn} onPress={openCreateGeo}><Text style={styles.addBtnText}>+</Text></TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {geofences.map((g) => (
                  <View key={g.id_geofence} style={styles.geoCard}>
                    <View style={styles.geoCardLeft}>
                      <Text style={styles.geoCardIcon}>{g.tipo === 'CIRCLE' ? '⭕' : '🔷'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.geoCardName} numberOfLines={1}>{g.nombre}</Text>
                        <Text style={styles.geoCardMeta}>{g.tipo}{g.radio ? ` · ${g.radio}m` : ''}</Text>
                      </View>
                    </View>
                    <View style={styles.geoCardActions}>
                      <TouchableOpacity style={styles.geoActionBtn} onPress={() => openEditGeo(g)}><Text>✏️</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.geoActionBtn, { backgroundColor: COLORS.accent + '20' }]} onPress={() => deleteGeo(g.id_geofence)}><Text>🗑</Text></TouchableOpacity>
                    </View>
                  </View>
                ))}
                {geofences.length === 0 && <View style={styles.emptyGeo}><Text style={styles.emptyGeoIcon}>📍</Text><Text style={styles.emptyGeoText}>Sin geocercas. Crea una para comenzar.</Text></View>}
              </ScrollView>
            </>
          ) : (
            <>
              <Text style={styles.panelTitle}>Usuarios</Text>
              <TextInput style={styles.search} placeholder="Buscar..." placeholderTextColor={COLORS.textMuted} value={search} onChangeText={setSearch} />
              {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} /> : (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {enriched.map((u) => {
                    const status = u.live?.status ?? 'UNKNOWN';
                    return (
                      <TouchableOpacity key={u.id_user} style={[styles.userCard, selectedUser === u.id_user && styles.userCardActive]} onPress={() => setSelectedUser(u.id_user === selectedUser ? null : u.id_user)}>
                        <View style={styles.userCardLeft}>
                          <View style={[styles.userDot, { backgroundColor: STATUS_COLORS[status] }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.userName} numberOfLines={1}>{u.nombre}</Text>
                            <Text style={styles.userMeta}>{u.rol}</Text>
                          </View>
                        </View>
                        <Text style={[styles.userStatus, { color: STATUS_COLORS[status] }]}>{STATUS_LABELS[status]}</Text>
                      </TouchableOpacity>
                    );
                  })}
                  {enriched.length === 0 && <Text style={styles.emptyText}>Sin resultados</Text>}
                </ScrollView>
              )}
              {selectedUser !== null && liveUsers[selectedUser] && (
                <View style={styles.userDetail}>
                  <Text style={styles.detailTitle}>Detalle en vivo</Text>
                  {[['Batería', `${liveUsers[selectedUser].bateria ?? '—'}%`], ['Velocidad', `${liveUsers[selectedUser].velocidad ?? 0} km/h`], ['Señal', liveUsers[selectedUser].senal ?? '—'], ['Lat/Lng', `${liveUsers[selectedUser].latitud?.toFixed(4)}, ${liveUsers[selectedUser].longitud?.toFixed(4)}`]].map(([l, v]) => (
                    <View key={l} style={styles.detailRow}><Text style={styles.detailLabel}>{l}</Text><Text style={styles.detailValue}>{v}</Text></View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </View>

      <Modal visible={showGeoModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editingGeo ? 'Editar' : 'Nueva'} Geocerca</Text>
            {[['Nombre', 'nombre', 'Zona Planta', 'default'], ['Latitud', 'lat', '19.2433', 'numeric'], ['Longitud', 'lng', '-103.7247', 'numeric']].map(([label, key, ph, kb]: any) => (
              <View key={key} style={styles.mfield}>
                <Text style={styles.mfieldLabel}>{label}</Text>
                <TextInput style={styles.minput} value={(geoForm as any)[key]} onChangeText={(v) => setGeoForm((p) => ({ ...p, [key]: v }))} placeholder={ph} placeholderTextColor={COLORS.textMuted} keyboardType={kb} />
              </View>
            ))}
            <View style={styles.mfield}>
              <Text style={styles.mfieldLabel}>Tipo</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['CIRCLE', 'POLYGON'] as const).map((t) => (
                  <TouchableOpacity key={t} style={[styles.typeBtn, geoForm.tipo === t && styles.typeBtnActive]} onPress={() => setGeoForm((p) => ({ ...p, tipo: t }))}>
                    <Text style={[styles.typeBtnText, geoForm.tipo === t && { color: COLORS.primary }]}>{t === 'CIRCLE' ? '⭕ Círculo' : '🔷 Polígono'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {geoForm.tipo === 'CIRCLE' && (
              <View style={styles.mfield}>
                <Text style={styles.mfieldLabel}>Radio (metros)</Text>
                <TextInput style={styles.minput} value={geoForm.radio} onChangeText={(v) => setGeoForm((p) => ({ ...p, radio: v }))} placeholder="150" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
              </View>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowGeoModal(false)}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveGeo} disabled={savingGeo}>
                {savingGeo ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.bgCard },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  geoToggleBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.primary },
  geoToggleBtnActive: { backgroundColor: COLORS.primary },
  geoToggleText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  geoToggleTextActive: { color: '#fff' },
  connBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  connDot: { width: 7, height: 7, borderRadius: 4 },
  connText: { fontSize: 12, fontWeight: '600' },
  body: { flex: 1, flexDirection: 'row', padding: 16, gap: 16 },
  mapContainer: { flex: 1, borderRadius: 12, overflow: 'hidden', position: 'relative', borderWidth: 1, borderColor: COLORS.border },
  alertsOverlay: { position: 'absolute', bottom: 12, left: 12, right: 200, backgroundColor: '#fdfdfdee', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  alertsOverlayTitle: { color: COLORS.warning, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  alertOverlayText: { color: COLORS.textSub, fontSize: 12, paddingVertical: 2 },
  legendOverlay: { position: 'absolute', top: 12, right: 12, backgroundColor: '#fdfdfdee', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: COLORS.border, minWidth: 150 },
  legendTitle: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { flex: 1, fontSize: 12, color: COLORS.text },
  legendMeta: { fontSize: 11, color: COLORS.textMuted },
  legendMore: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  panel: { width: 260, gap: 12 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: 8, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  search: { backgroundColor: COLORS.bgInput, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, color: COLORS.text, fontSize: 14 },
  geoCard: { backgroundColor: COLORS.bgCard, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  geoCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  geoCardIcon: { fontSize: 18 },
  geoCardName: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  geoCardMeta: { fontSize: 11, color: COLORS.textMuted },
  geoCardActions: { flexDirection: 'row', gap: 4 },
  geoActionBtn: { backgroundColor: COLORS.bgInput, borderRadius: 6, padding: 5 },
  emptyGeo: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyGeoIcon: { fontSize: 36 },
  emptyGeoText: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center' },
  userCard: { backgroundColor: COLORS.bgCard, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  userCardActive: { borderColor: COLORS.primary },
  userCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  userDot: { width: 9, height: 9, borderRadius: 5 },
  userName: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  userMeta: { fontSize: 11, color: COLORS.textMuted },
  userStatus: { fontSize: 11, fontWeight: '600' },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', marginTop: 20, fontSize: 13 },
  userDetail: { backgroundColor: COLORS.bgCard, borderRadius: 10, padding: 14, borderWidth: 1.5, borderColor: COLORS.primary + '50' },
  detailTitle: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginBottom: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel: { fontSize: 12, color: COLORS.textMuted },
  detailValue: { fontSize: 12, color: COLORS.text, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: '#02182b80', alignItems: 'center', justifyContent: 'center' },
  modal: { backgroundColor: COLORS.bgCard, borderRadius: 16, padding: 28, width: 400, borderWidth: 1, borderColor: COLORS.border },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 20 },
  mfield: { marginBottom: 14 },
  mfieldLabel: { fontSize: 13, color: COLORS.textSub, marginBottom: 5, fontWeight: '500' },
  minput: { backgroundColor: COLORS.bgInput, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, color: COLORS.text, fontSize: 14 },
  typeBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgInput, alignItems: 'center' },
  typeBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  typeBtnText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelText: { color: COLORS.textSub, fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
});