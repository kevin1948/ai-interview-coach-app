import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { Alert } from 'react-native';

import ResumeScreen from '../../../src/screens/ResumeScreen';
import profileReducer from '../../../src/store/profileSlice';

// Provide a mock for expo-document-picker
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(() => Promise.resolve({
    canceled: false,
    assets: [{ uri: 'file://fake/resume.pdf', name: 'resume.pdf', size: 1024 }],
  })),
}));

// Mock the API slice correctly so we can spy on it
const mockTriggerUploadResume = jest.fn();
jest.mock('../../../src/services/resumeApiSlice', () => ({
  useUploadResumeMutation: () => [mockTriggerUploadResume, { isLoading: false }],
}));

// Mock Alert to prevent it blocking test flow
jest.spyOn(Alert, 'alert').mockImplementation((title, msg, buttons) => {
  if (buttons && buttons.length > 0) {
    const continueBtn = buttons.find(b => b.text === 'Continue');
    if (continueBtn && continueBtn.onPress) {
      continueBtn.onPress();
    }
  }
});

const setupTestStore = () =>
  configureStore({
    reducer: {
      profile: profileReducer,
    },
  });

describe('ResumeScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('handles the full upload flow and dispatches to store/AsyncStorage', async () => {
    const store = setupTestStore();
    mockTriggerUploadResume.mockResolvedValue({
      data: {
        user_id: 'user-789',
        resume: { id: 'resume-123' },
      },
    });

    const { getByText } = render(
      <Provider store={store}>
        <ResumeScreen navigation={mockNavigation} />
      </Provider>
    );

    // 1. Simulate selecting a file
    fireEvent.press(getByText('Upload Resume'));

    // 2. Wait for file to be selected and 'Change File' text to appear
    await waitFor(() => {
      expect(getByText('Change File')).toBeTruthy();
    });

    // 3. Submit
    fireEvent.press(getByText('Upload Resume'));

    // 4. Verify the flow completes
    await waitFor(() => {
      // API gets called with the selected file
      expect(mockTriggerUploadResume).toHaveBeenCalledWith({
        file: expect.objectContaining({ uri: 'file://fake/resume.pdf' }),
      });

      // Stored in AsyncStorage
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('candidateId', 'user-789');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('resumeId', 'resume-123');

      // Stored in Redux
      const state = store.getState().profile;
      expect(state.candidateId).toBe('user-789');
      expect(state.resumeId).toBe('resume-123');
      expect(state.resumeUploaded).toBe(true);

      // Alert gets called which cascades to navigation.navigate
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Resume uploaded successfully!',
        expect.any(Array)
      );
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Home');
    });
  });
});
