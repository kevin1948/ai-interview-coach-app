import { Platform } from 'react-native';

export const USE_MOCK_API = false;

const fallback = 'http://127.0.0.1:8000';

export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL || fallback;

if (!process.env.EXPO_PUBLIC_API_URL) {
  console.warn("⚠️ Using fallback API URL. Set EXPO_PUBLIC_API_URL for production.");
}

export const API_V1_PREFIX = '/api/v1';

export const FULL_API_BASE_URL: string = `${API_BASE_URL}${API_V1_PREFIX}`;
