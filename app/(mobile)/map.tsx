import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTrackingStore } from '../../src/stores/tracking.store';
import { COLORS } from '../../src/constants';
import { useRef, useEffect, useState, useMemo } from 'react';

function buildMapHTML(lat: number, lng: number): string {
  return `<!DOCTYPE html><html><head>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>*{margin:0;padding:0}#map{width:100vw;height:100vh}</style>
  </head><body><div id="map"></div><script>
    const map = L.map('map').setView([${lat}, ${lng}], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19
    }).addTo(map);

    // Pulsing marker for current user
    const pulseIcon = L.divIcon({
      html: \`<div style="
        width:20px;height:20px;border-radius:50%;
        background:#3b82f6;border:3px solid white;
        box-shadow:0 0 0 6px rgba(59,130,246,0.3);
      "></div>\`,
      className: '',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    window.userMarker = L.marker([${lat}, ${lng}], { icon: pulseIcon })
      .bindPopup('<b>Tu ubicación actual</b>')
      .addTo(map)
      .openPopup();

    // Accuracy circle
    window.accuracyCircle = L.circle([${lat}, ${lng}], {
      radius: 30, color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 1
    }).addTo(map);

    window.updateLocation = function(newLat, newLng) {
      const latlng = [newLat, newLng];
      window.userMarker.setLatLng(latlng);
      window.accuracyCircle.setLatLng(latlng);
      map.flyTo(latlng, 16, { animate: true, duration: 1.2 });
    };

    window.addEventListener('message', function(event) {
      let data = event.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch(e) {}
      }
      if (data && data.type === 'location_update') {
        window.updateLocation(data.lat, data.lng);
      }
    });
  </script></body></html>`;
}

export default function MapScreen() {
  const { currentLocation, isTracking, lastUpdate } = useTrackingStore();
  const iframeRef = useRef<any>(null);
  const webViewRef = useRef<any>(null);
  const [initialLoc, setInitialLoc] = useState(currentLocation);

  // Capturar la primera ubicación para no reconstruir el mapa HTML entero
  useEffect(() => {
    if (!initialLoc && currentLocation) {
      setInitialLoc(currentLocation);
    }
  }, [currentLocation, initialLoc]);

  // Actualizar marcadores dinámicamente sin recargar iframe/webview
  useEffect(() => {
    if (!currentLocation || !initialLoc) return;
    const { latitud, longitud } = currentLocation;

    if (Platform.OS === 'web' && iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          { type: 'location_update', lat: latitud, lng: longitud }, 
          '*'
        );
      } catch (e) {}
    } else if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (typeof window.updateLocation === 'function') {
          window.updateLocation(${latitud}, ${longitud});
        }
        true;
      `);
    }
  }, [currentLocation, initialLoc]);

  if (!initialLoc) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🗺</Text>
        <Text style={styles.emptyTitle}>Sin ubicación aún</Text>
        <Text style={styles.emptySub}>
          {isTracking
            ? 'Esperando primera ubicación GPS...'
            : 'Inicia el rastreo desde la pestaña "Rastreo" para ver tu mapa'}
        </Text>
      </View>
    );
  }

  // Generar HTML una sola vez basado en initialLoc para evitar parpadeos
  const html = useMemo(() => {
    return buildMapHTML(initialLoc.latitud, initialLoc.longitud);
  }, [initialLoc]);

  const activeLoc = currentLocation || initialLoc;
  const updateStr = lastUpdate
    ? new Date(lastUpdate).toLocaleTimeString('es-MX')
    : '—';

  return (
    <View style={styles.container}>
      {/* Info bar */}
      <View style={styles.infoBar}>
        <Text style={styles.coordText}>
          📍 {activeLoc.latitud.toFixed(5)}, {activeLoc.longitud.toFixed(5)}
        </Text>
        <Text style={styles.timeText}>🕐 {updateStr}</Text>
      </View>

      {/* Map */}
      {Platform.OS === 'web' ? (
        <iframe
          ref={iframeRef}
          srcDoc={html}
          style={{ flex: 1, border: 'none' } as any}
          title="Mi ubicación"
        />
      ) : (
        // On native, use WebView
        (() => {
          try {
            const { WebView } = require('react-native-webview');
            return (
              <WebView
                ref={webViewRef}
                source={{ html }}
                style={{ flex: 1 }}
                javaScriptEnabled
                domStorageEnabled
                originWhitelist={['*']}
              />
            );
          } catch {
            return (
              <View style={styles.empty}>
                <Text style={styles.emptySub}>WebView no disponible</Text>
              </View>
            );
          }
        })()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  infoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingTop: 52,
  },
  coordText: { fontSize: 12, color: COLORS.textSub, fontWeight: '600' },
  timeText: { fontSize: 12, color: COLORS.textMuted },
  empty: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptySub: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
