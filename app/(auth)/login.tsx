import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth.store';
import { validators } from '../../src/utils/validators';
import { COLORS } from '../../src/constants';

export default function LoginScreen() {
  const { registered } = useLocalSearchParams<{ registered?: string }>();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState<{ correo?: string; password?: string }>({});
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    setErrors({});
    clearError();

    const newErrors: { correo?: string; password?: string } = {};
    const correoError = validators.correo(correo);
    if (correoError) newErrors.correo = correoError;
    if (!password) newErrors.password = 'La contraseña es obligatoria';

    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    try {
      await login({ correo: correo.trim().toLowerCase(), password });
    } catch (_) {}
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Brand */}
        <View style={styles.brand}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoIcon}>⬡</Text>
          </View>
          <Text style={styles.logoText}>rastreador</Text>
          <Text style={styles.logoSub}>Plataforma de seguimiento en tiempo real</Text>
        </View>

        {/* Aviso registro exitoso */}
        {registered === '1' && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>✅ ¡Cuenta creada exitosamente! Ya puedes iniciar sesión.</Text>
          </View>
        )}

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Iniciar Sesión</Text>
          <Text style={styles.cardSub}>Ingresa tus credenciales para acceder</Text>

          {/* Error global del servidor */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {/* Correo */}
          <View style={styles.field}>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              style={[styles.input, errors.correo && styles.inputError]}
              placeholder="Ej: juan.perez@empresa.com"
              placeholderTextColor={COLORS.textMuted}
              value={correo}
              onChangeText={(v) => { setCorreo(v); setErrors((p) => ({ ...p, correo: undefined })); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            {errors.correo && <Text style={styles.fieldError}>⚠️ {errors.correo}</Text>}
          </View>

          {/* Contraseña */}
          <View style={styles.field}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={[styles.inputRow, errors.password && styles.inputError]}>
              <TextInput
                style={[styles.inputInner]}
                placeholder="Tu contraseña"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={(v) => { setPassword(v); setErrors((p) => ({ ...p, password: undefined })); }}
                secureTextEntry={!showPass}
                autoComplete="password"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(!showPass)}>
                <Text style={styles.eyeText}>{showPass ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.fieldError}>⚠️ {errors.password}</Text>}
          </View>

          <TouchableOpacity
            style={[styles.btn, isLoading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Entrar</Text>
            }
          </TouchableOpacity>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>¿Eres usuario nuevo?</Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={styles.registerLink}> Regístrate aquí</Text>
              </TouchableOpacity>
            </Link>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              🔒 El registro requiere un código de supervisor válido.
              Administradores y supervisores son creados por el administrador del sistema.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brand: { alignItems: 'center', marginBottom: 28 },
  logoCircle: { width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoIcon: { fontSize: 32, color: '#fff' },
  logoText: { fontSize: 28, fontWeight: '800', color: COLORS.text, letterSpacing: 2, textTransform: 'uppercase' },
  logoSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' },
  successBox: { backgroundColor: COLORS.success + '20', borderWidth: 1, borderColor: COLORS.success + '50', borderRadius: 12, padding: 14, marginBottom: 16 },
  successText: { color: COLORS.success, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  card: { backgroundColor: COLORS.bgCard, borderRadius: 20, padding: 28, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  cardSub: { fontSize: 13, color: COLORS.textMuted, marginBottom: 20 },
  errorBox: { backgroundColor: '#7f1d1d33', borderWidth: 1, borderColor: COLORS.danger, borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { color: COLORS.danger, fontSize: 13 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, color: COLORS.textSub, marginBottom: 6, fontWeight: '500' },
  input: { backgroundColor: COLORS.bgInput, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, color: COLORS.text, fontSize: 15 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgInput, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingRight: 8 },
  inputInner: { flex: 1, paddingHorizontal: 16, paddingVertical: 13, color: COLORS.text, fontSize: 15 },
  inputError: { borderColor: COLORS.danger },
  fieldError: { color: COLORS.danger, fontSize: 12, marginTop: 5 },
  eyeBtn: { padding: 10 },
  eyeText: { fontSize: 18 },
  btn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginBottom: 16 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 14 },
  registerText: { color: COLORS.textMuted, fontSize: 14 },
  registerLink: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  infoBox: { backgroundColor: COLORS.bgInput, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  infoText: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});