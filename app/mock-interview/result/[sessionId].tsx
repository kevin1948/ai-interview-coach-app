/**
 * app/mock-interview/result/[sessionId].tsx — Mock interview result route
 * Matches: /mock-interview/result/:sessionId
 *
 * Thin wrapper for MockInterviewResultScreen.
 *
 * IMPORTANT — session object deserialisation:
 *   MockInterviewResultScreen expects route.params.session to be a plain object:
 *     { id, title, date, status, candidateId }
 *
 *   Because Expo Router serialises all params to URL strings, the bridge
 *   JSON.stringifies the object before calling router.push. This wrapper
 *   JSON.parses it back so the screen receives the shape it expects.
 *
 * Path param:
 *   sessionId — the id of the completed session (used for URL readability).
 *
 * Search params:
 *   session — JSON string of the session object (parsed back below).
 */
import React, { useRef } from "react";
import { useLocalSearchParams } from "expo-router";

import MockInterviewResultScreen from "../../../src/features/mock-interview/MockInterviewResultScreen";
import { createNavigationBridge } from "../../../src/lib/navigationBridge";

export default function MockInterviewResultRoute() {
  const { session: sessionRaw, ...rest } = useLocalSearchParams<{
    sessionId: string;
    session: string;
  }>();

  const navigation = useRef(createNavigationBridge()).current;

  // Deserialise the session object that was JSON.stringified by the bridge.
  let session: Record<string, unknown> = {};
  if (sessionRaw) {
    try {
      const parsed: unknown = JSON.parse(sessionRaw);
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        session = parsed as Record<string, unknown>;
      }
    } catch {
      // session stays as empty object; screen shows graceful error state
    }
  }

  return (
    <MockInterviewResultScreen
      navigation={navigation as never}
      route={{
        key: "MockInterviewResult",
        name: "MockInterviewResult",
        params: { ...rest, session },
      } as never}
    />
  );
}
