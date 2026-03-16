import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/stores/auth.store';

function RouteGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, restoreSession } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
      return;
    }

    if (isAuthenticated && inAuthGroup) {
      const role = user?.rol;
      // USER (rastreado) va a la app móvil
      // ADMIN, SUPERVISOR, CLIENT van al dashboard web
      if (role === 'USER') {
        router.replace('/(mobile)/home');
      } else {
        router.replace('/(web)/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <RouteGuard>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </RouteGuard>
  );
}
