/**
 * app/mock-interview/index.tsx — Mock interview list route (/mock-interview)
 *
 * Thin wrapper for MockInterviewListScreen.
 *
 * No route params needed — the screen reads candidateId from AsyncStorage
 * directly, and uses useFocusEffect from @react-navigation/native for
 * auto-refresh on focus (works transparently inside Expo Router's stack).
 */
import React, { useRef } from "react";

import MockInterviewListScreen from "../../src/screens/MockInterviewListScreen";
import { createNavigationBridge } from "../../src/utils/navigationBridge";

export default function MockInterviewListRoute() {
  const navigation = useRef(createNavigationBridge()).current;

  return (
    <MockInterviewListScreen
      navigation={navigation as never}
    />
  );
}
