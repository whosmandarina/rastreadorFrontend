import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { authService } from '../../src/services/auth.service';
import { Ionicons } from '@expo/vector-icons';
import { validators } from '../../src/utils/validators';
import { COLORS } from '../../src/constants';

interface FieldErrors {
  codigo_supervisor?: string;
  nombre?: string;
  correo?: string;
  password?: string;
  telefono?: string;
}

export default function RegisterScreen() {
  const router = useRouter();
  const [form, setForm] = useState({
    nombre: '',
    correo: '',
    password: '',
    telefono: '',
    codigo_supervisor: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const update = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Limpiar error del campo al escribir
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: FieldErrors = {};

    const supError = validators.codigoSupervisor(form.codigo_supervisor);
    if (supError) newErrors.codigo_supervisor = supError;

    const nombreError = validators.nombre(form.nombre);
    if (nombreError) newErrors.nombre = nombreError;

    const correoError = validators.correo(form.correo);
    if (correoError) newErrors.correo = correoError;

    const passError = validators.password(form.password);
    if (passError) newErrors.password = passError;

    if (form.telefono) {
      const telError = validators.telefono(form.telefono);
      if (telError) newErrors.telefono = telError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    setGlobalError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await authService.register({
        nombre: form.nombre.trim(),
        correo: form.correo.trim().toLowerCase(),
        password: form.password,
        telefono: form.telefono.trim() || undefined,
        codigo_supervisor: Number(form.codigo_supervisor),
      });
      // Redirigir al login con mensaje de éxito
      router.replace({ pathname: '/(auth)/login', params: { registered: '1' } });
    } catch (e: any) {
      setGlobalError(e?.response?.data?.message || 'Error al registrarse. Verifica tus datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.backBtn}>
              <Ionicons name="arrow-back-outline" size={18} color={COLORS.primary} />
              <Text style={styles.backText}>Volver al login</Text>
            </TouchableOpacity>
          </Link>
          <Text style={styles.cardTitle}>Crear cuenta</Text>
          <Text style={styles.cardSub}>
            Necesitas el código de tu supervisor para registrarte
          </Text>
        </View>

        <View style={styles.card}>
          {globalError ? (
            <View style={styles.globalErrorBox}>
              <Text style={styles.globalErrorText}>⚠️ {globalError}</Text>
            </View>
          ) : null}

          {/* Código de supervisor */}
          <View style={styles.field}>
            <Text style={styles.supervisorLabel}>🔑 Código de Supervisor</Text>
            <TextInput
              style={[styles.supervisorInput, errors.codigo_supervisor && styles.inputError]}
              value={form.codigo_supervisor}
              onChangeText={(v) => update('codigo_supervisor', v.replace(/[^0-9]/g, ''))}
              placeholder="Ej: 102"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
            />
            {errors.codigo_supervisor
              ? <Text style={styles.fieldError}>⚠️ {errors.codigo_supervisor}</Text>
              : <Text style={styles.fieldHint}>Solicita este número a tu supervisor. Es obligatorio para crear tu cuenta.</Text>
            }
          </View>

          <View style={styles.divider} />

          {/* Nombre */}
          <View style={styles.field}>
            <Text style={styles.label}>Nombre completo *</Text>
            <TextInput
              style={[styles.input, errors.nombre && styles.inputError]}
              value={form.nombre}
              onChangeText={(v) => update('nombre', v)}
              placeholder="Ej: Juan Pérez García"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="words"
            />
            {errors.nombre
              ? <Text style={styles.fieldError}>⚠️ {errors.nombre}</Text>
              : <Text style={styles.fieldHint}>Solo letras y espacios, sin caracteres especiales.</Text>
            }
          </View>

          {/* Correo */}
          <View style={styles.field}>
            <Text style={styles.label}>Correo electrónico *</Text>
            <TextInput
              style={[styles.input, errors.correo && styles.inputError]}
              value={form.correo}
              onChangeText={(v) => update('correo', v)}
              placeholder="Ej: juan.perez@empresa.com"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.correo && <Text style={styles.fieldError}>⚠️ {errors.correo}</Text>}
          </View>

          {/* Contraseña */}
          <View style={styles.field}>
            <Text style={styles.label}>Contraseña *</Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              value={form.password}
              onChangeText={(v) => update('password', v)}
              placeholder="Ej: MiClave2024"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
            />
            {errors.password
              ? <Text style={styles.fieldError}>⚠️ {errors.password}</Text>
              : <Text style={styles.fieldHint}>Mínimo 8 caracteres.</Text>
            }
          </View>

          {/* Teléfono */}
          <View style={styles.field}>
            <Text style={styles.label}>Teléfono (opcional)</Text>
            <TextInput
              style={[styles.input, errors.telefono && styles.inputError]}
              value={form.telefono}
              onChangeText={(v) => update('telefono', v)}
              placeholder="Ej: 3121234567"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
            />
            {errors.telefono
              ? <Text style={styles.fieldError}>⚠️ {errors.telefono}</Text>
              : <Text style={styles.fieldHint}>Solo números, entre 7 y 15 dígitos.</Text>
            }
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Crear cuenta</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 60 },
  header: { marginBottom: 24 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: COLORS.primary + '15', borderWidth: 1, borderColor: COLORS.primary + '40', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 16 },
  backText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  cardTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  cardSub: { fontSize: 13, color: COLORS.textMuted, lineHeight: 20 },
  card: { backgroundColor: COLORS.bgCard, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: COLORS.border },
  globalErrorBox: { backgroundColor: '#7f1d1d33', borderWidth: 1, borderColor: COLORS.danger, borderRadius: 10, padding: 12, marginBottom: 16 },
  globalErrorText: { color: COLORS.danger, fontSize: 13 },
  field: { marginBottom: 18 },
  label: { fontSize: 13, color: COLORS.textSub, marginBottom: 6, fontWeight: '500' },
  supervisorLabel: { fontSize: 14, fontWeight: '800', color: COLORS.primary, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.bgInput, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    color: COLORS.text, fontSize: 15,
  },
  supervisorInput: {
    backgroundColor: COLORS.bgInput, borderWidth: 1.5, borderColor: COLORS.primary + '60',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    color: COLORS.text, fontSize: 20, fontWeight: '700',
    textAlign: 'center', letterSpacing: 6,
  },
  inputError: { borderColor: COLORS.danger },
  fieldError: { color: COLORS.danger, fontSize: 12, marginTop: 5 },
  fieldHint: { color: COLORS.textMuted, fontSize: 11, marginTop: 5 },
  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: 18 },
  btn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});