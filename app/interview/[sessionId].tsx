/**
 * app/interview/[sessionId].tsx — Interview coach session route
 * Matches: /interview/:sessionId
 *
 * Thin wrapper for InterviewScreen.
 *
 * Path param:
 *   sessionId — not used by InterviewScreen directly (reserved for Phase 4 deep-linking).
 *
 * Search params (forwarded from SessionPickerScreen → bridge.navigate("Interview", ...)):
 *   candidateId:  string  — required by InterviewScreen to start the practice session
 *   resumeId:     string  — forwarded for future use
 *   type:         string  — session type ("Projects", "Experience", "Introduction")
 *   sessionTitle: string  — displayed in the screen header, e.g. "Projects Session"
 */
import React, { useRef } from "react";
import { useLocalSearchParams } from "expo-router";

import InterviewScreen from "../../src/features/interview/InterviewScreen";
import { createNavigationBridge } from "../../src/lib/navigationBridge";

export default function InterviewRoute() {
  const params = useLocalSearchParams<{
    sessionId: string;
    candidateId: string;
    resumeId: string;
    type: string;
    sessionTitle: string;
  }>();

  const navigation = useRef(createNavigationBridge()).current;

  return (
    <InterviewScreen
      navigation={navigation as never}
      route={{
        key: "Interview",
        name: "Interview",
        params,
      } as never}
    />
  );
}
