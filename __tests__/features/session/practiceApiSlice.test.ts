import { configureStore } from '@reduxjs/toolkit';
import { practiceApi } from '../../../src/features/session/practiceApiSlice';
import * as apiConfig from '../../../src/config/apiConfig';

jest.mock('../../../src/config/apiConfig', () => ({
  USE_MOCK_API: true,
  FULL_API_BASE_URL: 'http://localhost:8000',
}));

describe('practiceApiSlice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        [practiceApi.reducerPath]: practiceApi.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(practiceApi.middleware),
    });
  });

  afterEach(() => {
    store.dispatch(practiceApi.util.resetApiState());
  });

  it('startPracticeQuestion returns mocked first question when USE_MOCK_API is true', async () => {
    const action = await store.dispatch(practiceApi.endpoints.startPracticeQuestion.initiate({ userId: 'user-1' }));
    
    expect(action.data).toMatchObject({
      id: 'p1',
      text: 'Tell me about yourself.',
      difficulty: 'easy',
      skillId: 'intro',
    });
  });

  it('submitPracticeAnswer returns mocked feedback and next question', async () => {
    const submitArg = { audioUri: 'file://audio.m4a', userId: 'user-1', questionId: 'p1' };
    const action = await store.dispatch(practiceApi.endpoints.submitPracticeAnswer.initiate(submitArg));
    
    expect(action.data).toMatchObject({
      isCorrect: true,
      feedback: 'Good start. Make it more structured.',
      practiceComplete: false,
    });
    
    // Check that nextQuestion is correctly populated
    expect(action.data?.nextQuestion).toMatchObject({
      id: 'p2',
      text: 'Why should we hire you?',
    });
  });
});
