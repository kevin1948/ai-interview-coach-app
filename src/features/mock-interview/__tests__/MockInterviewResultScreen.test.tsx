import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import MockInterviewResultScreen from '../MockInterviewResultScreen';
import { useLazyGetMockInterviewResultQuery } from '../mockInterviewApiSlice';

jest.mock('../mockInterviewApiSlice', () => ({
  useLazyGetMockInterviewResultQuery: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.spyOn(Alert, 'alert');

describe('MockInterviewResultScreen Error Paths', () => {
  let mockGetResult: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetResult = jest.fn();
    (useLazyGetMockInterviewResultQuery as jest.Mock).mockReturnValue([mockGetResult]);
  });

  it('handles fetch failure gracefully', async () => {
    mockGetResult.mockResolvedValueOnce({
      error: { data: { message: 'Internal Server Error' } },
    });

    render(<MockInterviewResultScreen route={{ params: { session: { id: 'session-123', title: 'Test Session' } } }} navigation={{ navigate: jest.fn() } as any} />);

    // Initially loading
    expect(screen.getByText('Loading interview analysis...')).toBeTruthy();

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Internal Server Error'
      );
    });

    // Loading should disappear, fallback UI (the empty result screen with 0%) should appear without crashing
    expect(screen.queryByText('Loading interview analysis...')).toBeNull();
    
    // Overall performance title should be visible
    expect(screen.getByText('Overall Performance')).toBeTruthy();
    
    // The empty/default UI uses 0 answers
    expect(screen.getByText('Based on 0 questions answered')).toBeTruthy();
  });
});
