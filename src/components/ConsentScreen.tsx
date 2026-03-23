import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { COLORS } from '../../src/constants';

interface Props {
  onAccept: () => void;
  onDecline: () => void;
}

export default function ConsentScreen({ onAccept, onDecline }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>📍</Text>
      </View>

      <Text style={styles.title}>Consentimiento de Rastreo</Text>
      <Text style={styles.sub}>
        Antes de comenzar, necesitamos tu autorización
      </Text>

      <ScrollView style={styles.card} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>¿Qué datos recopilamos?</Text>
        <Item
          icon="📌"
          text="Tu ubicación GPS en tiempo real (latitud y longitud)"
        />
        <Item icon="🔋" text="Nivel de batería de tu dispositivo" />
        <Item icon="📶" text="Estado de la señal de internet" />
        <Item icon="🚗" text="Velocidad de desplazamiento aproximada" />

        <Text style={styles.sectionTitle}>¿Cómo usamos estos datos?</Text>
        <Item
          icon="👁"
          text="Solo los supervisores asignados a tu cuenta pueden ver tu ubicación"
        />
        <Item
          icon="🔒"
          text="Los datos se transmiten de forma cifrada y segura"
        />
        <Item
          icon="📋"
          text="Se registra historial de rutas para reportes operativos"
        />
        <Item
          icon="🔕"
          text="No se comparten con terceros ni se usan con fines publicitarios"
        />

        <Text style={styles.sectionTitle}>Rastreo en segundo plano</Text>
        <Text style={styles.bodyText}>
          Para que el rastreo funcione correctamente cuando tu teléfono está
          bloqueado o la app está en segundo plano, necesitamos el permiso de{' '}
          <Text style={{ color: COLORS.primary, fontWeight: '700' }}>
            Ubicación siempre
          </Text>
          . El sistema solicitará este permiso a continuación.
        </Text>

        <Text style={styles.sectionTitle}>
          Puedes revocar en cualquier momento
        </Text>
        <Text style={styles.bodyText}>
          Puedes detener el rastreo desde la app en cualquier momento. También
          puedes revocar los permisos desde la configuración de tu teléfono.
        </Text>
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.declineBtn} onPress={onDecline}>
          <Text style={styles.declineText}>No aceptar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
          <Text style={styles.acceptText}>Acepto y continuar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Item({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.item}>
      <Text style={styles.itemIcon}>{icon}</Text>
      <Text style={styles.itemText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 24,
    paddingTop: 60,
  },
  iconWrap: { alignItems: 'center', marginBottom: 16 },
  icon: { fontSize: 52 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  sub: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 10,
  },
  item: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  itemIcon: { fontSize: 16, marginTop: 1 },
  itemText: { fontSize: 13, color: COLORS.textSub, flex: 1, lineHeight: 20 },
  bodyText: {
    fontSize: 13,
    color: COLORS.textSub,
    lineHeight: 20,
    marginBottom: 8,
  },
  actions: { flexDirection: 'row', gap: 12, paddingTop: 20 },
  declineBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  declineText: { color: COLORS.textMuted, fontWeight: '600', fontSize: 15 },
  acceptBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  acceptText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
