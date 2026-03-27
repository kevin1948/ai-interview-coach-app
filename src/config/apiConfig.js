import { Platform } from "react-native";

export const USE_MOCK_API = false;

export const API_BASE_URL =
  Platform.OS === "android"
    ? "http://192.168.1.7:8000"
    : "http://localhost:8000";

export const API_V1_PREFIX = "/api/v1";

export const FULL_API_BASE_URL = `${API_BASE_URL}${API_V1_PREFIX}`;