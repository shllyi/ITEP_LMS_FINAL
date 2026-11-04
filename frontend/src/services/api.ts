import Constants from 'expo-constants';

const nativeHostUri = Constants.expoConfig?.hostUri;
const nativeHost = nativeHostUri?.startsWith('[')
  ? nativeHostUri.slice(1, nativeHostUri.indexOf(']'))
  : nativeHostUri?.split(':')[0];
const webHost = typeof window !== 'undefined' ? window.location.hostname : '';
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim()
  .replace(/\/+$/, '')
  .replace(/\/api$/i, '');
const isLocalHost = (host: string) =>
  host === 'localhost' ||
  host === '127.0.0.1' ||
  host === '0.0.0.0' ||
  host === '::1' ||
  /^\[?::1\]?$/.test(host) ||
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
  /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(host) ||
  /^169\.254\.\d{1,3}\.\d{1,3}$/.test(host);
const localHost = webHost || nativeHost || 'localhost';
const formattedLocalHost = localHost.includes(':') ? `[${localHost.replace(/^\[|\]$/g, '')}]` : localHost;
const localApiUrl = `http://${formattedLocalHost}:8000`;
const isLocalDevelopment = Boolean(__DEV__) && (Boolean(nativeHost) || isLocalHost(webHost));
const apiUrl = isLocalDevelopment || isLocalHost(webHost)
  ? localApiUrl
  : configuredApiUrl || localApiUrl;

if (!configuredApiUrl && webHost && !isLocalHost(webHost) && !__DEV__) {
  throw new Error('EXPO_PUBLIC_API_URL must be set to the deployed backend URL for production.');
}

export const API_BASE = `${apiUrl}/api`;
export const getHeaders = (token?: string | null): Record<string, string> => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});
