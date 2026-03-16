import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Modal } from 'react-native';
import api from '../../src/services/api';
import { COLORS } from '../../src/constants';

interface Client { id_client: number; nombre_empresa: string; contacto?: string; }
const EMPTY = { nombre_empresa: '', contacto: '' };

export default function ClientsScreen() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/clients').then(({ data }) => setClients(data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY); setEditId(null); setShowModal(true); };
  const openEdit = (c: Client) => { setForm({ nombre_empresa: c.nombre_empresa, contacto: c.contacto ?? '' }); setEditId(c.id_client); setShowModal(true); };
  const save = async () => {
    setSaving(true);
    try {
      if (editId) await api.put(`/clients/${editId}`, form);
      else await api.post('/clients', form);
      setShowModal(false); load();
    } catch (e: any) { alert(e?.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };
  const remove = async (id: number) => {
    if (!confirm('¿Eliminar cliente?')) return;
    await api.delete(`/clients/${id}`); load();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Clientes</Text>
          <Text style={styles.sub}>{clients.length} empresas registradas</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Text style={styles.addBtnText}>+ Nuevo cliente</Text>
        </TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} /> : (
        <ScrollView style={styles.scroll}>
          <View style={styles.grid}>
            {clients.map((c) => (
              <View key={c.id_client} style={styles.card}>
                <View style={styles.cardAvatar}><Text style={styles.cardAvatarText}>{c.nombre_empresa.charAt(0)}</Text></View>
                <Text style={styles.cardName}>{c.nombre_empresa}</Text>
                {c.contacto && <Text style={styles.cardContact}>👤 {c.contacto}</Text>}
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(c)}><Text style={styles.editBtnText}>Editar</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.delBtn} onPress={() => remove(c.id_client)}><Text style={styles.delBtnText}>Eliminar</Text></TouchableOpacity>
                </View>
              </View>
            ))}
            {clients.length === 0 && <Text style={styles.empty}>Sin clientes registrados</Text>}
          </View>
        </ScrollView>
      )}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editId ? 'Editar' : 'Nuevo'} Cliente</Text>
            <Text style={styles.fieldLabel}>Empresa *</Text>
            <TextInput style={styles.input} value={form.nombre_empresa} onChangeText={(v) => setForm((p) => ({ ...p, nombre_empresa: v }))} placeholder="Corp Demo" placeholderTextColor={COLORS.textMuted} />
            <Text style={styles.fieldLabel}>Contacto</Text>
            <TextInput style={styles.input} value={form.contacto} onChangeText={(v) => setForm((p) => ({ ...p, contacto: v }))} placeholder="Nombre del contacto" placeholderTextColor={COLORS.textMuted} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
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
  cardAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.accent + '30', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  cardAvatarText: { fontSize: 20, color: COLORS.accent, fontWeight: '800' },
  cardName: { fontSize: 15, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  cardContact: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },
  cardActions: { flexDirection: 'row', gap: 6, marginTop: 8 },
  editBtn: { flex: 1, backgroundColor: COLORS.primary + '20', borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
  editBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  delBtn: { flex: 1, backgroundColor: COLORS.danger + '20', borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
  delBtnText: { color: COLORS.danger, fontSize: 12, fontWeight: '600' },
  empty: { color: COLORS.textMuted, padding: 40, textAlign: 'center', fontSize: 14 },
  overlay: { flex: 1, backgroundColor: '#00000080', alignItems: 'center', justifyContent: 'center' },
  modal: { backgroundColor: COLORS.bgCard, borderRadius: 16, padding: 28, width: 380, borderWidth: 1, borderColor: COLORS.border },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 20 },
  fieldLabel: { fontSize: 13, color: COLORS.textSub, marginBottom: 5, fontWeight: '500' },
  input: { backgroundColor: COLORS.bgInput, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, color: COLORS.text, fontSize: 14, marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelText: { color: COLORS.textMuted, fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
});
