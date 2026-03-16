import { create } from 'zustand';
import { Platform } from 'react-native';
import { locationService } from '../services/location.service';
import { offlineDB } from '../services/offline.service';
import { BATTERY_LOW_THRESHOLD, LOCATION_INTERVAL_NORMAL, LOCATION_INTERVAL_LOW_BATTERY } from '../constants';

export type TrackingStatus =
  | 'IDLE' | 'ACTIVE' | 'PAUSED' | 'NO_GPS'
  | 'NO_INTERNET' | 'LOW_BATTERY' | 'OFFLINE_SAVING';

interface TrackingState {
  status: TrackingStatus;
  isTracking: boolean;
  isOnline: boolean;
  currentLocation: { latitud: number; longitud: number } | null;
  lastUpdate: string | null;
  battery: number | null;
  speed: number | null;
  accuracy: number | null;
  pendingCount: number;
  hasConsent: boolean;

  startTracking: () => Promise<void>;
  stopTracking: () => void;
  setConsent: (v: boolean) => void;
  syncPending: () => Promise<void>;
  refreshPendingCount: () => Promise<void>;
}

// Refs fuera del store para poder limpiarlas
let locationSubscription: any = null;
let netInfoUnsubscribe: (() => void) | null = null;
let webWatchId: number | null = null;
let webIntervalId: ReturnType<typeof setInterval> | null = null;

export const useTrackingStore = create<TrackingState>((set, get) => ({
  status: 'IDLE',
  isTracking: false,
  isOnline: true,
  currentLocation: null,
  lastUpdate: null,
  battery: null,
  speed: null,
  accuracy: null,
  pendingCount: 0,
  hasConsent: false,

  setConsent: (v) => set({ hasConsent: v }),

  refreshPendingCount: async () => {
    try {
      const count = await offlineDB.count();
      set({ pendingCount: count });
    } catch (_) {}
  },

  syncPending: async () => {
    try {
      const synced = await locationService.syncPending();
      if (synced > 0) set({ pendingCount: 0 });
    } catch (_) {}
  },

  startTracking: async () => {
    if (Platform.OS === 'web') {
      await startWebTracking(set, get);
    } else {
      await startNativeTracking(set, get);
    }
  },

  stopTracking: () => {
    // Limpiar web
    if (webWatchId !== null) {
      navigator.geolocation.clearWatch(webWatchId);
      webWatchId = null;
    }
    if (webIntervalId !== null) {
      clearInterval(webIntervalId);
      webIntervalId = null;
    }
    // Limpiar nativo
    if (locationSubscription) {
      locationSubscription.remove?.();
      locationSubscription = null;
    }
    if (netInfoUnsubscribe) {
      netInfoUnsubscribe();
      netInfoUnsubscribe = null;
    }
    set({ isTracking: false, status: 'IDLE' });
  },
}));

// ─── WEB TRACKING (navigator.geolocation) ────────────────────────────────────
async function startWebTracking(set: any, get: any) {
  if (!navigator.geolocation) {
    set({ status: 'NO_GPS' });
    return;
  }

  set({ isTracking: true, status: 'ACTIVE', isOnline: navigator.onLine });

  // Monitor network
  const handleOnline = () => {
    set({ isOnline: true, status: 'ACTIVE' });
    get().syncPending();
  };
  const handleOffline = () => {
    set({ isOnline: false, status: 'NO_INTERNET' });
  };
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  const sendPosition = async (position: GeolocationPosition) => {
    const { latitude, longitude, accuracy, speed } = position.coords;
    const isOnline = get().isOnline;

    // Batería via Battery API si está disponible
    let bateria: number | undefined;
    try {
      const nav = navigator as any;
      if (nav.getBattery) {
        const battery = await nav.getBattery();
        bateria = Math.round(battery.level * 100);
        set({ battery: bateria });
      }
    } catch (_) {}

    const payload = {
      latitud: latitude,
      longitud: longitude,
      precision_gps: accuracy ?? undefined,
      velocidad: speed ? Math.round(speed * 3.6) : undefined,
      bateria,
      timestamp_captura: new Date().toISOString(),
    };

    set({
      currentLocation: { latitud: latitude, longitud: longitude },
      lastUpdate: payload.timestamp_captura,
      speed: payload.velocidad ?? null,
      accuracy: accuracy ?? null,
      status: isOnline ? 'ACTIVE' : 'OFFLINE_SAVING',
    });

    await locationService.saveOrSend(payload, isOnline);
    if (!isOnline) await get().refreshPendingCount();
  };

  const handleError = (err: GeolocationPositionError) => {
    if (err.code === err.PERMISSION_DENIED) {
      set({ status: 'NO_GPS', isTracking: false });
    } else {
      set({ status: 'NO_GPS' });
    }
  };

  const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };

  // Primera posición inmediata
  navigator.geolocation.getCurrentPosition(sendPosition, handleError, options);

  // Luego watch continuo
  webWatchId = navigator.geolocation.watchPosition(sendPosition, handleError, options);

  // Guardar cleanup de network listeners
  netInfoUnsubscribe = () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// ─── NATIVE TRACKING (expo-location) ─────────────────────────────────────────
async function startNativeTracking(set: any, get: any) {
  try {
    const Location = await import('expo-location');
    const Battery = await import('expo-battery');
    const NetInfo = (await import('@react-native-community/netinfo')).default;

    const { status: fg } = await Location.requestForegroundPermissionsAsync();
    if (fg !== 'granted') { set({ status: 'NO_GPS' }); return; }
    await Location.requestBackgroundPermissionsAsync();

    await offlineDB.init();
    await get().refreshPendingCount();

    set({ isTracking: true, status: 'ACTIVE' });

    netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected === true && state.isInternetReachable === true;
      set({ isOnline: online });
      if (online) { get().syncPending(); set({ status: 'ACTIVE' }); }
      else set({ status: 'NO_INTERNET' });
    });

    const sendLocation = async (loc: any) => {
      const { isOnline } = get();
      let bateria: number | undefined;
      try {
        const level = await Battery.getBatteryLevelAsync();
        bateria = Math.round(level * 100);
        set({ battery: bateria });
        if (bateria <= BATTERY_LOW_THRESHOLD) set({ status: 'LOW_BATTERY' });
      } catch (_) {}

      const payload = {
        latitud: loc.coords.latitude,
        longitud: loc.coords.longitude,
        precision_gps: loc.coords.accuracy ?? undefined,
        velocidad: loc.coords.speed ? Math.round(loc.coords.speed * 3.6) : undefined,
        bateria,
        timestamp_captura: new Date(loc.timestamp).toISOString(),
      };

      set({
        currentLocation: { latitud: payload.latitud, longitud: payload.longitud },
        lastUpdate: payload.timestamp_captura,
        speed: payload.velocidad ?? null,
        accuracy: payload.precision_gps ?? null,
        status: isOnline ? (bateria && bateria <= BATTERY_LOW_THRESHOLD ? 'LOW_BATTERY' : 'ACTIVE') : 'OFFLINE_SAVING',
      });

      await locationService.saveOrSend(payload, isOnline);
      if (!isOnline) await get().refreshPendingCount();
    };

    const battery = await Battery.getBatteryLevelAsync().catch(() => 1);
    const interval = battery * 100 <= BATTERY_LOW_THRESHOLD ? LOCATION_INTERVAL_LOW_BATTERY : LOCATION_INTERVAL_NORMAL;

    locationSubscription = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: interval, distanceInterval: 5 },
      sendLocation
    );
  } catch (err) {
    console.error('Error starting native tracking:', err);
    set({ status: 'NO_GPS', isTracking: false });
  }
}