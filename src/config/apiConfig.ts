import { Platform } from 'react-native';

export const USE_MOCK_API = false;

export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export const API_V1_PREFIX = '/api/v1';

export const FULL_API_BASE_URL: string = `${API_BASE_URL}${API_V1_PREFIX}`;
