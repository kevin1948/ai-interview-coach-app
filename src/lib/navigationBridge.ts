/**
 * src/lib/navigationBridge.ts
 *
 * Phase 1 compatibility shim.
 *
 * Translates the React Navigation imperative API
 * (navigation.navigate("ScreenName", params)) into Expo Router calls
 * (router.push({ pathname: "/path", params })).
 *
 * ROUTE_MAP uses [paramName] placeholders for dynamic segments.
 * buildPath() substitutes them from the params object at call-time.
 *
 * KNOWN PHASE 1 LIMITATIONS:
 *  - MockInterviewResultScreen receives route.params.session as a nested object.
 *    We JSON.stringify it before pushing; the result wrapper JSON.parses it back.
 *  - addListener("focus", cb) is a no-op. Screens needing focus refresh should
 *    use useFocusEffect from @react-navigation/native (which works transparently
 *    inside Expo Router). MockInterviewListScreen already does this correctly.
 *  - HomeScreen's addListener-based focus refresh is disabled in Phase 1.
 *    Fixed in Phase 4 via RTK Query cache invalidation / useFocusEffect.
 *
 * This file will be removed in Phase 4 once all screens use Expo Router hooks.
 */

import { router } from "expo-router";

// ---------------------------------------------------------------------------
// Route map
// ---------------------------------------------------------------------------

/**
 * Maps legacy React Navigation screen names to Expo Router path templates.
 * [paramName] segments are substituted by buildPath() from navigate/replace params.
 */
const ROUTE_MAP: Record<string, string> = {
  Home:                 "/",
  Resume:               "/resume",
  SessionPicker:        "/session-picker",
  MockInterviewList:    "/mock-interview",
  MockInterviewSession: "/mock-interview/[sessionId]",
  MockInterview:        "/mock-interview/[sessionId]", // alias
  MockInterviewResult:  "/mock-interview/result/[sessionId]",
  Interview:            "/interview/[sessionId]",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Params = Record<string, unknown>;

function resolveRoute(name: string): string | undefined {
  const path = ROUTE_MAP[name];
  if (!path) {
    console.warn(`[navigationBridge] Unknown screen name: "${name}"`);
  }
  return path;
}

/**
 * Replaces [paramName] segments in a path template with actual param values.
 * Returns the resolved path and the remaining (unused) params for search string.
 * Falls back to "new" for any missing dynamic segment so the route always resolves.
 */
function buildPath(template: string, params: Params): [string, Params] {
  const remaining = { ...params };
  const path = template.replace(/\[(\w+)\]/g, (_, key: string) => {
    const val = remaining[key];
    if (val !== undefined) delete remaining[key];
    return String(val ?? "new");
  });
  return [path, remaining];
}

/**
 * Serialises param values to strings for Expo Router's URL layer.
 * Nested objects (e.g. MockInterviewResult's `session`) are JSON.stringified;
 * the corresponding route wrapper is responsible for JSON.parsing them back.
 */
function prepareParams(params: Params): Record<string, string> | undefined {
  const entries = Object.entries(params);
  if (!entries.length) return undefined;
  return Object.fromEntries(
    entries.map(([key, value]) => [
      key,
      typeof value === "object" && value !== null
        ? JSON.stringify(value)
        : String(value ?? ""),
    ])
  );
}

// ---------------------------------------------------------------------------
// Bridge factory
// ---------------------------------------------------------------------------

/**
 * Creates a stable navigation-bridge object.
 *
 * Always use with useRef() in route wrappers to prevent re-render loops caused
 * by screens that include `navigation` in useEffect dependency arrays:
 *
 *   const navigation = useRef(createNavigationBridge()).current;
 */
export function createNavigationBridge() {
  return {
    navigate(name: string, params?: Params): void {
      const template = resolveRoute(name);
      if (!template) return;
      const [path, remaining] = buildPath(template, params ?? {});
      router.push({ pathname: path as never, params: prepareParams(remaining) });
    },

    replace(name: string, params?: Params): void {
      const template = resolveRoute(name);
      if (!template) return;
      const [path, remaining] = buildPath(template, params ?? {});
      router.replace({ pathname: path as never, params: prepareParams(remaining) });
    },

    goBack(): void {
      router.back();
    },

    canGoBack(): boolean {
      return router.canGoBack();
    },

    /**
     * Phase 1 stub — returns an unsubscribe no-op.
     * See file-level comment for migration guidance.
     */
    addListener(_event: string, _callback: () => void): () => void {
      return () => {};
    },
  } as const;
}

export type NavigationBridge = ReturnType<typeof createNavigationBridge>;
