/**
 * src/store/profileSlice.ts
 *
 * Single source of truth for candidateId / resumeId across the app.
 * AsyncStorage is read on startup (HomeScreen) and each value is
 * dispatched here so every screen reads from the store instead.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ProfileState {
  candidateId:    string;
  resumeId:       string;
  resumeUploaded: boolean;
}

const initialState: ProfileState = {
  candidateId:    '',
  resumeId:       '',
  resumeUploaded: false,
};

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setCandidateId(state, action: PayloadAction<string>) {
      state.candidateId = action.payload ?? '';
    },
    setResumeId(state, action: PayloadAction<string>) {
      state.resumeId = action.payload ?? '';
    },
    setResumeUploaded(state, action: PayloadAction<boolean>) {
      state.resumeUploaded = Boolean(action.payload);
    },
    resetProfile(): ProfileState {
      return initialState;
    },
  },
});

export const { setCandidateId, setResumeId, setResumeUploaded, resetProfile } =
  profileSlice.actions;

export default profileSlice.reducer;
