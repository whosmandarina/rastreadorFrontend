if (!process.env.EXPO_PUBLIC_API_BASE_URL) {
  throw new Error(
    'Missing API URL. Please set EXPO_PUBLIC_API_BASE_URL in your .env file.',
  );
}

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
export const API_URL = `${API_BASE_URL}/api`;
export const SOCKET_URL = API_BASE_URL;

export const ROLES = {
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  CLIENT: 'CLIENT',
  USER: 'USER',
} as const;

export type Role = keyof typeof ROLES;

export const BATTERY_LOW_THRESHOLD = 15; // %
export const LOCATION_INTERVAL_NORMAL = 10000; // 10s en ms
export const LOCATION_INTERVAL_LOW_BATTERY = 60000; // 60s en ms

export const COLORS = {
  // Fondos
  bg: '#fdfdfd',
  bgCard: '#ffffff',
  bgInput: '#f0f8f8', // teal muy suave para inputs
  bgDark: '#02182b', // Prussian Blue — sidebar

  // Marca
  primary: '#249a98', // Dark Cyan — acción principal
  primaryDark: '#1a7472',
  primaryLight: '#9dd9d2', // Pearl Aqua — badges, hover, suave

  // Semánticos
  success: '#249a98', // usa el cyan para éxito
  warning: '#e8a020', // naranja ambar para warnings
  danger: '#d7263d', // Classic Crimson — peligro, eliminar
  accent: '#d7263d', // mismo crimson como accent

  // Texto
  text: '#02182b', // Prussian Blue — texto principal
  textMuted: '#6b8a9a', // azul grisáceo suave
  textSub: '#3a5a6e', // azul medio
  textOnDark: '#fdfdfd', // texto sobre sidebar oscuro

  // Bordes
  border: '#daeeed', // teal muy suave
  borderDark: '#0a2d42',
};
