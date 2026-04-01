# 🏛️ Architecture Rules & Engineering Standards

Welcome to the internal repository. This project strictly adheres to a **Flat Layer-Based Architecture** natively optimized for React Native and Expo Router handling. 

To maintain an infinitely scalable, spotless, production-ready codebase, **ALL** contributors must adhere strictly to these rules before requesting a PR review.

---

## 🏗️ 1. Core Architecture (Layer-Based)

Our application root is strictly segmented into technical layers. DO NOT create arbitrary "feature" or domain-level folders natively inside the root scope.

### The Source Directory (`src/`)
* **`screens/`** → Represents full-page UI views (e.g., `MockInterviewScreen.tsx`). Each file should map directly up to an isolated `app/` route.
* **`components/`** → Isolated, reusable UI boundaries (e.g., buttons, cards, `Waveform.tsx`).
* **`hooks/`** → Reusable custom React logic trees (e.g., `useRealtimeWaveform.ts`).
* **`services/`** → Network bounds, REST abstractions, and RTK Query API slices. **API logic lives ONLY here**.
* **`store/`** → Redux generic configurations, middleware, and persistent slices.
* **`utils/`** → Pure helper functions, numeric formatters, arbitrary bridges (`navigationBridge`).
* **`constants/`** → Static configuration files, styling tokens, and `apiConfig.ts`.
* **`types/`** → Global TypeScript interfaces mapping exactly to our FastAPI backend.

### The Explicit App Directory (`app/`)
* **`app/`** represents Expo Router endpoint routing natively. Files here are **THIN WRAPPERS ONLY**.
* **NO BUSINESS LOGIC** is permitted within `app/`. It serves strictly to provide navigation context.

---

## 🛠️ 2. How To Build a New Route

Follow this exact sequential flow when introducing new UI schemas into the system:

* **Step 1:** Create the screen core in `src/screens/<ScreenName>.tsx`.
* **Step 2:** Extract any reusable UI into `src/components/`.
* **Step 3:** Abstract side-effects and React hooks dynamically into `src/hooks/`.
* **Step 4:** Define the backend network pipelines strictly within `src/services/`.
* **Step 5:** Define any transient global client states natively using a Redux slice inside `src/store/`.
* **Step 6:** Finally, create the physical routing file inside `app/<route>.tsx` and load the `<ScreenName>` component securely.

---

## 🛣️ 3. Routing & Import Explicit Constraints

Relative routing chaos is completely banned. Build your imports safely against clean path layouts.

**❌ BAD:**
```tsx
import { FeatureScreen } from "@/features/feature";         // DO NOT use feature-based architectures internally
import { Profile } from "../../../../screens/ProfileScreen"; // DO NOT chaotically deep-nest relative folders
```

**✅ GOOD:**
```tsx
import { FeatureScreen } from "@/screens/FeatureScreen";
import { Waveform } from "@/components/Waveform";
import { useWaveform } from "@/hooks/useWaveform";
import { apiSlice } from "@/services/apiSlice";
```
*(Note: If path aliases `@/` do not formally exist, rigidly map to clean one-level relative paths like `../screens/FeatureScreen` directly from within `app/`).*

---

## 🧪 4. Testing Conventions

We test explicitly by architectural layer to ensure code decoupling. We do not test arbitrary loosely bound feature folders. 

**✅ MANDATORY DIRECTORY STRUCTURE:**
* `__tests__/screens/<ScreenName>.test.tsx`
* `__tests__/components/<ComponentName>.test.tsx`
* `__tests__/services/<ServiceName>.test.tsx`

---

## 💼 5. State Management & REST Sync

* **Redux Toolkit**: Always use RTK natively for universal client state overrides.
* **RTK Query**: Use RTK Query heavily inside `src/services/` for ALL data fetching, caching overrides, and polling logic hitting the FastAPI backend network. Do not build arbitrary `useEffect/fetch` cycles that corrupt the cache.
* **Clean State**: Endlessly throttle state changes to physically prevent arbitrary re-renders across the screen layers. 

---

## 🧹 6. Fundamental Code Quality (Do's and Don'ts)

* **DO** enforce comprehensive TypeScript `strict` typing paradigms internally.
* **DO NOT** lazily deploy the `any` type. Build discrete definitions in `src/types/`. 
* **DO** natively prioritize **NativeWind** (`className="..."`) instead of React Native `StyleSheet` objects to guarantee cross-OS parity out of the box. 
* **DO** default to ES6 **Named Exports** (`export const Foo = () => ...`) over Default Exports (unless explicitly demanded natively by Expo Router internally inside `app/`).
* **DO NOT** arbitrarily drop `console.log()` across deployment pipelines! Use our robust internal logger system `src/utils/logger.ts` to log errors natively safely without triggering memory bloat inside live UI renders. 
* **DO** comprehensively clean up intervals, explicit native event listeners, and arbitrary audio/hardware mounts explicitly during the unmount cycle internally (`return () => clearInterval(...)`).

---

## 📥 7. Git Lifecycle & PR Checklist

### Active Workflow
1. Isolate every assignment heavily against a feature branch referencing your task constraints (e.g., `feature/analytics-screen`). **DO NOT ever natively commit logic directly against `main/dev/qa`**.
2. Format native commit messages tracking cleanly with the layer manipulated (`feat: add waveform hook`).

### The Final PR Review Checklist
Before requesting an internal engineering review, the author MUST explicitly check and guarantee:
- [ ] No `localhost` mappings actively exist inside `src/constants/apiConfig.ts`. (API is natively wrapped against `.env` fallbacks).
- [ ] Code builds flawlessly logging exactly zero internal `npx tsc --noEmit` errors.
- [ ] No missing arbitrary paths ("Cannot find module...") are currently trailing.
- [ ] The layer architecture structure remains absolutely uncorrupted.
- [ ] App mounts cleanly out of `npx expo start` without throwing unhandled exceptions natively across the terminal logic logs.