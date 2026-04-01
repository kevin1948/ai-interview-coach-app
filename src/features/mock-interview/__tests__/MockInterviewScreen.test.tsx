import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { act } from 'react-test-renderer';
import * as Speech from 'expo-speech';
import { Alert } from 'react-native';
import MockInterviewScreen from '../MockInterviewScreen';
import {
  useStartInterviewSessionMutation,
  useSubmitMockInterviewAudioMutation,
  useLazyGetMockInterviewResultQuery,
} from '../../interview/interviewApiSlice';
import useRealtimeWaveform from '../../audio/useRealtimeWaveform';

// --- MOCKS ---

jest.mock('expo-speech', () => ({
  speak: jest.fn((text, options) => {
    if (options && options.onDone) {
      options.onDone();
    }
  }),
  stop: jest.fn(),
}));

jest.mock('../../../store/hooks', () => ({
  useAppSelector: jest.fn(() => 'test-candidate-123'),
}));

jest.mock('../../interview/interviewApiSlice', () => ({
  useStartInterviewSessionMutation: jest.fn(),
  useSubmitMockInterviewAudioMutation: jest.fn(),
  useLazyGetMockInterviewResultQuery: jest.fn(),
}));

jest.mock('../../audio/useRealtimeWaveform', () => jest.fn());

