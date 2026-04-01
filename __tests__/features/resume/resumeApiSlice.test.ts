import { configureStore } from '@reduxjs/toolkit';
import { resumeApi } from '../../../src/services/resumeApiSlice';
import * as apiConfig from '../../../src/constants/apiConfig';

jest.mock('../../../src/constants/apiConfig', () => ({
  USE_MOCK_API: true,
  API_BASE_URL: 'http://localhost:8000',
}));

describe('resumeApiSlice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        [resumeApi.reducerPath]: resumeApi.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(resumeApi.middleware),
    });
  });

  afterEach(() => {
    // Clear data after each test
    store.dispatch(resumeApi.util.resetApiState());
  });

  it('uploadResume returns mocked success response when USE_MOCK_API is true', async () => {
    const file = { uri: 'file://fake/path/resume.pdf', name: 'resume.pdf' };
    
    // Dispatch the mutation trigger
    const action = await store.dispatch(resumeApi.endpoints.uploadResume.initiate({ file }));
    
    expect(action.data).toMatchObject({
      user_id: 'mock-user-123',
      resume: {
        id: 'mock-resume-456',
        filename: 'resume.pdf',
      },
    });
  });


});
