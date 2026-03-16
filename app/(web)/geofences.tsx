import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Modal } from 'react-native';
import { geofencesService, Geofence } from '../../src/services/geofences.service';
import { COLORS } from '../../src/constants';

const EMPTY_FORM = { nombre: '', tipo: 'CIRCLE' as 'CIRCLE' | 'POLYGON', lat: '', lng: '', radio: '150' };

export default function GeofencesScreen() {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    geofencesService.getAll().then(setGeofences).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY_FORM); setEditId(null); setShowModal(true); };
  const openEdit = (g: Geofence) => {
    const coords = g.tipo === 'CIRCLE' ? g.coordenadas : g.coordenadas?.[0] ?? {};
    setForm({ nombre: g.nombre, tipo: g.tipo, lat: String(coords?.lat ?? ''), lng: String(coords?.lng ?? ''), radio: String(g.radio ?? 150) });
    setEditId(g.id_geofence);
    setShowModal(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload: any = {
        nombre: form.nombre,
        tipo: form.tipo,
        coordenadas: form.tipo === 'CIRCLE' ? { lat: parseFloat(form.lat), lng: parseFloat(form.lng) } : [{ lat: parseFloat(form.lat), lng: parseFloat(form.lng) }],
        radio: form.tipo === 'CIRCLE' ? parseFloat(form.radio) : undefined,
      };
      if (editId) await geofencesService.update(editId, payload);
      else await geofencesService.create(payload);
      setShowModal(false);
      load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('¿Eliminar geocerca?')) return;
    await geofencesService.delete(id);
    load();
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
                <View style={styles.cardIcon}>
                  <Text style={{ fontSize: 24 }}>{g.tipo === 'CIRCLE' ? '⭕' : '🔷'}</Text>
                </View>
                <Text style={styles.cardName}>{g.nombre}</Text>
                <Text style={styles.cardType}>{g.tipo}</Text>
                {g.radio && <Text style={styles.cardMeta}>Radio: {g.radio}m</Text>}
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(g)}>
                    <Text style={styles.editBtnText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.delBtn} onPress={() => remove(g.id_geofence)}>
                    <Text style={styles.delBtnText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {geofences.length === 0 && (
              <Text style={styles.empty}>No hay geocercas. Crea una para comenzar.</Text>
            )}
          </View>
        </ScrollView>
      )}

      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editId ? 'Editar' : 'Nueva'} Geocerca</Text>

            <Text style={styles.fieldLabel}>Nombre</Text>
            <TextInput style={styles.input} value={form.nombre} onChangeText={(v) => setForm((p) => ({ ...p, nombre: v }))} placeholder="Zona Planta" placeholderTextColor={COLORS.textMuted} />

            <Text style={styles.fieldLabel}>Tipo</Text>
            <View style={styles.typeRow}>
              {(['CIRCLE', 'POLYGON'] as const).map((t) => (
                <TouchableOpacity key={t} style={[styles.typeBtn, form.tipo === t && styles.typeBtnActive]} onPress={() => setForm((p) => ({ ...p, tipo: t }))}>
                  <Text style={[styles.typeBtnText, form.tipo === t && { color: COLORS.primary }]}>{t === 'CIRCLE' ? '⭕ Círculo' : '🔷 Polígono'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Latitud</Text>
            <TextInput style={styles.input} value={form.lat} onChangeText={(v) => setForm((p) => ({ ...p, lat: v }))} placeholder="19.4326" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />

            <Text style={styles.fieldLabel}>Longitud</Text>
            <TextInput style={styles.input} value={form.lng} onChangeText={(v) => setForm((p) => ({ ...p, lng: v }))} placeholder="-99.1332" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />

            {form.tipo === 'CIRCLE' && (
              <>
                <Text style={styles.fieldLabel}>Radio (metros)</Text>
                <TextInput style={styles.input} value={form.radio} onChangeText={(v) => setForm((p) => ({ ...p, radio: v }))} placeholder="150" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Guardar</Text>}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  sub: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  scroll: { flex: 1, padding: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: 200, backgroundColor: COLORS.bgCard, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 6 },
  cardIcon: { alignItems: 'center', marginBottom: 4 },
  cardName: { fontSize: 15, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  cardType: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },
  cardMeta: { fontSize: 12, color: COLORS.accent, textAlign: 'center' },
  cardActions: { flexDirection: 'row', gap: 6, marginTop: 8 },
  editBtn: { flex: 1, backgroundColor: COLORS.primary + '20', borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
  editBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  delBtn: { flex: 1, backgroundColor: COLORS.danger + '20', borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
  delBtnText: { color: COLORS.danger, fontSize: 12, fontWeight: '600' },
  empty: { color: COLORS.textMuted, padding: 40, textAlign: 'center', fontSize: 14 },
  overlay: { flex: 1, backgroundColor: '#00000080', alignItems: 'center', justifyContent: 'center' },
  modal: { backgroundColor: COLORS.bgCard, borderRadius: 16, padding: 28, width: 400, borderWidth: 1, borderColor: COLORS.border },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 20 },
  fieldLabel: { fontSize: 13, color: COLORS.textSub, marginBottom: 5, fontWeight: '500' },
  input: { backgroundColor: COLORS.bgInput, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, color: COLORS.text, fontSize: 14, marginBottom: 12 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgInput, alignItems: 'center' },
  typeBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  typeBtnText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelText: { color: COLORS.textMuted, fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
});