jest.mock('../../audio/components/Waveform', () => {
  const { View } = require('react-native');
  return function MockWaveform() {
    return <View testID="waveform" />;
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.spyOn(Alert, 'alert');

describe('MockInterviewScreen', () => {
  let hookState: any;
  let mockStartWaveform: jest.Mock;
  let mockStopWaveform: jest.Mock;
  let mockStartSession: jest.Mock;
  let mockSubmitAudio: jest.Mock;
  let mockGetResult: jest.Mock;
  let mockNavigation: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockStartWaveform = jest.fn(async () => {
      hookState.isRecording = true;
    });

    mockStopWaveform = jest.fn(async () => {
      hookState.isRecording = false;
      return 'file:///test/mock.wav';
    });

    hookState = {
      isRecording: false,
      bars: [],
      start: mockStartWaveform,
      stop: mockStopWaveform,
    };

    (useRealtimeWaveform as jest.Mock).mockImplementation(() => hookState);

    mockStartSession = jest.fn();
    (useStartInterviewSessionMutation as jest.Mock).mockReturnValue([
      mockStartSession,
    ]);

    mockSubmitAudio = jest.fn();
    (useSubmitMockInterviewAudioMutation as jest.Mock).mockReturnValue([
      mockSubmitAudio,
    ]);

    mockGetResult = jest.fn();
    (useLazyGetMockInterviewResultQuery as jest.Mock).mockReturnValue([
      mockGetResult,
    ]);

    mockNavigation = {
      goBack: jest.fn(),
      replace: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  const renderScreen = () => {
    return render(<MockInterviewScreen navigation={mockNavigation} route={{ params: {} }} />);
  };

  it('1. session initialization on mount', async () => {
    mockStartSession.mockResolvedValueOnce({
      data: {
        sessionId: 'session-123',
        questions: [{ text: 'Question 1' }, { text: 'Question 2' }],
      },
    });

    renderScreen();

    expect(mockStartSession).toHaveBeenCalledWith({ candidateId: 'test-candidate-123' });

    await waitFor(() => {
      expect(screen.getByText('Question 1')).toBeTruthy();
    });

    expect(Speech.speak).toHaveBeenCalledWith('Question 1', expect.any(Object));
  });

  it('2. recording start flow', async () => {
    mockStartSession.mockResolvedValueOnce({
      data: {
        sessionId: 'session-123',
        questions: [{ text: 'Question 1' }],
      },
    });

    const { rerender } = renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Question 1')).toBeTruthy();
    });

    const micButton = screen.getByTestId('mic-button');
    await act(async () => {
      fireEvent.press(micButton);
    });

    expect(mockStartWaveform).toHaveBeenCalled();
    
    // Simulate re-render since we manually mutate hookState.isRecording
    rerender(<MockInterviewScreen navigation={mockNavigation} route={{ params: {} }} />);

    expect(screen.getByText('Recording...')).toBeTruthy();
  });

  it('3. auto-stop behavior', async () => {
    mockStartSession.mockResolvedValueOnce({
      data: {
        sessionId: 'session-123',
        questions: [{ text: 'Question 1' }],
      },
    });
    mockSubmitAudio.mockResolvedValueOnce({ data: { success: true } });
    mockGetResult.mockResolvedValueOnce({
      data: { gapAnalysis: 'Auto-stop feedback', responses: [] }
    });

    const { rerender } = renderScreen();

    await waitFor(() => expect(screen.getByText('Question 1')).toBeTruthy());

    const micButton = screen.getByTestId('mic-button');
    await act(async () => {
      fireEvent.press(micButton);
    });

    rerender(<MockInterviewScreen navigation={mockNavigation} route={{ params: {} }} />);

    // Fast-forward fake timers to 295s (AUTO_STOP_SECONDS is 294) to trigger auto-finish.
    // Actually, timer polling is every 250ms with Date.now() comparison.
    // Date.now() should be mocked by jest.useFakeTimers() and jest.advanceTimersByTime()
    await act(async () => {
      jest.advanceTimersByTime(295000); 
    });

    rerender(<MockInterviewScreen navigation={mockNavigation} route={{ params: {} }} />);

    // Auto finish should have triggered submit
    await waitFor(() => {
      expect(mockStopWaveform).toHaveBeenCalled();
      expect(mockSubmitAudio).toHaveBeenCalledWith({
        audioUri: 'file:///test/mock.wav',
        sessionId: 'session-123',
      });
    });
  });

  it('4. manual finish flow', async () => {
    mockStartSession.mockResolvedValueOnce({
      data: {
        sessionId: 'session-123',
        questions: [{ text: 'Question 1' }],
      },
    });
    mockSubmitAudio.mockResolvedValueOnce({ data: { success: true } });
    mockGetResult.mockResolvedValueOnce({
      data: { gapAnalysis: 'Manual finish feedback', responses: [] }
    });

    const { rerender } = renderScreen();

    await waitFor(() => expect(screen.getByText('Question 1')).toBeTruthy());

    const micButton = screen.getByTestId('mic-button');
    await act(async () => fireEvent.press(micButton));
    rerender(<MockInterviewScreen navigation={mockNavigation} route={{ params: {} }} />);

    // Advance to MIN_DURATION_SECONDS (290s) to be able to submit manually
    await act(async () => {
      jest.advanceTimersByTime(290000);
    });
    rerender(<MockInterviewScreen navigation={mockNavigation} route={{ params: {} }} />);

    const submitButton = screen.getByText('Submit Now');
    await act(async () => {
      fireEvent.press(submitButton);
    });

    expect(mockStopWaveform).toHaveBeenCalled();
    expect(mockSubmitAudio).toHaveBeenCalledTimes(1);
    expect(mockSubmitAudio).toHaveBeenCalledWith({
      audioUri: 'file:///test/mock.wav',
      sessionId: 'session-123',
    });
  });

  it('5. result fetch after finish', async () => {
    mockStartSession.mockResolvedValueOnce({
      data: { sessionId: 'session-123', questions: [{ text: 'Question 1' }] },
    });
    mockSubmitAudio.mockResolvedValueOnce({ data: { success: true } });
    mockGetResult.mockResolvedValueOnce({
      data: { gapAnalysis: 'Awesome result analysis', responses: [] }
    });

    const { rerender } = renderScreen();

    await waitFor(() => expect(screen.getByText('Question 1')).toBeTruthy());

    const micButton = screen.getByTestId('mic-button');
    await act(async () => fireEvent.press(micButton));
    rerender(<MockInterviewScreen navigation={mockNavigation} route={{ params: {} }} />);

    await act(async () => { jest.advanceTimersByTime(290000); });
    rerender(<MockInterviewScreen navigation={mockNavigation} route={{ params: {} }} />);

    const submitButton = screen.getByText('Submit Now');
    await act(async () => fireEvent.press(submitButton));

    await waitFor(() => {
      expect(mockGetResult).toHaveBeenCalledWith('session-123');
    });

    await waitFor(() => {
      expect(screen.getByText('Awesome result analysis')).toBeTruthy();
    });
  });

  it('6. practice again flow', async () => {
    mockStartSession.mockResolvedValueOnce({
      data: { sessionId: 'session-123', questions: [{ text: 'Question 1' }] },
    });
    mockSubmitAudio.mockResolvedValueOnce({ data: { success: true } });
    mockGetResult.mockResolvedValueOnce({
      data: { gapAnalysis: 'Awesome result analysis', responses: [] }
    });

    const { rerender } = renderScreen();

    await waitFor(() => expect(screen.getByText('Question 1')).toBeTruthy());

    const micButton = screen.getByTestId('mic-button');
    await act(async () => fireEvent.press(micButton));
    rerender(<MockInterviewScreen navigation={mockNavigation} route={{ params: {} }} />);

    await act(async () => { jest.advanceTimersByTime(290000); });
    rerender(<MockInterviewScreen navigation={mockNavigation} route={{ params: {} }} />);

    const submitButton = screen.getByText('Submit Now');
    await act(async () => fireEvent.press(submitButton));

    await waitFor(() => {
      expect(screen.getByText('Awesome result analysis')).toBeTruthy();
    });

    const practiceAgainButton = screen.getByText('Practice Again');
    await act(async () => fireEvent.press(practiceAgainButton));

    expect(mockNavigation.replace).toHaveBeenCalledWith('MockInterviewSession', {
      sessionTitle: 'New Mock Interview',
    });
  });

  it('7. cleanup on unmount', async () => {
    const spyClearInterval = jest.spyOn(global, 'clearInterval');

    mockStartSession.mockResolvedValueOnce({
      data: { sessionId: 'session-123', questions: [{ text: 'Question 1' }] }
    });

    const { unmount, rerender } = renderScreen();

    await waitFor(() => expect(screen.getByText('Question 1')).toBeTruthy());

    const micButton = screen.getByTestId('mic-button');
    await act(async () => fireEvent.press(micButton));
    rerender(<MockInterviewScreen navigation={mockNavigation} route={{ params: {} }} />);

    unmount();

    expect(spyClearInterval).toHaveBeenCalled();
    expect(Speech.stop).toHaveBeenCalled();
    spyClearInterval.mockRestore();
  });

  it('8. handles start session failure correctly', async () => {
    mockStartSession.mockResolvedValueOnce({
      error: { data: { message: 'Initialization failed' } },
    });

    renderScreen();

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Initialization failed'
      );
    });

    expect(screen.getByText('Session failed.')).toBeTruthy();

    const micButton = screen.getByTestId('mic-button');
    // It should be disabled
    expect(micButton.props.accessibilityState?.disabled ?? micButton.props.disabled).toBe(true);
  });

  it('9. handles audio submission failure correctly', async () => {
    mockStartSession.mockResolvedValueOnce({
      data: { sessionId: 'session-123', questions: [{ text: 'Question 1' }] },
    });
    mockSubmitAudio.mockResolvedValueOnce({
      error: { data: { message: 'Upload timeout' } },
    });

    const { rerender } = renderScreen();

    await waitFor(() => expect(screen.getByText('Question 1')).toBeTruthy());

    const micButton = screen.getByTestId('mic-button');
    await act(async () => fireEvent.press(micButton));
    rerender(<MockInterviewScreen navigation={mockNavigation} route={{ params: {} }} />);

    await act(async () => { jest.advanceTimersByTime(290000); });
    rerender(<MockInterviewScreen navigation={mockNavigation} route={{ params: {} }} />);

    const submitButton = screen.getByText('Submit Now');
    await act(async () => fireEvent.press(submitButton));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Upload timeout'
      );
    });

    // Result fetch not triggered
    expect(mockGetResult).not.toHaveBeenCalled();

    // UI remains stable (still shows Question 1)
    expect(screen.getByText('Question 1')).toBeTruthy();
  });

  it('10. prevents state update if unmounted during initialization', async () => {
    let resolvePromise: any;
    const promise = new Promise(resolve => { resolvePromise = resolve; });
    mockStartSession.mockReturnValueOnce(promise);

    const { unmount } = renderScreen();

    // Unmount before the API responds
    unmount();

    // Now resolve the API call
    await act(async () => {
      resolvePromise({ data: { sessionId: 'session-123', questions: [{ text: 'Question 1' }] } });
    });

    // Speech.speak would normally be called with the question text, but shouldn't be because of mountedRef loop break
    expect(Speech.speak).not.toHaveBeenCalled();
  });

  it('11. prevents state update if unmounted during submission error', async () => {
    mockStartSession.mockResolvedValueOnce({
      data: { sessionId: 'session-123', questions: [{ text: 'Question 1' }] },
    });

    let resolvePromise: any;
    const promise = new Promise(resolve => { resolvePromise = resolve; });
    mockSubmitAudio.mockReturnValueOnce(promise);

    const { unmount, rerender } = renderScreen();
    await waitFor(() => expect(screen.getByText('Question 1')).toBeTruthy());

    const micButton = screen.getByTestId('mic-button');
    await act(async () => fireEvent.press(micButton));
    rerender(<MockInterviewScreen navigation={mockNavigation} route={{ params: {} }} />);

    await act(async () => { jest.advanceTimersByTime(290000); });
    rerender(<MockInterviewScreen navigation={mockNavigation} route={{ params: {} }} />);

    const submitButton = screen.getByText('Submit Now');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockSubmitAudio).toHaveBeenCalled();
    });

    // While submitting, unmount the screen
    unmount();

    // Resolve with an error
    await act(async () => {
      resolvePromise({ error: { data: { message: 'Delayed error' } } });
    });

    // Alert.alert should NOT be called due to mountedRef check after error
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});
