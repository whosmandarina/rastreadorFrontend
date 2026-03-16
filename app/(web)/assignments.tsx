import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal,
} from 'react-native';
import api from '../../src/services/api';
import { usersService, User } from '../../src/services/users.service';
import { COLORS } from '../../src/constants';

interface Client { id_client: number; nombre_empresa: string; contacto?: string; }

export default function AssignmentsScreen() {
  const [tab, setTab] = useState<'supervisor' | 'client'>('supervisor');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Asignaciones</Text>
        <Text style={styles.sub}>Gestiona qué supervisores monitorean a qué usuarios</Text>
      </View>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'supervisor' && styles.tabActive]} onPress={() => setTab('supervisor')}>
          <Text style={[styles.tabText, tab === 'supervisor' && styles.tabTextActive]}>👮 Supervisor → Usuario</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'client' && styles.tabActive]} onPress={() => setTab('client')}>
          <Text style={[styles.tabText, tab === 'client' && styles.tabTextActive]}>🏢 Usuario → Cliente</Text>
        </TouchableOpacity>
      </View>
      {tab === 'supervisor' ? <SupervisorTab /> : <ClientTab />}
    </View>
  );
}

function SupervisorTab() {
  const [supervisors, setSupervisors] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<User | null>(null);
  const [assignedUsers, setAssignedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    usersService.getAll().then((all) => {
      setSupervisors(all.filter((u) => u.rol === 'SUPERVISOR'));
      setUsers(all.filter((u) => u.rol === 'USER'));
    }).finally(() => setLoading(false));
  }, []);

  const loadAssigned = async (sup: User) => {
    setSelected(sup);
    setLoadingAssigned(true);
    try {
      const { data } = await api.get(`/supervisor-users/supervisor/${sup.id_user}/users`);
      setAssignedUsers(data);
    } catch { setAssignedUsers([]); }
    finally { setLoadingAssigned(false); }
  };

  const assign = async (id_user: number) => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.post('/supervisor-users', { id_supervisor: selected.id_user, id_user });
      await loadAssigned(selected);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Error al asignar');
    } finally { setSaving(false); }
  };

  const unassign = async (id_user: number) => {
    if (!selected) return;
    try {
      await api.delete(`/supervisor-users/${selected.id_user}/${id_user}`);
      await loadAssigned(selected);
    } catch (e: any) { alert(e?.response?.data?.message || 'Error al remover'); }
  };

  const assignedIds = new Set(assignedUsers.map((u) => u.id_user));
  const unassignedUsers = users.filter((u) => !assignedIds.has(u.id_user));

  if (loading) return <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />;

  return (
    <View style={styles.splitPane}>
      <View style={styles.leftPane}>
        <Text style={styles.paneTitle}>Supervisores</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {supervisors.map((s) => (
            <TouchableOpacity key={s.id_user} style={[styles.listItem, selected?.id_user === s.id_user && styles.listItemActive]} onPress={() => loadAssigned(s)}>
              <View style={styles.itemAvatar}><Text style={styles.itemAvatarText}>{s.nombre.charAt(0)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={1}>{s.nombre}</Text>
                <Text style={styles.itemMeta}>{s.correo}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {supervisors.length === 0 && <Text style={styles.empty}>Sin supervisores</Text>}
        </ScrollView>
      </View>
      <View style={styles.rightPane}>
        {!selected ? (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderIcon}>👈</Text>
            <Text style={styles.placeholderText}>Selecciona un supervisor para ver sus usuarios asignados</Text>
          </View>
        ) : (
          <>
            <View style={styles.rightHeader}>
              <Text style={styles.paneTitle}>Usuarios de: {selected.nombre}</Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)} disabled={unassignedUsers.length === 0}>
                <Text style={styles.addBtnText}>+ Asignar usuario</Text>
              </TouchableOpacity>
            </View>
            {loadingAssigned ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} /> : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {assignedUsers.map((u) => (
                  <View key={u.id_user} style={styles.assignedCard}>
                    <View style={styles.assignedLeft}>
                      <View style={[styles.itemAvatar, { backgroundColor: COLORS.success + '30' }]}><Text style={[styles.itemAvatarText, { color: COLORS.success }]}>{u.nombre.charAt(0)}</Text></View>
                      <View><Text style={styles.itemName}>{u.nombre}</Text><Text style={styles.itemMeta}>{u.correo}</Text></View>
                    </View>
                    <TouchableOpacity style={styles.removeBtn} onPress={() => unassign(u.id_user)}><Text style={styles.removeBtnText}>Remover</Text></TouchableOpacity>
                  </View>
                ))}
                {assignedUsers.length === 0 && <Text style={styles.empty}>Sin usuarios asignados</Text>}
              </ScrollView>
            )}
          </>
        )}
      </View>
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Asignar usuario a {selected?.nombre}</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {unassignedUsers.map((u) => (
                <TouchableOpacity key={u.id_user} style={styles.modalItem} onPress={async () => { await assign(u.id_user); setShowModal(false); }} disabled={saving}>
                  <View style={styles.itemAvatar}><Text style={styles.itemAvatarText}>{u.nombre.charAt(0)}</Text></View>
                  <View><Text style={styles.itemName}>{u.nombre}</Text><Text style={styles.itemMeta}>{u.correo}</Text></View>
                </TouchableOpacity>
              ))}
              {unassignedUsers.length === 0 && <Text style={styles.empty}>Todos ya asignados</Text>}
            </ScrollView>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ClientTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<User | null>(null);
  const [assignedClients, setAssignedClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([usersService.getAll(), api.get('/clients').then((r) => r.data)])
      .then(([allUsers, allClients]) => {
        setUsers(allUsers.filter((u: User) => u.rol === 'USER'));
        setClients(allClients);
      }).finally(() => setLoading(false));
  }, []);

  const loadAssigned = async (user: User) => {
    setSelected(user); setLoadingAssigned(true);
    try {
      const { data } = await api.get(`/user-clients/user/${user.id_user}/clients`);
      setAssignedClients(data);
    } catch { setAssignedClients([]); }
    finally { setLoadingAssigned(false); }
  };

  const assign = async (id_client: number) => {
    if (!selected) return; setSaving(true);
    try {
      await api.post('/user-clients', { id_user: selected.id_user, id_client });
      await loadAssigned(selected);
    } catch (e: any) { alert(e?.response?.data?.message || 'Error al asignar'); }
    finally { setSaving(false); setShowModal(false); }
  };

  const unassign = async (id_client: number) => {
    if (!selected) return;
    try {
      await api.delete(`/user-clients/${selected.id_user}/${id_client}`);
      await loadAssigned(selected);
    } catch (e: any) { alert(e?.response?.data?.message || 'Error al remover'); }
  };

  const assignedIds = new Set(assignedClients.map((c) => c.id_client));
  const unassignedClients = clients.filter((c) => !assignedIds.has(c.id_client));

  if (loading) return <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />;

  return (
    <View style={styles.splitPane}>
      <View style={styles.leftPane}>
        <Text style={styles.paneTitle}>Usuarios rastreados</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {users.map((u) => (
            <TouchableOpacity key={u.id_user} style={[styles.listItem, selected?.id_user === u.id_user && styles.listItemActive]} onPress={() => loadAssigned(u)}>
              <View style={[styles.itemAvatar, { backgroundColor: COLORS.success + '25' }]}><Text style={[styles.itemAvatarText, { color: COLORS.success }]}>{u.nombre.charAt(0)}</Text></View>
              <View style={{ flex: 1 }}><Text style={styles.itemName} numberOfLines={1}>{u.nombre}</Text><Text style={styles.itemMeta}>{u.correo}</Text></View>
            </TouchableOpacity>
          ))}
          {users.length === 0 && <Text style={styles.empty}>Sin usuarios USER</Text>}
        </ScrollView>
      </View>
      <View style={styles.rightPane}>
        {!selected ? (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderIcon}>👈</Text>
            <Text style={styles.placeholderText}>Selecciona un usuario para ver sus clientes asignados</Text>
          </View>
        ) : (
          <>
            <View style={styles.rightHeader}>
              <Text style={styles.paneTitle}>Clientes de: {selected.nombre}</Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)} disabled={unassignedClients.length === 0}>
                <Text style={styles.addBtnText}>+ Asignar cliente</Text>
              </TouchableOpacity>
            </View>
            {loadingAssigned ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} /> : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {assignedClients.map((c) => (
                  <View key={c.id_client} style={styles.assignedCard}>
                    <View style={styles.assignedLeft}>
                      <View style={[styles.itemAvatar, { backgroundColor: COLORS.accent + '25' }]}><Text style={[styles.itemAvatarText, { color: COLORS.accent }]}>{c.nombre_empresa.charAt(0)}</Text></View>
                      <View><Text style={styles.itemName}>{c.nombre_empresa}</Text>{c.contacto && <Text style={styles.itemMeta}>{c.contacto}</Text>}</View>
                    </View>
                    <TouchableOpacity style={styles.removeBtn} onPress={() => unassign(c.id_client)}><Text style={styles.removeBtnText}>Remover</Text></TouchableOpacity>
                  </View>
                ))}
                {assignedClients.length === 0 && <Text style={styles.empty}>Sin clientes asignados</Text>}
              </ScrollView>
            )}
          </>
        )}
      </View>
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Asignar cliente a {selected?.nombre}</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {unassignedClients.map((c) => (
                <TouchableOpacity key={c.id_client} style={styles.modalItem} onPress={() => assign(c.id_client)} disabled={saving}>
                  <View style={[styles.itemAvatar, { backgroundColor: COLORS.accent + '25' }]}><Text style={[styles.itemAvatarText, { color: COLORS.accent }]}>{c.nombre_empresa.charAt(0)}</Text></View>
                  <View><Text style={styles.itemName}>{c.nombre_empresa}</Text>{c.contacto && <Text style={styles.itemMeta}>{c.contacto}</Text>}</View>
                </TouchableOpacity>
              ))}
              {unassignedClients.length === 0 && <Text style={styles.empty}>Todos ya asignados</Text>}
            </ScrollView>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  sub: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
  tabTextActive: { color: COLORS.primary },
  splitPane: { flex: 1, flexDirection: 'row' },
  leftPane: { width: 260, borderRightWidth: 1, borderRightColor: COLORS.border, padding: 12 },
  rightPane: { flex: 1, padding: 16 },
  paneTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  rightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, marginBottom: 4 },
  listItemActive: { backgroundColor: COLORS.primary + '15' },
  itemAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary + '25', alignItems: 'center', justifyContent: 'center' },
  itemAvatarText: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  itemName: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  itemMeta: { fontSize: 11, color: COLORS.textMuted },
  assignedCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.bgCard, borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: COLORS.border },
  assignedLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  removeBtn: { backgroundColor: COLORS.danger + '20', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  removeBtnText: { color: COLORS.danger, fontSize: 12, fontWeight: '600' },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  placeholderIcon: { fontSize: 36 },
  placeholderText: { color: COLORS.textMuted, textAlign: 'center', maxWidth: 240, lineHeight: 22, fontSize: 14 },
  empty: { color: COLORS.textMuted, textAlign: 'center', paddingVertical: 24, fontSize: 13 },
  overlay: { flex: 1, backgroundColor: '#00000080', alignItems: 'center', justifyContent: 'center' },
  modal: { backgroundColor: COLORS.bgCard, borderRadius: 16, padding: 24, width: 380, borderWidth: 1, borderColor: COLORS.border },
  modalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 16 },
  modalItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 6 },
  cancelBtn: { marginTop: 12, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelText: { color: COLORS.textMuted, fontWeight: '600' },
});