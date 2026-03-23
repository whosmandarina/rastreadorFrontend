import { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, TextInput, Modal,
} from 'react-native';
import { useSocketStore, LiveUser } from '../../src/stores/socket.store';
import { usersService, User } from '../../src/services/users.service';
import { geofencesService, Geofence } from '../../src/services/geofences.service';
import { useAuthStore } from '../../src/stores/auth.store';
import { Ionicons } from '@expo/vector-icons';
import ConfirmModal from '../../src/components/ConfirmModal';
import { escapeHtml } from '../../src/utils/sanitize';
import { geoValidators } from '../../src/utils/geoValidators';

const ROL_ES: Record<string, string> = {
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  USER: 'Usuario',
};
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
      const safeName = escapeHtml(g.nombre);
      return `
        L.circle([${lat}, ${lng}], { radius: ${r}, color: '#249a98', fillColor: '#249a98', fillOpacity: 0.1, weight: 2, dashArray: '6,4' })
          .bindTooltip('<b>${safeName}</b><br/>Radio: ${r}m', { direction: 'top' }).addTo(map);
        L.marker([${lat}, ${lng}], { icon: L.divIcon({
          html: '<div style="background:#2a8fa015;border:1.5px solid #2a8fa0;border-radius:6px;padding:2px 8px;font-size:11px;color:#2a8fa0;font-weight:700;white-space:nowrap;">${safeName}</div>',
          className: '', iconAnchor: [0,0]
        })}).addTo(map);`;
    } else if (g.tipo === 'POLYGON' && Array.isArray(g.coordenadas)) {
      const ll = g.coordenadas.map((c: any) => `[${c.lat ?? c.latitude}, ${c.lng ?? c.longitude}]`).join(',');
      const safePolyName = escapeHtml(g.nombre);
      return `L.polygon([${ll}], { color: '#e8a24a', fillColor: '#e8a24a', fillOpacity: 0.1, weight: 2, dashArray: '6,4' })
        .bindTooltip('<b>${safePolyName}</b>', { direction: 'top' }).addTo(map);`;
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
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '© OpenStreetMap © CARTO', maxZoom: 19, subdomains: 'abcd' }).addTo(map);
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
  const [filterRol, setFilterRol] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isAdmin = currentUser?.rol === 'ADMIN';
  const iframeRef = useRef<any>(null);

  const flyTo = (lat: number, lng: number, zoom = 16, id_user?: number) => {
    if (!lat || !lng) return;
    const iwin = iframeRef.current?.contentWindow;
    if (!iwin) return;
    // Ejecutar directamente en el contexto del iframe — más confiable que postMessage con srcDoc
    try {
      const script = `
        (function() {
          if (typeof map !== 'undefined') {
            map.flyTo([${Number(lat)}, ${Number(lng)}], ${zoom}, { animate: true, duration: 1.2 });
            ${id_user ? `if (userMarkers[${id_user}]) setTimeout(function(){ userMarkers[${id_user}].openPopup(); }, 1300);` : ''}
          }
        })();
      `;
      // Intentar acceso directo (mismo origen en dev)
      iwin.eval(script);
    } catch {
      // Fallback: postMessage si hay restricción de origen
      iwin.postMessage({ type: 'fly_to', lat: Number(lat), lng: Number(lng), zoom, id_user }, '*');
    }
  };
  const [showGeoPanel, setShowGeoPanel] = useState(false);
  const [showGeoModal, setShowGeoModal] = useState(false);
  const [editingGeo, setEditingGeo] = useState<Geofence | null>(null);
  const [geoForm, setGeoForm] = useState({ nombre: '', tipo: 'CIRCLE' as 'CIRCLE' | 'POLYGON', lat: '', lng: '', radio: '150' });
  const [polyPoints, setPolyPoints] = useState<{ lat: string; lng: string }[]>([
    { lat: '', lng: '' }, { lat: '', lng: '' }, { lat: '', lng: '' }
  ]);
  const [savingGeo, setSavingGeo] = useState(false);
  const [confirmDeleteGeo, setConfirmDeleteGeo] = useState<number | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([usersService.getAll().catch(() => []), geofencesService.getAll().catch(() => [])])
      .then(([u, g]) => { setUsers(u); setGeofences(g); }).finally(() => setLoading(false));
  };
  useEffect(() => { loadData(); }, []);

  // Enriquecer liveUsers con nombres de la BD para mostrar en el mapa
  const liveList = Object.values(liveUsers).map((lu) => {
    const dbUser = users.find((u) => u.id_user === lu.id_user);
    return { ...lu, nombre: dbUser?.nombre ?? lu.nombre ?? `Usuario ${lu.id_user}` };
  });

  const enriched = users
    .filter((u) => {
      const matchSearch = u.nombre?.toLowerCase().includes(search.toLowerCase()) || u.correo?.toLowerCase().includes(search.toLowerCase());
      const matchRol = filterRol ? u.rol === filterRol : true;
      return matchSearch && matchRol;
    })
    .map((u) => ({ ...u, live: liveUsers[u.id_user] }));

  // Solo reconstruir el mapa cuando cambien las geocercas, NO en cada ubicación
  const mapKey = geofences.map((g) => `${g.id_geofence}:${g.nombre}`).join(',') + '|init';

  const html = buildLeafletHTML(liveList, geofences);

  // Enviar actualizaciones de ubicación al iframe sin recargarlo
  useEffect(() => {
    if (!iframeRef.current?.contentWindow) return;
    liveList.forEach((u) => {
      if (!u.latitud || !u.longitud) return;
      iframeRef.current.contentWindow.postMessage({
        type: 'location_update',
        id_user: u.id_user,
        latitud: u.latitud,
        longitud: u.longitud,
        status: u.status,
        bateria: u.bateria,
        nombre: escapeHtml(u.nombre || 'Usuario ' + u.id_user),
      }, '*');
    });
  }, [liveUsers]);

  const openCreateGeo = () => {
    setGeoForm({ nombre: '', tipo: 'CIRCLE', lat: '', lng: '', radio: '150' });
    setPolyPoints([{ lat: '', lng: '' }, { lat: '', lng: '' }, { lat: '', lng: '' }]);
    setEditingGeo(null);
    setShowGeoModal(true);
  };
  const openEditGeo = (g: Geofence) => {
    if (g.tipo === 'CIRCLE') {
      const c = g.coordenadas;
      setGeoForm({ nombre: g.nombre, tipo: 'CIRCLE', lat: String(c?.lat ?? ''), lng: String(c?.lng ?? ''), radio: String(g.radio ?? 150) });
      setPolyPoints([{ lat: '', lng: '' }, { lat: '', lng: '' }, { lat: '', lng: '' }]);
    } else {
      const pts = Array.isArray(g.coordenadas) ? g.coordenadas : [];
      setGeoForm({ nombre: g.nombre, tipo: 'POLYGON', lat: '', lng: '', radio: '150' });
      setPolyPoints(pts.length >= 3 ? pts.map((p: any) => ({ lat: String(p.lat ?? ''), lng: String(p.lng ?? '') })) : [{ lat: '', lng: '' }, { lat: '', lng: '' }, { lat: '', lng: '' }]);
    }
    setEditingGeo(g);
    setShowGeoModal(true);
  };
  const saveGeo = async () => {
    if (!geoForm.nombre.trim()) { alert('El nombre es obligatorio'); return; }
    if (geoForm.tipo === 'CIRCLE') {
      if (!geoForm.lat || !geoForm.lng) { alert('Ingresa latitud y longitud'); return; }
    } else {
      const valid = polyPoints.filter(p => p.lat.trim() && p.lng.trim());
      if (valid.length < 3) { alert('Un polígono necesita mínimo 3 puntos con coordenadas'); return; }
    }
    setSavingGeo(true);
    try {
      let coordenadas: any;
      if (geoForm.tipo === 'CIRCLE') {
        coordenadas = { lat: parseFloat(geoForm.lat), lng: parseFloat(geoForm.lng) };
      } else {
        coordenadas = polyPoints
          .filter(p => p.lat.trim() && p.lng.trim())
          .map(p => ({ lat: parseFloat(p.lat), lng: parseFloat(p.lng) }));
      }
      const payload: any = {
        nombre: geoForm.nombre.trim(),
        tipo: geoForm.tipo,
        coordenadas,
        radio: geoForm.tipo === 'CIRCLE' ? parseFloat(geoForm.radio) : undefined,
      };
      if (editingGeo) await geofencesService.update(editingGeo.id_geofence, payload);
      else await geofencesService.create(payload);
      setShowGeoModal(false);
      loadData();
    } catch (e: any) { alert(e?.response?.data?.message || 'Error al guardar'); }
    finally { setSavingGeo(false); }
  };
  const deleteGeo = async (id: number) => {
    try {
      await geofencesService.delete(id);
      setConfirmDeleteGeo(null);
      loadData();
    } catch (e: any) {
      setConfirmDeleteGeo(null);
      alert(e?.response?.data?.message || 'No se pudo eliminar');
    }
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
              <Ionicons name="location-outline" size={14} color={showGeoPanel ? '#fff' : COLORS.primary} />
              <Text style={[styles.geoToggleText, showGeoPanel && styles.geoToggleTextActive]}>Geocercas</Text>
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
            <iframe ref={iframeRef} key={mapKey} srcDoc={html}
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12 } as any} title="mapa" />
          ) : (
            <View style={{ flex: 1, backgroundColor: COLORS.bgInput, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: COLORS.textMuted }}>Mapa disponible en web</Text>
            </View>
          )}
          {recentAlerts.length > 0 && (
            <View style={styles.alertsOverlay}>
              <Text style={styles.alertsOverlayTitle}><Ionicons name="notifications-outline" size={13} color={COLORS.warning} /> Alertas recientes</Text>
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
                      <Ionicons name={g.tipo === 'CIRCLE' ? 'radio-button-on-outline' : 'shapes-outline'} size={20} color={COLORS.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.geoCardName} numberOfLines={1}>{g.nombre}</Text>
                        <Text style={styles.geoCardMeta}>{g.tipo === 'CIRCLE' ? 'Círculo' : 'Polígono'}{g.radio ? ` · ${g.radio}m` : ''}</Text>
                      </View>
                    </View>
                    <View style={styles.geoCardActions}>
                      {(() => {
                        const coord = g.tipo === 'CIRCLE' ? g.coordenadas : (Array.isArray(g.coordenadas) ? g.coordenadas[0] : g.coordenadas);
                        return coord?.lat && coord?.lng ? (
                          <TouchableOpacity style={[styles.geoActionBtn, { backgroundColor: COLORS.primary }]} onPress={() => flyTo(Number(coord.lat), Number(coord.lng), 15)}>
                            <Ionicons name="navigate" size={13} color="#fff" />
                          </TouchableOpacity>
                        ) : null;
                      })()}
                      <TouchableOpacity style={styles.geoActionBtn} onPress={() => openEditGeo(g)}>
                        <Ionicons name="pencil-outline" size={13} color={COLORS.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.geoActionBtn, { backgroundColor: COLORS.danger + '20' }]} onPress={() => setConfirmDeleteGeo(g.id_geofence)}>
                        <Ionicons name="trash-outline" size={13} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                {geofences.length === 0 && <View style={styles.emptyGeo}><Ionicons name='location-outline' size={36} color={COLORS.textMuted} /><Text style={styles.emptyGeoText}>Sin geocercas. Crea una para comenzar.</Text></View>}
              </ScrollView>
            </>
          ) : (
            <>
              <Text style={styles.panelTitle}>Usuarios</Text>
              <TextInput style={styles.search} placeholder="Buscar..." placeholderTextColor={COLORS.textMuted} value={search} onChangeText={setSearch} />
              <View style={styles.dashDropdownWrap}>
                <TouchableOpacity
                  style={styles.dashDropdownBtn}
                  onPress={() => setDropdownOpen(!dropdownOpen)}
                >
                  <Ionicons name="people-outline" size={15} color={COLORS.textMuted} />
                  <Text style={styles.dashDropdownBtnText}>
                    {filterRol === '' ? 'Todos los roles'
                      : filterRol === 'ADMIN' ? 'Administrador'
                      : filterRol === 'SUPERVISOR' ? 'Supervisor'
                      : 'Usuario'}
                  </Text>
                  <Ionicons name={dropdownOpen ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.textMuted} />
                </TouchableOpacity>
                {dropdownOpen && (
                  <View style={styles.dashDropdownMenu}>
                    {[
                      { value: '', label: 'Todos los roles' },
                      { value: 'ADMIN', label: 'Administrador' },
                      { value: 'SUPERVISOR', label: 'Supervisor' },
                      { value: 'USER', label: 'Usuario' },
                    ].map((r) => (
                      <TouchableOpacity
                        key={r.value}
                        style={[styles.dashDropdownItem, filterRol === r.value && styles.dashDropdownItemActive]}
                        onPress={() => { setFilterRol(r.value); setDropdownOpen(false); }}
                      >
                        {filterRol === r.value && <Ionicons name="checkmark" size={13} color={COLORS.primary} />}
                        <Text style={[styles.dashDropdownItemText, filterRol === r.value && { color: COLORS.primary, fontWeight: '700' }]}>
                          {r.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} /> : (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {enriched.map((u) => {
                    const status = u.live?.status ?? 'UNKNOWN';
                    const live = liveUsers[u.id_user];
                    const hasLocation = live?.latitud != null && live?.longitud != null;
                    return (
                      <View key={u.id_user} style={[styles.userCard, selectedUser === u.id_user && styles.userCardActive]}>
                        <TouchableOpacity style={styles.userCardMain} onPress={() => setSelectedUser(u.id_user === selectedUser ? null : u.id_user)}>
                          <View style={[styles.userDot, { backgroundColor: STATUS_COLORS[status] }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.userName} numberOfLines={1}>{u.nombre}</Text>
                            <Text style={styles.userMeta}>{ROL_ES[u.rol] ?? u.rol}</Text>
                          </View>
                          <Text style={[styles.userStatus, { color: STATUS_COLORS[status] }]} numberOfLines={1}>{STATUS_LABELS[status]}</Text>
                        </TouchableOpacity>
                        {hasLocation && (
                          <TouchableOpacity style={styles.flyBtn} onPress={() => flyTo(Number(live.latitud), Number(live.longitud), 16, u.id_user)}>
                            <Ionicons name="navigate" size={14} color="#fff" />
                          </TouchableOpacity>
                        )}
                      </View>
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

      <ConfirmModal
        visible={confirmDeleteGeo !== null}
        title="Eliminar geocerca"
        message="¿Estás seguro de que deseas eliminar esta geocerca?"
        confirmText="Sí, eliminar"
        onConfirm={() => confirmDeleteGeo !== null && deleteGeo(confirmDeleteGeo)}
        onCancel={() => setConfirmDeleteGeo(null)}
      />

      <Modal visible={showGeoModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editingGeo ? 'Editar' : 'Nueva'} Geocerca</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Nombre */}
            <View style={styles.mfield}>
              <Text style={styles.mfieldLabel}>Nombre *</Text>
              <TextInput style={styles.minput} value={geoForm.nombre} onChangeText={(v) => setGeoForm((p) => ({ ...p, nombre: v }))} placeholder="Zona Planta Norte" placeholderTextColor={COLORS.textMuted} />
            </View>

            {/* Tipo */}
            <View style={styles.mfield}>
              <Text style={styles.mfieldLabel}>Tipo</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['CIRCLE', 'POLYGON'] as const).map((t) => (
                  <TouchableOpacity key={t} style={[styles.typeBtn, geoForm.tipo === t && styles.typeBtnActive]}
                    onPress={() => { setGeoForm((p) => ({ ...p, tipo: t })); }}>
                    <Text style={[styles.typeBtnText, geoForm.tipo === t && { color: COLORS.primary }]}>
                      {t === 'CIRCLE' ? '⭕ Círculo' : '🔷 Polígono'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* CÍRCULO */}
            {geoForm.tipo === 'CIRCLE' && (
              <>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={[styles.mfield, { flex: 1 }]}>
                    <Text style={styles.mfieldLabel}>Latitud *</Text>
                    <TextInput style={styles.minput} value={geoForm.lat} onChangeText={(v) => setGeoForm((p) => ({ ...p, lat: v }))} placeholder="19.2433" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
                  </View>
                  <View style={[styles.mfield, { flex: 1 }]}>
                    <Text style={styles.mfieldLabel}>Longitud *</Text>
                    <TextInput style={styles.minput} value={geoForm.lng} onChangeText={(v) => setGeoForm((p) => ({ ...p, lng: v }))} placeholder="-103.7247" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
                  </View>
                </View>
                <View style={styles.mfield}>
                  <Text style={styles.mfieldLabel}>Radio (metros) *</Text>
                  <TextInput style={styles.minput} value={geoForm.radio} onChangeText={(v) => setGeoForm((p) => ({ ...p, radio: v }))} placeholder="150" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
                </View>
              </>
            )}

            {/* POLÍGONO */}
            {geoForm.tipo === 'POLYGON' && (
              <View style={styles.mfield}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={styles.mfieldLabel}>Puntos del polígono * (mínimo 3)</Text>
                  <TouchableOpacity
                    style={{ backgroundColor: COLORS.primary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}
                    onPress={() => setPolyPoints((p) => [...p, { lat: '', lng: '' }])}
                  >
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>+ Agregar punto</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                  <Text style={[styles.mfieldLabel, { flex: 1, textAlign: 'center' }]}>#</Text>
                  <Text style={[styles.mfieldLabel, { flex: 3, textAlign: 'center' }]}>Latitud</Text>
                  <Text style={[styles.mfieldLabel, { flex: 3, textAlign: 'center' }]}>Longitud</Text>
                  <View style={{ width: 28 }} />
                </View>
                {polyPoints.map((pt, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{i + 1}</Text>
                    </View>
                    <TextInput
                      style={[styles.minput, { flex: 1 }]}
                      value={pt.lat}
                      onChangeText={(v) => setPolyPoints((prev) => prev.map((p, idx) => idx === i ? { ...p, lat: v } : p))}
                      placeholder="19.2433"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="numeric"
                    />
                    <TextInput
                      style={[styles.minput, { flex: 1 }]}
                      value={pt.lng}
                      onChangeText={(v) => setPolyPoints((prev) => prev.map((p, idx) => idx === i ? { ...p, lng: v } : p))}
                      placeholder="-103.7247"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="numeric"
                    />
                    {polyPoints.length > 3 && (
                      <TouchableOpacity
                        style={{ backgroundColor: COLORS.danger + '20', borderRadius: 6, padding: 4 }}
                        onPress={() => setPolyPoints((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <Text style={{ color: COLORS.danger, fontSize: 14 }}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <View style={{ backgroundColor: COLORS.bgInput, borderRadius: 8, padding: 10, marginTop: 4 }}>
                  <Text style={{ fontSize: 11, color: COLORS.textMuted, lineHeight: 16 }}>
                    💡 Ingresa las coordenadas de cada vértice del polígono en orden. Puedes obtenerlas desde Google Maps haciendo clic derecho → "¿Qué hay aquí?".
                  </Text>
                </View>
              </View>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowGeoModal(false)}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveGeo} disabled={savingGeo}>
                {savingGeo ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
            </ScrollView>
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
  dashDropdownWrap: { position: 'relative' as any, zIndex: 100 },
  dashDropdownBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.bgCard, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  dashDropdownBtnText: { flex: 1, fontSize: 13, color: COLORS.text, fontWeight: '500' },
  dashDropdownMenu: { position: 'absolute' as any, top: 40, left: 0, right: 0, backgroundColor: COLORS.bgCard, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 8, zIndex: 200, boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)', elevation: 8 },
  dashDropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dashDropdownItemActive: { backgroundColor: COLORS.primary + '12' },
  dashDropdownItemText: { fontSize: 13, color: COLORS.textSub },
  geoCard: { backgroundColor: COLORS.bgCard, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  geoCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  geoCardName: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  geoCardMeta: { fontSize: 11, color: COLORS.textMuted },
  geoCardActions: { flexDirection: 'row', gap: 4 },
  geoActionBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: COLORS.primary + '15', alignItems: 'center', justifyContent: 'center' },
  emptyGeo: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyGeoText: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center' },
  userCardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  flyBtn: {
    backgroundColor: COLORS.primary, borderRadius: 6,
    padding: 6, alignItems: 'center', justifyContent: 'center',
  },
  userCard: { backgroundColor: COLORS.bgCard, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  userCardActive: { borderColor: COLORS.primary },
  userCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  userDot: { width: 9, height: 9, borderRadius: 5 },
  userName: { fontSize: 13, color: COLORS.text, fontWeight: '600', flex: 1 },
  userMeta: { fontSize: 11, color: COLORS.textMuted },
  userStatus: { fontSize: 11, fontWeight: '600', flexShrink: 0 },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', marginTop: 20, fontSize: 13 },
  userDetail: { backgroundColor: COLORS.bgCard, borderRadius: 10, padding: 14, borderWidth: 1.5, borderColor: COLORS.primary + '50' },
  detailTitle: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginBottom: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel: { fontSize: 12, color: COLORS.textMuted },
  detailValue: { fontSize: 12, color: COLORS.text, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: '#02182b80', alignItems: 'center', justifyContent: 'center' },
  modal: { backgroundColor: COLORS.bgCard, borderRadius: 16, padding: 24, width: 460, maxWidth: '95%', maxHeight: '85vh' as any, borderWidth: 1, borderColor: COLORS.border },
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