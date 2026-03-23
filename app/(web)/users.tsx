import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Switch,
} from 'react-native';
import { usersService, User } from '../../src/services/users.service';
import { authService } from '../../src/services/auth.service';
import { useAuthStore } from '../../src/stores/auth.store';
import { VALIDATION_LIMITS, validators } from '../../src/utils/validators';
import ConfirmModal from '../../src/components/ConfirmModal';
import { COLORS } from '../../src/constants';
import { Ionicons } from '@expo/vector-icons';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  USER: 'Usuario',
};

const ROLES = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'USER', label: 'Usuario' },
];

const ROLE_COLORS: Record<string, string> = {
  ADMIN: COLORS.danger,
  SUPERVISOR: COLORS.primary,
  USER: COLORS.success,
};

const EMPTY_NEW = {
  nombre: '',
  correo: '',
  password: '',
  telefono: '',
  rol: 'USER',
  supervisorId: '',
};
const EMPTY_EDIT = {
  nombre: '',
  correo: '',
  telefono: '',
  rol: '',
  is_active: true,
};

type ToastState = {
  visible: boolean;
  message: string;
};

export default function UsersScreen() {
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.rol === 'ADMIN';
  const isSupervisor = currentUser?.rol === 'SUPERVISOR';

  const [users, setUsers] = useState<User[]>([]);
  const [supervisors, setSupervisors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterRol, setFilterRol] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [newForm, setNewForm] = useState(EMPTY_NEW);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
  });
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showErrorToast = (message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    setToast({ visible: true, message });
    toastTimeoutRef.current = setTimeout(() => {
      setToast({ visible: false, message: '' });
      toastTimeoutRef.current = null;
    }, 3500);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const load = () => {
    setLoading(true);
    usersService
      .getAll()
      .then((data) => {
        setUsers(data);
        if (isAdmin) setSupervisors(data.filter((u) => u.rol === 'SUPERVISOR'));
      })
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (currentUser) load();
  }, [currentUser]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchInput.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const openCreate = () => {
    setNewForm(EMPTY_NEW);
    setFieldErrors({});
    setShowCreate(true);
  };

  const openEdit = (u: User) => {
    setEditForm({
      nombre: u.nombre,
      correo: u.correo,
      telefono: u.telefono ?? '',
      rol: u.rol,
      is_active: Boolean(u.is_active),
    });
    setEditing(u);
    setFieldErrors({});
    setShowEdit(true);
  };

  const handleCreate = async () => {
    setFieldErrors({});
    const errs: Record<string, string> = {};

    const nameError = validators.nombre(newForm.nombre);
    if (nameError) errs.nombre = nameError;
    const correoError = validators.correo(newForm.correo);
    if (correoError) errs.correo = correoError;
    const passError = validators.password(newForm.password);
    if (passError) errs.password = passError;
    if (newForm.telefono) {
      const telError = validators.telefono(newForm.telefono);
      if (telError) errs.telefono = telError;
    }
    if (isAdmin && newForm.rol === 'USER' && !newForm.supervisorId) {
      errs.supervisorId = 'Debes asignar un supervisor al nuevo usuario';
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        nombre: newForm.nombre.trim(),
        correo: newForm.correo.trim().toLowerCase(),
        password: newForm.password,
        telefono: newForm.telefono.trim() || undefined,
      };
      if (isAdmin) {
        payload.rol = newForm.rol;
        if (newForm.rol === 'USER' && newForm.supervisorId) {
          payload.supervisorId = Number(newForm.supervisorId);
        }
      }
      await authService.createUser(payload);
      setShowCreate(false);
      load();
    } catch (e: any) {
      setFieldErrors({ general: e?.response?.data?.message || 'Error al crear usuario' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editing) return;
    setFieldErrors({});
    const errs: Record<string, string> = {};

    const nameError = validators.nombre(editForm.nombre);
    if (nameError) errs.nombre = nameError;
    const correoError = validators.correo(editForm.correo);
    if (correoError) errs.correo = correoError;
    if (editForm.telefono) {
      const telError = validators.telefono(editForm.telefono);
      if (telError) errs.telefono = telError;
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        nombre: editForm.nombre.trim(),
        correo: editForm.correo.trim().toLowerCase(),
        telefono: editForm.telefono.trim() || undefined,
        is_active: Boolean(editForm.is_active),
      };
      if (isAdmin) payload.rol = editForm.rol;
      await usersService.update(editing.id_user, payload);
      setShowEdit(false);
      load();
    } catch (e: any) {
      if (e?.response?.status === 403) {
        setFieldErrors({ general: 'Acceso denegado: no puedes modificar este usuario' });
      } else {
        setFieldErrors({ general: e?.response?.data?.message || 'Error al guardar' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await usersService.delete(id);
      setConfirmDelete(null);
      load();
    } catch (e: any) {
      setConfirmDelete(null);
      if (e?.response?.status === 403) {
        showErrorToast('Acceso denegado: no puedes eliminar este usuario');
      } else {
        showErrorToast(e?.response?.data?.message || 'No se pudo eliminar. Puede tener datos asociados.');
      }
    }
  };

  const filtered = users.filter((u) => {
    const matchSearch =
      u.nombre?.toLowerCase().includes(debouncedSearch) ||
      u.correo?.toLowerCase().includes(debouncedSearch);
    const matchRol = filterRol ? u.rol === filterRol : true;
    return matchSearch && matchRol;
  });

  const roleFilters = isAdmin
    ? [
        { value: '', label: 'Todos los roles' },
        { value: 'ADMIN', label: 'Administrador' },
        { value: 'SUPERVISOR', label: 'Supervisor' },
        { value: 'USER', label: 'Usuario' },
      ]
    : [
        { value: '', label: 'Todos los roles' },
        { value: 'USER', label: 'Usuario' },
      ];

  return (
    <View style={styles.container}>
      {toast.visible ? (
        <View style={[styles.toastWrap, { pointerEvents: 'none' }]}>
          <View style={styles.toastError}>
            <Text style={styles.toastErrorText}>{toast.message}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            {isAdmin ? 'Gestión de Usuarios' : 'Mis Usuarios'}
          </Text>
          <Text style={styles.sub}>
            {users.length} usuario{users.length !== 1 ? 's' : ''}
            {isSupervisor ? ' en tu equipo' : ' en el sistema'}
          </Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Text style={styles.addBtnText}><Ionicons name="add-outline" size={14} color="#fff" /> Nuevo usuario</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.toolbar}>
        <TextInput
          style={styles.search}
          placeholder="Buscar por nombre o correo..."
          placeholderTextColor={COLORS.textMuted}
          value={searchInput}
          onChangeText={setSearchInput}
          maxLength={VALIDATION_LIMITS.emailMax}
        />
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Filtrar por rol:</Text>
          <select
            value={filterRol}
            onChange={(e: any) => setFilterRol(e.target.value)}
            style={
              {
                backgroundColor: '#ffffff',
                border: `1.5px solid ${COLORS.border}`,
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 15,
                color: COLORS.text,
                outline: 'none',
                cursor: 'pointer',
                minWidth: 200,
              } as any
            }
          >
            {roleFilters.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.table} showsVerticalScrollIndicator={false}>
          <View style={[styles.row, styles.tableHeader]}>
            {['Nombre', 'Correo', 'Rol', 'Estado', 'Acciones'].map((h, i) => (
              <Text
                key={h}
                style={[styles.cell, styles.cellHeader, i < 2 && { flex: 2 }]}
              >
                {h}
              </Text>
            ))}
          </View>

          {filtered.map((u) => (
            <View key={u.id_user} style={styles.row}>
              <Text
                style={[
                  styles.cell,
                  { flex: 2, color: COLORS.text, fontWeight: '600' },
                ]}
                numberOfLines={1}
              >
                {u.nombre}
              </Text>
              <Text
                style={[styles.cell, { flex: 2, color: COLORS.textSub }]}
                numberOfLines={1}
              >
                {u.correo}
              </Text>
              <View style={styles.cell}>
                <View
                  style={[
                    styles.roleBadge,
                    {
                      backgroundColor:
                        (ROLE_COLORS[u.rol] ?? COLORS.textMuted) + '20',
                      borderColor:
                        (ROLE_COLORS[u.rol] ?? COLORS.textMuted) + '50',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.roleText,
                      { color: ROLE_COLORS[u.rol] ?? COLORS.textMuted },
                    ]}
                  >
                    {ROLE_LABELS[u.rol] ?? u.rol}
                  </Text>
                </View>
              </View>
              <View style={styles.cell}>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: u.is_active
                        ? COLORS.success + '20'
                        : COLORS.danger + '20',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: u.is_active ? COLORS.success : COLORS.danger },
                    ]}
                  >
                    {u.is_active ? 'Activo' : 'Inactivo'}
                  </Text>
                </View>
              </View>
              <View style={[styles.cell, { flexDirection: 'row', gap: 6 }]}>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    isSupervisor && u.rol !== 'USER' && { opacity: 0.5 },
                  ]}
                  onPress={() => openEdit(u)}
                  disabled={isSupervisor && u.rol !== 'USER'}
                >
                  <Ionicons
                    name="pencil-outline"
                    size={18}
                    color={COLORS.primary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    { backgroundColor: COLORS.danger + '20' },
                    isSupervisor && u.rol !== 'USER' && { opacity: 0.5 },
                  ]}
                  onPress={() => setConfirmDelete(u.id_user)}
                  disabled={isSupervisor && u.rol !== 'USER'}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {filtered.length === 0 && (
            <Text style={styles.empty}>
              {users.length === 0
                ? isSupervisor
                  ? 'No tienes usuarios en tu equipo aún'
                  : 'No hay usuarios registrados'
                : 'Sin resultados'}
            </Text>
          )}
        </ScrollView>
      )}

      {/* CREATE Modal */}
      <Modal visible={showCreate} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Crear Nuevo Usuario</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {isSupervisor && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    ℹ️ El nuevo usuario quedará automáticamente asignado a tu equipo como Usuario.
                  </Text>
                </View>
              )}

              {fieldErrors.general && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {fieldErrors.general}</Text>
                </View>
              )}

              {[
                { label: 'Nombre completo *', key: 'nombre', placeholder: 'Juan Pérez' },
                { label: 'Correo electrónico *', key: 'correo', placeholder: 'juan@ejemplo.com' },
                { label: 'Contraseña *', key: 'password', placeholder: 'Mínimo 8 caracteres', secure: true },
                { label: 'Teléfono', key: 'telefono', placeholder: '5551234567' },
              ].map(({ label, key, placeholder, secure }: any) => (
                <View key={key} style={styles.field}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput
                    style={[styles.input, fieldErrors[key] && styles.inputError]}
                    value={(newForm as any)[key]}
                    onChangeText={(v) => {
                      setNewForm((p) => ({ ...p, [key]: v }));
                      if (fieldErrors[key]) setFieldErrors(p => ({...p, [key]: undefined}));
                    }}
                    placeholder={placeholder}
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry={secure}
                    autoCapitalize="none"
                  />
                  {fieldErrors[key] && <Text style={styles.fieldError}>⚠️ {fieldErrors[key]}</Text>}
                </View>
              ))}

              {isAdmin && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Rol *</Text>
                  <View style={styles.roleRow}>
                    {ROLES.map(({ value: r, label: rLabel }) => (
                      <TouchableOpacity
                        key={r}
                        style={[ styles.roleOption, newForm.rol === r && styles.roleOptionActive ]}
                        onPress={() => setNewForm((p) => ({ ...p, rol: r, supervisorId: '' }))}
                      >
                        <Text style={[ styles.roleOptionText, newForm.rol === r && { color: ROLE_COLORS[r] ?? COLORS.primary } ]}>
                          {rLabel}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {isAdmin && newForm.rol === 'USER' && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Asignar a Supervisor *</Text>
                  {supervisors.length === 0 ? (
                    <View style={styles.warnBox}>
                      <Text style={styles.warnText}>
                        ⚠️ No hay supervisores disponibles. Crea un supervisor primero.
                      </Text>
                    </View>
                  ) : (
                    <ScrollView style={styles.supervisorList} showsVerticalScrollIndicator={false}>
                      {supervisors.map((s) => (
                        <TouchableOpacity
                          key={s.id_user}
                          style={[ styles.supervisorOption, newForm.supervisorId === String(s.id_user) && styles.supervisorOptionActive ]}
                          onPress={() => setNewForm((p) => ({ ...p, supervisorId: String(s.id_user) }))}
                        >
                          <View style={styles.supAvatar}>
                            <Text style={styles.supAvatarText}>{s.nombre.charAt(0)}</Text>
                          </View>
                          <Text style={[ styles.supervisorOptionText, newForm.supervisorId === String(s.id_user) && { color: COLORS.primary } ]}>
                            {s.nombre}
                          </Text>
                          {newForm.supervisorId === String(s.id_user) && (
                            <Text style={{ color: COLORS.primary, fontWeight: '800' }}>✓</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                  {fieldErrors.supervisorId && <Text style={styles.fieldError}>⚠️ {fieldErrors.supervisorId}</Text>}
                </View>
              )}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreate(false)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreate} disabled={saving}>
                {saving ? ( <ActivityIndicator color="#fff" /> ) : ( <Text style={styles.saveText}>Crear usuario</Text> )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={confirmDelete !== null}
        title="Eliminar usuario"
        message="¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer."
        confirmText="Sí, eliminar"
        onConfirm={() => confirmDelete !== null && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* EDIT Modal */}
      <Modal visible={showEdit} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Editar Usuario</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {fieldErrors.general && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {fieldErrors.general}</Text>
                </View>
              )}

              {[
                { label: 'Nombre', key: 'nombre' },
                { label: 'Correo', key: 'correo' },
                { label: 'Teléfono', key: 'telefono' },
              ].map(({ label, key }) => (
                <View key={key} style={styles.field}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput
                    style={[styles.input, fieldErrors[key] && styles.inputError]}
                    value={(editForm as any)[key]}
                    onChangeText={(v) => {
                      setEditForm((p) => ({ ...p, [key]: v }));
                      if (fieldErrors[key]) setFieldErrors(p => ({...p, [key]: undefined}));
                    }}
                    placeholderTextColor={COLORS.textMuted}
                    autoCapitalize="none"
                  />
                  {fieldErrors[key] && <Text style={styles.fieldError}>⚠️ {fieldErrors[key]}</Text>}
                </View>
              ))}

              {isAdmin && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Rol</Text>
                  <View style={styles.roleRow}>
                    {ROLES.map(({ value: r, label: rLabel }) => (
                      <TouchableOpacity
                        key={r}
                        style={[ styles.roleOption, editForm.rol === r && styles.roleOptionActive ]}
                        onPress={() => setEditForm((p) => ({ ...p, rol: r }))}
                      >
                        <Text style={[ styles.roleOptionText, editForm.rol === r && { color: ROLE_COLORS[r] ?? COLORS.primary } ]}>
                          {rLabel}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.switchRow}>
                <Text style={styles.fieldLabel}>Usuario activo</Text>
                <Switch
                  value={editForm.is_active}
                  onValueChange={(v) => setEditForm((p) => ({ ...p, is_active: v }))}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                />
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEdit(false)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleEdit} disabled={saving}>
                {saving ? ( <ActivityIndicator color="#fff" /> ) : ( <Text style={styles.saveText}>Guardar</Text> )}
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
      toastWrap: {
      position: 'absolute',
      top: 16,
      right: 16,
      zIndex: 999,
      },
      toastError: {
      maxWidth: 420,
      backgroundColor: COLORS.danger + '20',
      borderWidth: 1,
      borderColor: COLORS.danger,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      },
      toastErrorText: {
      color: COLORS.danger,
      fontSize: 13,
      fontWeight: '600',
      },
      header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      },
      title: { fontSize: 20, fontWeight: '800', color: COLORS.text },
      sub: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
      addBtn: {
      backgroundColor: COLORS.primary,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
      },
      addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
      toolbar: { padding: 16, gap: 12 },
      search: {
      backgroundColor: COLORS.bgInput,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: COLORS.text,
      fontSize: 16,
      },
      filterRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
      filterLabel: { fontSize: 15, color: COLORS.textSub, fontWeight: '600' },
      table: { flex: 1, paddingHorizontal: 16 },
      tableHeader: { backgroundColor: COLORS.bgCard, borderRadius: 8 },
      row: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      paddingVertical: 12,
      },
      cell: { flex: 1, paddingHorizontal: 8 },
      cellHeader: {
      fontSize: 12,
      color: COLORS.textMuted,
      fontWeight: '700',
      textTransform: 'uppercase',
      paddingVertical: 10,
      },
      roleBadge: {
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      alignSelf: 'flex-start',
      },
      roleText: { fontSize: 11, fontWeight: '700' },
      statusBadge: {
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      alignSelf: 'flex-start',
      },
      statusText: { fontSize: 11, fontWeight: '600' },
      actionBtn: { backgroundColor: COLORS.bgInput, borderRadius: 8, padding: 9 },
      actionBtnText: { fontSize: 14 },
      empty: {
      color: COLORS.textMuted,
      textAlign: 'center',
      paddingVertical: 40,
      fontSize: 14,
      },
      overlay: {
      flex: 1,
      backgroundColor: '#00000080',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      },
      modal: {
      backgroundColor: COLORS.bgCard,
      borderRadius: 16,
      padding: 28,
      width: 460,
      maxWidth: '95%',
      maxHeight: '90%',
      borderWidth: 1,
      borderColor: COLORS.border,
      display: 'flex',
      flexDirection: 'column',
      },
      modalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: COLORS.text,
      marginBottom: 16,
      flexShrink: 0,
      },
      infoBox: {
      backgroundColor: COLORS.primary + '15',
      borderWidth: 1,
      borderColor: COLORS.primary + '30',
      borderRadius: 10,
      padding: 12,
      marginBottom: 14,
      },
      infoText: { color: COLORS.primary, fontSize: 12, lineHeight: 18 },
      errorBox: {
      backgroundColor: '#7f1d1d33',
      borderWidth: 1,
      borderColor: COLORS.danger,
      borderRadius: 10,
      padding: 12,
      marginBottom: 14,
      },
      errorText: { color: COLORS.danger, fontSize: 13 },
      fieldError: { color: COLORS.danger, fontSize: 12, marginTop: 4, marginBottom: 2 },
      inputError: { borderColor: COLORS.danger },
      warnBox: {
      backgroundColor: COLORS.warning + '15',
      borderWidth: 1,
      borderColor: COLORS.warning + '40',
      borderRadius: 10,
      padding: 12,
      },
      warnText: { color: COLORS.warning, fontSize: 12 },
      field: { marginBottom: 14 },
      fieldLabel: {
      fontSize: 13,
      color: COLORS.textSub,
      marginBottom: 6,
      fontWeight: '500',
      },
      input: {
      backgroundColor: COLORS.bgInput,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      color: COLORS.text,
      fontSize: 14,
      },
      roleRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
      roleOption: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.bgInput,
      },
      roleOptionActive: {
      borderColor: COLORS.primary,
      backgroundColor: COLORS.primary + '15',
      },
      roleOptionText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
      supervisorList: {
      maxHeight: 180,
      backgroundColor: COLORS.bgInput,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: COLORS.border,
      },
      supervisorOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      },
      supervisorOptionActive: { backgroundColor: COLORS.primary + '15' },
      supervisorOptionText: { flex: 1, fontSize: 13, color: COLORS.textSub },
      supAvatar: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: COLORS.primary + '30',
      alignItems: 'center',
      justifyContent: 'center',
      },
      supAvatarText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
      switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginVertical: 10,
      flexShrink: 0,
      },
      modalActions: { 
      flexDirection: 'row', 
      gap: 10,
      marginTop: 20,
      flexShrink: 0,
      },
      cancelBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: COLORS.border,
      alignItems: 'center',
      },
      cancelText: { color: COLORS.textMuted, fontWeight: '600' },
      saveBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      },
      saveText: { color: '#fff', fontWeight: '700' },
      });
