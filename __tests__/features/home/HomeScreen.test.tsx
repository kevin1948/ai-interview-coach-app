import React from 'react';
import { render, waitFor, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import HomeScreen from '../../../src/features/home/HomeScreen';
import profileReducer from '../../../src/features/profile/profileSlice';

const setupTestStore = () =>
  configureStore({
    reducer: {
      profile: profileReducer,
    },
  });

describe('HomeScreen', () => {
  const mockNavigation = {
    addListener: jest.fn(() => jest.fn()),
    navigate: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads from AsyncStorage and dispatches to store on mount (when resume exists)', async () => {
    const store = setupTestStore();

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
      if (key === 'candidateId') return Promise.resolve('user-1');
      if (key === 'resumeId') return Promise.resolve('resume-2');
      return Promise.resolve(null);
    });

    render(
      <Provider store={store}>
        <HomeScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      // The store should eventually have resumeUploaded = true
      expect(store.getState().profile.resumeUploaded).toBe(true);
      expect(store.getState().profile.candidateId).toBe('user-1');
    });

    // Interview coach button should NOT be disabled
    expect(screen.getByText('Interview Coach').parent?.props.accessibilityState?.disabled).toBeFalsy();
  });

  it('handles missing AsyncStorage data properly', async () => {
    const store = setupTestStore();

    (AsyncStorage.getItem as jest.Mock).mockImplementation(() => Promise.resolve(null));

    render(
      <Provider store={store}>
        <HomeScreen navigation={mockNavigation} />
      </Provider>
    );

    await waitFor(() => {
      expect(store.getState().profile.resumeUploaded).toBe(false);
    });

    // The text 'Please upload your resume first.' should be visible
    expect(screen.getByText('Please upload your resume first.')).toBeTruthy();
  });
});
