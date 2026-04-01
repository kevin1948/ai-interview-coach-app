/**
 * app/mock-interview/[sessionId].tsx — Mock interview session route
 * Matches: /mock-interview/new             (new session)
 *          /mock-interview/:sessionId      (resume existing session — future use)
 *
 * Thin wrapper for MockInterviewScreen.
 *
 * Path param:
 *   sessionId — "new" when starting fresh; actual ID when resuming (reserved for Phase 4).
 *               MockInterviewScreen ignores this and creates its own session via the API.
 *
 * Search params (from bridge.navigate / bridge.replace):
 *   sessionTitle: string   — displayed in the screen header
 *   candidateId:  string   — passed to the API for session creation
 */
import React, { useRef } from "react";
import { useLocalSearchParams } from "expo-router";

import MockInterviewScreen from "../../src/features/mock-interview/MockInterviewScreen";
import { createNavigationBridge } from "../../src/lib/navigationBridge";

export default function MockInterviewSessionRoute() {
  const { sessionId, ...rest } = useLocalSearchParams<{
    sessionId: string;
    sessionTitle: string;
    candidateId: string;
  }>();

  const navigation = useRef(createNavigationBridge()).current;

  // Normalise the placeholder: "new" means no pre-existing session.
  // MockInterviewScreen reads candidateId and sessionTitle — not sessionId.
  const params = {
    ...rest,
    sessionId: sessionId === "new" ? "" : (sessionId ?? ""),
  };

  return (
    <MockInterviewScreen
      navigation={navigation as never}
      route={{
        key: "MockInterviewSession",
        name: "MockInterviewSession",
        params,
      } as never}
    />
  );
}
