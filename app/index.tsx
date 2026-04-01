/**
 * app/index.tsx — Home route (/)
 *
 * Thin wrapper: passes a stable navigation bridge and empty route params to
 * HomeScreen, which manages its own state via AsyncStorage on mount.
 *
 * Phase 1 note: HomeScreen's addListener("focus", ...) refresh is a no-op here.
 * The initial fetch on mount still works correctly.
 * Fixed in Phase 4 with RTK Query / useFocusEffect.
 */
import React, { useRef } from "react";

import HomeScreen from "../src/features/home/HomeScreen";
import { createNavigationBridge } from "../src/lib/navigationBridge";

export default function HomeRoute() {
  // useRef ensures the navigation object is stable across renders,
  // preventing HomeScreen's useEffect([navigation]) from re-firing.
  const navigation = useRef(createNavigationBridge()).current;

  return (
    <HomeScreen
      navigation={navigation as never}
    />
  );
}
