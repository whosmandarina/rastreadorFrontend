import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Modal,
} from 'react-native';
import { geofencesService, Geofence } from '../../src/services/geofences.service';
import ConfirmModal from '../../src/components/ConfirmModal';
import { COLORS } from '../../src/constants';

const EMPTY_FORM = { nombre: '', tipo: 'CIRCLE' as 'CIRCLE' | 'POLYGON', lat: '', lng: '', radio: '150' };
const EMPTY_POINTS = [{ lat: '', lng: '' }, { lat: '', lng: '' }, { lat: '', lng: '' }];

export default function GeofencesScreen() {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [polyPoints, setPolyPoints] = useState<{ lat: string; lng: string }[]>(EMPTY_POINTS);
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    geofencesService.getAll().then(setGeofences).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setPolyPoints(EMPTY_POINTS);
    setEditId(null);
    setError('');
    setShowModal(true);
  };

  const openEdit = (g: Geofence) => {
    setError('');
    if (g.tipo === 'CIRCLE') {
      const c = g.coordenadas;
      setForm({ nombre: g.nombre, tipo: 'CIRCLE', lat: String(c?.lat ?? ''), lng: String(c?.lng ?? ''), radio: String(g.radio ?? 150) });
      setPolyPoints(EMPTY_POINTS);
    } else {
      const pts = Array.isArray(g.coordenadas) ? g.coordenadas : [];
      setForm({ nombre: g.nombre, tipo: 'POLYGON', lat: '', lng: '', radio: '150' });
      setPolyPoints(pts.length >= 3
        ? pts.map((p: any) => ({ lat: String(p.lat ?? ''), lng: String(p.lng ?? '') }))
        : EMPTY_POINTS
      );
    }
    setEditId(g.id_geofence);
    setShowModal(true);
  };

  const save = async () => {
    setError('');
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }

    if (form.tipo === 'CIRCLE') {
      if (!form.lat || !form.lng) { setError('Ingresa latitud y longitud'); return; }
      if (!form.radio || isNaN(parseFloat(form.radio))) { setError('Ingresa un radio válido'); return; }
    } else {
      const valid = polyPoints.filter(p => p.lat.trim() && p.lng.trim());
      if (valid.length < 3) { setError('Un polígono necesita mínimo 3 puntos con coordenadas'); return; }
    }

    setSaving(true);
    try {
      let coordenadas: any;
      if (form.tipo === 'CIRCLE') {
        coordenadas = { lat: parseFloat(form.lat), lng: parseFloat(form.lng) };
      } else {
        coordenadas = polyPoints
          .filter(p => p.lat.trim() && p.lng.trim())
          .map(p => ({ lat: parseFloat(p.lat), lng: parseFloat(p.lng) }));
      }

      const payload: any = {
        nombre: form.nombre.trim(),
        tipo: form.tipo,
        coordenadas,
        radio: form.tipo === 'CIRCLE' ? parseFloat(form.radio) : undefined,
      };

      if (editId) await geofencesService.update(editId, payload);
      else await geofencesService.create(payload);

      setShowModal(false);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await geofencesService.delete(id);
      setConfirmDelete(null);
      load();
    } catch (e: any) {
      setConfirmDelete(null);
      alert(e?.response?.data?.message || 'No se pudo eliminar');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Geocercas</Text>
          <Text style={styles.sub}>{geofences.length} zonas configuradas</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Text style={styles.addBtnText}>+ Nueva geocerca</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {geofences.map((g) => (
              <View key={g.id_geofence} style={styles.card}>
                <Text style={styles.cardIcon}>{g.tipo === 'CIRCLE' ? '⭕' : '🔷'}</Text>
                <Text style={styles.cardName}>{g.nombre}</Text>
                <Text style={styles.cardType}>{g.tipo === 'CIRCLE' ? 'Círculo' : 'Polígono'}</Text>
                {g.radio && <Text style={styles.cardMeta}>Radio: {g.radio}m</Text>}
                {g.tipo === 'POLYGON' && Array.isArray(g.coordenadas) && (
                  <Text style={styles.cardMeta}>{g.coordenadas.length} puntos</Text>
                )}
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(g)}>
                    <Text style={styles.editBtnText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.delBtn} onPress={() => setConfirmDelete(g.id_geofence)}>
                    <Text style={styles.delBtnText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {geofences.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>📍</Text>
                <Text style={styles.emptyText}>No hay geocercas. Crea una para comenzar.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      <ConfirmModal
        visible={confirmDelete !== null}
        title="Eliminar geocerca"
        message="¿Estás seguro de que deseas eliminar esta geocerca? Las alertas asociadas se perderán."
        confirmText="Sí, eliminar"
        onConfirm={() => confirmDelete !== null && remove(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editId ? 'Editar' : 'Nueva'} Geocerca</Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {error}</Text>
                </View>
              ) : null}

              {/* Nombre */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Nombre *</Text>
                <TextInput
                  style={styles.input}
                  value={form.nombre}
                  onChangeText={(v) => setForm((p) => ({ ...p, nombre: v }))}
                  placeholder="Zona Planta Norte"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              {/* Tipo */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Tipo</Text>
                <View style={styles.typeRow}>
                  {(['CIRCLE', 'POLYGON'] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.typeBtn, form.tipo === t && styles.typeBtnActive]}
                      onPress={() => setForm((p) => ({ ...p, tipo: t }))}
                    >
                      <Text style={[styles.typeBtnText, form.tipo === t && { color: COLORS.primary }]}>
                        {t === 'CIRCLE' ? '⭕ Círculo' : '🔷 Polígono'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* CÍRCULO */}
              {form.tipo === 'CIRCLE' && (
                <>
                  <View style={styles.row2}>
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>Latitud *</Text>
                      <TextInput style={styles.input} value={form.lat} onChangeText={(v) => setForm((p) => ({ ...p, lat: v }))}
                        placeholder="19.2433" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
                    </View>
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>Longitud *</Text>
                      <TextInput style={styles.input} value={form.lng} onChangeText={(v) => setForm((p) => ({ ...p, lng: v }))}
                        placeholder="-103.7247" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
                    </View>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Radio (metros) *</Text>
                    <TextInput style={styles.input} value={form.radio} onChangeText={(v) => setForm((p) => ({ ...p, radio: v }))}
                      placeholder="150" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
                  </View>
                </>
              )}

              {/* POLÍGONO */}
              {form.tipo === 'POLYGON' && (
                <View style={styles.field}>
                  <View style={styles.polyHeader}>
                    <Text style={styles.fieldLabel}>Puntos del polígono * (mín. 3)</Text>
                    <TouchableOpacity
                      style={styles.addPointBtn}
                      onPress={() => setPolyPoints((p) => [...p, { lat: '', lng: '' }])}
                    >
                      <Text style={styles.addPointText}>+ Punto</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Encabezados columnas */}
                  <View style={styles.polyColHeader}>
                    <Text style={[styles.polyColText, { width: 28 }]}>#</Text>
                    <Text style={[styles.polyColText, { flex: 1 }]}>Latitud</Text>
                    <Text style={[styles.polyColText, { flex: 1 }]}>Longitud</Text>
                    <View style={{ width: 28 }} />
                  </View>

                  {polyPoints.map((pt, i) => (
                    <View key={i} style={styles.polyRow}>
                      <View style={styles.polyNum}>
                        <Text style={styles.polyNumText}>{i + 1}</Text>
                      </View>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={pt.lat}
                        onChangeText={(v) => setPolyPoints((prev) => prev.map((p, idx) => idx === i ? { ...p, lat: v } : p))}
                        placeholder="19.2433"
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="numeric"
                      />
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={pt.lng}
                        onChangeText={(v) => setPolyPoints((prev) => prev.map((p, idx) => idx === i ? { ...p, lng: v } : p))}
                        placeholder="-103.72"
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="numeric"
                      />
                      {polyPoints.length > 3 ? (
                        <TouchableOpacity
                          style={styles.removePointBtn}
                          onPress={() => setPolyPoints((prev) => prev.filter((_, idx) => idx !== i))}
                        >
                          <Text style={styles.removePointText}>✕</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={{ width: 28 }} />
                      )}
                    </View>
                  ))}

                  <View style={styles.tipBox}>
                    <Text style={styles.tipText}>
                      💡 Obtén coordenadas en Google Maps: clic derecho → "¿Qué hay aquí?"
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Guardar</Text>}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.bgCard },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  sub: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  scroll: { flex: 1, padding: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: 200, backgroundColor: COLORS.bgCard, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 6, alignItems: 'center' },
  cardIcon: { fontSize: 28 },
  cardName: { fontSize: 15, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  cardType: { fontSize: 12, color: COLORS.textMuted },
  cardMeta: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: 6, marginTop: 4, width: '100%' },
  editBtn: { flex: 1, backgroundColor: COLORS.primary + '20', borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
  editBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  delBtn: { flex: 1, backgroundColor: COLORS.danger + '20', borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
  delBtnText: { color: COLORS.danger, fontSize: 12, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
  // Modal
  overlay: { flex: 1, backgroundColor: '#02182b80', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: COLORS.bgCard, borderRadius: 16, padding: 24, width: 480, maxWidth: '100%', maxHeight: '90%' as any, borderWidth: 1, borderColor: COLORS.border },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 16 },
  errorBox: { backgroundColor: COLORS.danger + '15', borderWidth: 1, borderColor: COLORS.danger + '40', borderRadius: 10, padding: 12, marginBottom: 14 },
  errorText: { color: COLORS.danger, fontSize: 13 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, color: COLORS.textSub, marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: COLORS.bgInput, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, color: COLORS.text, fontSize: 14 },
  row2: { flexDirection: 'row', gap: 10 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgInput, alignItems: 'center' },
  typeBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  typeBtnText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  // Polygon
  polyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  addPointBtn: { backgroundColor: COLORS.primary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  addPointText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  polyColHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, paddingHorizontal: 2 },
  polyColText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '700', textAlign: 'center' },
  polyRow: { flexDirection: 'row', gap: 6, marginBottom: 6, alignItems: 'center' },
  polyNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  polyNumText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  removePointBtn: { width: 28, height: 28, backgroundColor: COLORS.danger + '20', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  removePointText: { color: COLORS.danger, fontSize: 13, fontWeight: '700' },
  tipBox: { backgroundColor: COLORS.bgInput, borderRadius: 8, padding: 10, marginTop: 4 },
  tipText: { fontSize: 11, color: COLORS.textMuted, lineHeight: 16 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelText: { color: COLORS.textSub, fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
});