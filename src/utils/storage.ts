import { Platform } from 'react-native';

// Use SecureStore on native, localStorage on web
const isWeb = Platform.OS === 'web';

const TOKEN_KEY = 'rastreador_jwt';
const USER_KEY = 'rastreador_user';

export const saveToken = async (token: string): Promise<void> => {
  if (isWeb) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
};

export const getToken = async (): Promise<string | null> => {
  if (isWeb) {
    return localStorage.getItem(TOKEN_KEY);
  } else {
    const SecureStore = await import('expo-secure-store');
    return await SecureStore.getItemAsync(TOKEN_KEY);
  }
};

export const saveUser = async (user: object): Promise<void> => {
  const value = JSON.stringify(user);
  if (isWeb) {
    localStorage.setItem(USER_KEY, value);
  } else {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync(USER_KEY, value);
  }
};

export const getUser = async (): Promise<any | null> => {
  if (isWeb) {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } else {
    const SecureStore = await import('expo-secure-store');
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
};

export const clearAuth = async (): Promise<void> => {
  if (isWeb) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } else {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  }
};
