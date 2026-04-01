import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ResumeScreen from '../ResumeScreen';
import { useUploadResumeMutation } from '../resumeApiSlice';
import * as DocumentPicker from 'expo-document-picker';

jest.mock('@react-native-async-storage/async-storage', () => ({
  removeItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('../resumeApiSlice', () => ({
  useUploadResumeMutation: jest.fn(),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('../../../store/hooks', () => ({
  useAppDispatch: () => jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

jest.spyOn(Alert, 'alert');

describe('ResumeScreen Error Paths', () => {
  let mockUpload: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpload = jest.fn();
    (useUploadResumeMutation as jest.Mock).mockReturnValue([mockUpload]);
  });

  it('handles ResumeScreen upload failure correctly', async () => {
    // 1. mock DocumentPicker to return a valid pdf
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ name: 'test.pdf', size: 1024, uri: 'file://test.pdf' }],
    });

    // 2. mock mutation to return error
    mockUpload.mockResolvedValueOnce({
      error: { data: { message: 'Network disconnected' } }
    });

    const { getByText } = render(<ResumeScreen navigation={{ navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn(), push: jest.fn() } as any} />);

    // Select file
    await waitFor(() => fireEvent.press(getByText('Upload Resume')));
    
    // Attempt upload
    await waitFor(() => {
      expect(getByText('test.pdf')).toBeTruthy();
    });
    
    // Since "Upload Resume" text is on the upload button as well as the initial screen
    // we just use getAllByText if needed, but getByText 'Upload Resume' on the button works.
    const uploadBtn = getByText('Upload Resume');
    fireEvent.press(uploadBtn);

    // Alert appears
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Upload Failed',
        'Network disconnected'
      );
    });

    // Loading resets (the file is still selected, retry possible)
    expect(getByText('test.pdf')).toBeTruthy();
  });
});
