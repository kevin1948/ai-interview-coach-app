import { Platform } from "react-native";

export const USE_MOCK_API = true;

// Real backend later:
// Android emulator -> http://10.0.2.2:9000
// Physical device -> http://YOUR_LAPTOP_IP:9000
// Web -> http://localhost:9000
export const API_BASE_URL =
  Platform.OS === "android"
    ? "http://10.0.2.2:9000"
    : "http://localhost:9000";

export const API_V1_PREFIX = "/api/v1";

export const FULL_API_BASE_URL = `${API_BASE_URL}${API_V1_PREFIX}`;