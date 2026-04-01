/**
 * src/store/rootReducer.ts
 *
 * Central reducer registry. RootState is derived from this combiner
 * and re-exported for use in hooks and selectors.
 */

import { combineReducers } from '@reduxjs/toolkit';
import profileReducer from '../features/profile/profileSlice';
import { resumeApi } from '../features/resume/resumeApiSlice';
import { practiceApi } from '../features/session/practiceApiSlice';
import { interviewApi } from '../features/interview/interviewApiSlice';
import { mockInterviewApi } from '../features/mock-interview/mockInterviewApiSlice';

const rootReducer = combineReducers({
  // ── Feature reducers ────────────────────────────────────────────────────
  profile: profileReducer,

  // ── RTK Query reducers (keyed by reducerPath) ──────────────────────────
  [resumeApi.reducerPath]:        resumeApi.reducer,
  [practiceApi.reducerPath]:      practiceApi.reducer,
  [interviewApi.reducerPath]:     interviewApi.reducer,
  [mockInterviewApi.reducerPath]: mockInterviewApi.reducer,
});

/** Shape of the entire Redux state tree — consumed by TypedUseSelectorHook. */
export type RootState = ReturnType<typeof rootReducer>;

export default rootReducer;
