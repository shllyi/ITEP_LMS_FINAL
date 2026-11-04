import Constants from 'expo-constants';

const nativeHost = Constants.expoConfig?.hostUri?.split(':')[0];
const webHost = typeof window !== 'undefined' ? window.location.hostname : '';
const apiHost = webHost || nativeHost || 'localhost';

export const API_BASE = `${process.env.EXPO_PUBLIC_API_URL}/api`;
export const getHeaders = (token?: string | null): Record<string, string> => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});
