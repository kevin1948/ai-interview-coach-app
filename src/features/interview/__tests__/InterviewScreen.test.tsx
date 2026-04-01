import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { act } from 'react-test-renderer';
import * as Speech from 'expo-speech';
import { Alert } from 'react-native';
import InterviewScreen from '../InterviewScreen';
import {
  useLazyStartPracticeQuestionQuery,
  useSubmitPracticeAnswerMutation,
} from '../../session/practiceApiSlice';
import useRealtimeWaveform from '../../audio/useRealtimeWaveform';

// --- MOCKS ---

jest.mock('expo-speech', () => ({
  speak: jest.fn((text, options) => {
    // Immediately invoke the onDone callback if provided
    if (options && options.onDone) {
      options.onDone();
    }
  }),
  stop: jest.fn(),
}));

jest.mock('../../../store/hooks', () => ({
  useAppSelector: jest.fn(() => 'test-candidate-123'),
}));

jest.mock('../../session/practiceApiSlice', () => ({
  useLazyStartPracticeQuestionQuery: jest.fn(),
  useSubmitPracticeAnswerMutation: jest.fn(),
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

describe('InterviewScreen', () => {
  let hookState: any;
  let mockStartWaveform: jest.Mock;
  let mockStopWaveform: jest.Mock;
  let mockStartPractice: jest.Mock;
  let mockSubmitAnswer: jest.Mock;
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

    mockStartPractice = jest.fn();
    (useLazyStartPracticeQuestionQuery as jest.Mock).mockReturnValue([
      mockStartPractice,
    ]);

    mockSubmitAnswer = jest.fn();
    (useSubmitPracticeAnswerMutation as jest.Mock).mockReturnValue([
      mockSubmitAnswer,
    ]);

    mockNavigation = {
      goBack: jest.fn(),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const renderScreen = () => {
    const utils = render(<InterviewScreen navigation={mockNavigation} route={{ params: {} }} />);
    return utils;
  };

  it('1. loads initial question on mount', async () => {
    mockStartPractice.mockResolvedValueOnce({
      data: {
        id: 'q-1',
        text: 'Tell me about yourself.',
      },
    });

    renderScreen();

    expect(mockStartPractice).toHaveBeenCalledWith({ userId: 'test-candidate-123' });
    
    await waitFor(() => {
      expect(screen.getByText('Tell me about yourself.')).toBeTruthy();
    });

    expect(Speech.speak).toHaveBeenCalledWith('Tell me about yourself.', expect.any(Object));
  });

  it('2. successful question submission flow', async () => {
    mockStartPractice.mockResolvedValueOnce({
      data: {
        id: 'q-1',
        text: 'Tell me about yourself.',
      },
    });

    // Mock submission giving feedback & next question
    mockSubmitAnswer.mockResolvedValueOnce({
      data: {
        feedback: 'Good answer!',
        practiceComplete: false,
        nextQuestion: {
          id: 'q-2',
          text: 'What are your strengths?',
        },
      },
    });

    const { rerender } = renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Tell me about yourself.')).toBeTruthy();
    });

    // Tap mic to start recording
    const micButton = screen.getByTestId('mic-button');
    await act(async () => {
      fireEvent.press(micButton);
    });

    expect(mockStartWaveform).toHaveBeenCalled();

    // Re-render because our mocked hook needs to simulate state update manually
    rerender(<InterviewScreen navigation={mockNavigation} route={{ params: {} }} />);

    // Fast-forward fake timer to check if seconds update
    act(() => {
      jest.advanceTimersByTime(2000); // 2 seconds
    });
    
    // Check timer UI if possible. formattedTime formatting is 00:02
    await waitFor(() => {
      expect(screen.getByText('00:02')).toBeTruthy();
    });

    // Tap mic to stop recording
    await act(async () => {
      fireEvent.press(micButton);
    });

    expect(mockStopWaveform).toHaveBeenCalled();
    expect(mockSubmitAnswer).toHaveBeenCalledWith({
      audioUri: 'file:///test/mock.wav',
      userId: 'test-candidate-123',
      questionId: 'q-1',
    });

    // Wait for feedback to be spoken
    await waitFor(() => {
      expect(Speech.speak).toHaveBeenCalledWith('Good answer!', expect.any(Object));
    });
  });

  it('3. progression to next question after submit', async () => {
    mockStartPractice.mockResolvedValueOnce({
      data: { id: 'q-1', text: 'First question text.' },
    });
    mockSubmitAnswer.mockResolvedValueOnce({
      data: {
        practiceComplete: false,
        nextQuestion: { id: 'q-2', text: 'Second question text.' },
      },
    });

    const { rerender } = renderScreen();
    await waitFor(() => expect(screen.getByText('First question text.')).toBeTruthy());

    const micButton = screen.getByTestId('mic-button');
    
    // Start recording
    await act(async () => fireEvent.press(micButton));
    rerender(<InterviewScreen navigation={mockNavigation} route={{ params: {} }} />);

    // Stop recording
    await act(async () => fireEvent.press(micButton));
    
    // Progresses to Q2
    await waitFor(() => {
      expect(screen.getByText('Second question text.')).toBeTruthy();
    });
  });

  it('4. session complete state when practiceComplete is true', async () => {
    mockStartPractice.mockResolvedValueOnce({
      data: { id: 'q-last', text: 'Final question.' },
    });
    mockSubmitAnswer.mockResolvedValueOnce({
      data: {
        feedback: 'Excellent!',
        practiceComplete: true,
      },
    });

    const { rerender } = renderScreen();
    await waitFor(() => expect(screen.getByText('Final question.')).toBeTruthy());

    const micButton = screen.getByTestId('mic-button');
    
    // Start recording
    await act(async () => fireEvent.press(micButton));
    rerender(<InterviewScreen navigation={mockNavigation} route={{ params: {} }} />);

    // Stop recording
    await act(async () => fireEvent.press(micButton));

    await waitFor(() => {
      expect(Speech.speak).toHaveBeenCalledWith(
        'Great job. You have completed your practice session.',
        expect.any(Object)
      );
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Practice Complete',
      expect.any(String),
      expect.any(Array)
    );
  });

  it('5. timer cleanup on unmount', async () => {
    const spyClearInterval = jest.spyOn(global, 'clearInterval');
    
    mockStartPractice.mockResolvedValueOnce({ data: { id: 'q1', text: 'Q1' } });
    const { unmount, rerender } = renderScreen();
    
    await waitFor(() => expect(screen.getByText('Q1')).toBeTruthy());

    // We start the timer by changing isRecording flag
    const micButton = screen.getByTestId('mic-button');
    await act(async () => fireEvent.press(micButton));
    rerender(<InterviewScreen navigation={mockNavigation} route={{ params: {} }} />);

    unmount();
    
    expect(spyClearInterval).toHaveBeenCalled();
    expect(Speech.stop).toHaveBeenCalled();
    spyClearInterval.mockRestore();
  });

  it('6. replay question triggering speech again', async () => {
    mockStartPractice.mockResolvedValueOnce({
      data: { id: 'q-1', text: 'Tell me about yourself.' },
    });

    renderScreen();
    await waitFor(() => {
      expect(screen.getByText('Tell me about yourself.')).toBeTruthy();
    });

    (Speech.speak as jest.Mock).mockClear();

    const replayButton = screen.getByTestId('replay-button');
    await act(async () => {
      fireEvent.press(replayButton);
    });

    expect(Speech.speak).toHaveBeenCalledWith(
      'Tell me about yourself.',
      expect.any(Object)
    );
  });

  it('7. handles start session failure correctly', async () => {
    mockStartPractice.mockResolvedValueOnce({
      error: { data: { message: 'Failed to connect to AI' } },
    });

    renderScreen();

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to connect to AI'
      );
    });

    // Speaking does not begin
    expect(Speech.speak).not.toHaveBeenCalled();

    // UI remains interactive
    expect(screen.getByText('Session failed.')).toBeTruthy();
  });

  it('8. handles answer submission failure correctly', async () => {
    mockStartPractice.mockResolvedValueOnce({
      data: { id: 'q-1', text: 'Tell me about yourself.' },
    });

    // Submitting gives an error
    mockSubmitAnswer.mockResolvedValueOnce({
      error: { data: { message: 'Audio upload failed' } },
    });

    const { rerender } = renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Tell me about yourself.')).toBeTruthy();
    });

    const micButton = screen.getByTestId('mic-button');

    // Start recording
    await act(async () => fireEvent.press(micButton));
    rerender(<InterviewScreen navigation={mockNavigation} route={{ params: {} }} />);

    // Stop recording and trigger submit
    await act(async () => fireEvent.press(micButton));

    await waitFor(() => {
      expect(mockSubmitAnswer).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Audio upload failed'
      );
    });

    // Question index remains (question text matches)
    expect(screen.getByText('Tell me about yourself.')).toBeTruthy();
    expect(screen.getByText('Failed to process answer.')).toBeTruthy();
  });

  it('9. prevents state update if unmounted during initialization', async () => {
    let resolvePromise: any;
    const promise = new Promise(resolve => { resolvePromise = resolve; });
    mockStartPractice.mockReturnValueOnce(promise);

    const { unmount } = renderScreen();

    // Unmount before the API responds
    unmount();

    // Now resolve the API call
    await act(async () => {
      resolvePromise({ data: { id: 'q-1', text: 'Delayed question.' } });
    });

    // Speech.speak would normally be called, but shouldn't be because of mountedRef loop break
    expect(Speech.speak).not.toHaveBeenCalled();
  });

  it('10. prevents state update if unmounted during submission error', async () => {
    mockStartPractice.mockResolvedValueOnce({
      data: { id: 'q-1', text: 'First question text.' },
    });

    let resolvePromise: any;
    const promise = new Promise(resolve => { resolvePromise = resolve; });
    mockSubmitAnswer.mockReturnValueOnce(promise);

    const { unmount, rerender } = renderScreen();
    await waitFor(() => expect(screen.getByText('First question text.')).toBeTruthy());

    const micButton = screen.getByTestId('mic-button');
    await act(async () => fireEvent.press(micButton));
    rerender(<InterviewScreen navigation={mockNavigation} route={{ params: {} }} />);

    // Stop recording, triggers submit
    fireEvent.press(micButton);

    await waitFor(() => {
      expect(mockSubmitAnswer).toHaveBeenCalled();
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
