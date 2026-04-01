/**
 * src/features/audio/useRealtimeWaveform.ts
 *
 * TypeScript resolution shim.
 *
 * Metro bundler resolves platform-specific extensions (.native.ts / .web.ts)
 * at runtime, so the runtime files are never touched. This file exists solely
 * to give `tsc` a module to resolve when it sees:
 *
 *   import useRealtimeWaveform from "../audio/useRealtimeWaveform";
 *
 * At runtime Metro will pick .native.ts or .web.ts; at typecheck time tsc
 * picks this file. The return type is intentionally identical to both
 * platform implementations so callers are fully typed.
 */

// Re-export the native implementation as the canonical type source.
// The web implementation has the same return signature.
export { default } from "./useRealtimeWaveform.native";
