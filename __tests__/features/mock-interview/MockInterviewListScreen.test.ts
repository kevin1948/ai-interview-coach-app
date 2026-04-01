import { mapBackendSessionToUi, BackendSession } from '../../../src/screens/MockInterviewListScreen';

describe('MockInterviewListScreen mapping logic', () => {
  it('maps complete session correctly', () => {
    const backendData: BackendSession = {
      session_id: 'sess-123',
      response_count: 5,
      created_at: '2023-10-25T10:00:00Z',
      status: 'completed',
    };

    const uiSession = mapBackendSessionToUi(backendData);

    expect(uiSession).toEqual({
      id: 'sess-123',
      title: 'Mock Interview Session',
      date: '2023-10-25T10:00:00Z',
      questionsAnswered: 5,
      totalQuestions: 15,
      status: 'completed',
      score: null,
      rawStatus: 'completed',
    });
  });

  it('maps incomplete session correctly and handles missing fields gracefully', () => {
    const backendData: BackendSession = {
      session_id: 'sess-456',
      // response_count missing
      // created_at missing
      status: 'in_progress',
    };

    const uiSession = mapBackendSessionToUi(backendData);

    expect(uiSession).toEqual({
      id: 'sess-456',
      title: 'Mock Interview Session',
      date: '',
      questionsAnswered: 0,
      totalQuestions: 15,
      status: 'incomplete', // Non-completed statuses fallback to 'incomplete'
      score: null,
      rawStatus: 'in_progress',
    });
  });

  it('handles null/undefined gracefully', () => {
    // @ts-ignore
    const uiSession = mapBackendSessionToUi(null);

    expect(uiSession).toEqual({
      id: '',
      title: 'Mock Interview Session',
      date: '',
      questionsAnswered: 0,
      totalQuestions: 15,
      status: 'incomplete',
      score: null,
      rawStatus: '',
    });
  });
});
