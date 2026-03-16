import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { useAuthStore } from '../../src/stores/auth.store';
import { usersService } from '../../src/services/users.service';
import { COLORS } from '../../src/constants';

const ROLE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  ADMIN:      { label: 'Administrador',     color: COLORS.danger,  icon: '🛡' },
  SUPERVISOR: { label: 'Supervisor',        color: COLORS.primary, icon: '👮' },
  CLIENT:     { label: 'Cliente',           color: COLORS.accent,  icon: '🏢' },
  USER:       { label: 'Usuario rastreado', color: COLORS.success, icon: '📍' },
};

export default function ProfileWebScreen() {
  const { user, logout } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ nombre: user?.nombre ?? '' });

  const roleCfg = ROLE_LABELS[user?.rol ?? ''] ?? { label: user?.rol, color: COLORS.textMuted, icon: '👤' };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true); setError(''); setSuccess(false);
    try {
      await usersService.update(user.id, { nombre: form.nombre.trim() });
      setSuccess(true); setEditing(false);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Error al guardar');
    } finally { setSaving(false); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Mi Perfil</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.avatarCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.nombre?.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{user?.nombre}</Text>
          <Text style={styles.userEmail}>{user?.correo}</Text>
          <View style={[styles.roleBadge, { backgroundColor: roleCfg.color + '20', borderColor: roleCfg.color + '40' }]}>
            <Text style={{ marginRight: 4 }}>{roleCfg.icon}</Text>
            <Text style={[styles.roleText, { color: roleCfg.color }]}>{roleCfg.label}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Text style={styles.infoTitle}>Información de cuenta</Text>
            {!editing && (
              <TouchableOpacity style={styles.editBtn} onPress={() => { setEditing(true); setSuccess(false); }}>
                <Text style={styles.editBtnText}>✏️ Editar</Text>
              </TouchableOpacity>
            )}
          </View>

          {success && <View style={styles.successBox}><Text style={styles.successText}>✅ Cambios guardados correctamente</Text></View>}
          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>⚠️ {error}</Text></View> : null}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Nombre completo</Text>
            {editing
              ? <TextInput style={styles.input} value={form.nombre} onChangeText={(v) => setForm({ nombre: v })} autoCapitalize="words" placeholderTextColor={COLORS.textMuted} />
              : <Text style={styles.fieldValue}>{user?.nombre}</Text>
            }
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Correo electrónico</Text>
            <Text style={styles.fieldValue}>{user?.correo}</Text>
            <Text style={styles.fieldNote}>El correo no se puede modificar</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Rol en el sistema</Text>
            <Text style={styles.fieldValue}>{roleCfg.label}</Text>
            <Text style={styles.fieldNote}>El rol es asignado por el administrador</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>ID interno</Text>
            <Text style={styles.fieldValue}>#{user?.id}</Text>
          </View>

          {editing && (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditing(false); setForm({ nombre: user?.nombre ?? '' }); }}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Guardar cambios</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { flexGrow: 1 },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  body: { flexDirection: 'row', padding: 24, gap: 20, flexWrap: 'wrap' },
  avatarCard: { width: 240, backgroundColor: COLORS.bgCard, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', gap: 10, alignSelf: 'flex-start' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  avatarText: { fontSize: 36, color: '#fff', fontWeight: '800' },
  userName: { fontSize: 17, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  userEmail: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  roleBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1 },
  roleText: { fontSize: 13, fontWeight: '700' },
  logoutBtn: { marginTop: 8, width: '100%', backgroundColor: COLORS.danger + '15', borderWidth: 1, borderColor: COLORS.danger + '40', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  logoutText: { color: COLORS.danger, fontWeight: '700', fontSize: 14 },
  infoCard: { flex: 1, minWidth: 300, backgroundColor: COLORS.bgCard, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: COLORS.border, alignSelf: 'flex-start' },
  infoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  infoTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  editBtn: { backgroundColor: COLORS.bgInput, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.border },
  editBtnText: { color: COLORS.textSub, fontSize: 13, fontWeight: '600' },
  successBox: { backgroundColor: COLORS.success + '15', borderWidth: 1, borderColor: COLORS.success + '40', borderRadius: 10, padding: 12, marginBottom: 16 },
  successText: { color: COLORS.success, fontSize: 13 },
  errorBox: { backgroundColor: COLORS.danger + '15', borderWidth: 1, borderColor: COLORS.danger + '40', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { color: COLORS.danger, fontSize: 13 },
  field: { marginBottom: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  fieldValue: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  fieldNote: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  input: { backgroundColor: COLORS.bgInput, borderWidth: 1, borderColor: COLORS.primary + '60', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.text, fontSize: 15 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelText: { color: COLORS.textMuted, fontWeight: '600' },
  saveBtn: { flex: 2, paddingVertical: 12, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
});