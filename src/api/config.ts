import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default host: On Web localhost works, on Physical devices/emulators use LAN IP
export const DEFAULT_HOST_IP = '192.168.1.2';
export const DEFAULT_SERVER_URL = Platform.OS === 'web' 
  ? 'http://localhost:3000' 
  : `http://${DEFAULT_HOST_IP}:3000`;

const SERVER_URL_STORAGE_KEY = '@caishop_server_url';
const TOKEN_STORAGE_KEY = '@caishop_token';
const USER_STORAGE_KEY = '@caishop_user';

export async function getStoredServerUrl(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(SERVER_URL_STORAGE_KEY);
    return saved || DEFAULT_SERVER_URL;
  } catch {
    return DEFAULT_SERVER_URL;
  }
}

export async function setStoredServerUrl(url: string): Promise<void> {
  const clean = url.trim().replace(/\/+$/, '');
  await AsyncStorage.setItem(SERVER_URL_STORAGE_KEY, clean);
}

export async function getStoredToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function setStoredAuth(token: string, user: any): Promise<void> {
  await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
  await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export async function clearStoredAuth(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  await AsyncStorage.removeItem(USER_STORAGE_KEY);
}

export async function getStoredUser(): Promise<any | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
