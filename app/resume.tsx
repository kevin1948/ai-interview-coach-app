/**
 * app/resume.tsx — Resume route (/resume)
 *
 * Thin wrapper for ResumeScreen.
 * No route params required — ResumeScreen manages its own upload state.
 */
import React, { useRef } from "react";

import ResumeScreen from "../src/screens/ResumeScreen";
import { createNavigationBridge } from "../src/utils/navigationBridge";

export default function ResumeRoute() {
  const navigation = useRef(createNavigationBridge()).current;

  return (
    <ResumeScreen
      navigation={navigation as never}
    />
  );
}
