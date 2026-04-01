/**
 * app/session-picker.tsx — Session picker route (/session-picker)
 *
 * Thin wrapper for SessionPickerScreen.
 *
 * Receives via search params (from HomeScreen → bridge.navigate("SessionPicker", ...)):
 *   candidateId: string
 *   resumeId:    string
 */
import React, { useRef } from "react";
import { useLocalSearchParams } from "expo-router";

import SessionPickerScreen from "../src/screens/SessionPickerScreen";
import { createNavigationBridge } from "../src/utils/navigationBridge";

export default function SessionPickerRoute() {
  const params = useLocalSearchParams<{
    candidateId: string;
    resumeId: string;
  }>();

  const navigation = useRef(createNavigationBridge()).current;

  return (
    <SessionPickerScreen
      navigation={navigation as never}
      route={{
        key: "SessionPicker",
        name: "SessionPicker",
        params,
      } as never}
    />
  );
}
