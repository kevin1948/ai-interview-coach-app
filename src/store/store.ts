/**
 * src/store/store.ts
 *
 * Redux store instance and AppDispatch type export.
 */

import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './rootReducer';
import { resumeApi } from '../features/resume/resumeApiSlice';
import { practiceApi } from '../features/session/practiceApiSlice';
import { interviewApi } from '../features/interview/interviewApiSlice';
import { mockInterviewApi } from '../features/mock-interview/mockInterviewApiSlice';

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(resumeApi.middleware)
      .concat(practiceApi.middleware)
      .concat(interviewApi.middleware)
      .concat(mockInterviewApi.middleware),
});

/** Inferred dispatch type — includes RTK Query thunks. */
export type AppDispatch = typeof store.dispatch;

export default store;
