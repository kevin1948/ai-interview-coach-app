/**
 * src/features/session/practiceApiSlice.ts
 *
 * RTK Query slice for interview practice session.
 * Endpoints: startPracticeQuestion (lazy query), submitPracticeAnswer (mutation)
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Platform } from 'react-native';
import { USE_MOCK_API, FULL_API_BASE_URL } from '../../config/apiConfig';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NormalizedQuestion {
  id:         string;
  text:       string;
  options:    unknown[];
  difficulty: string;
  skillId:    string;
}

export interface NormalizedAnswerResponse {
  isCorrect:        boolean;
  feedback:         string;
  nextQuestion:     NormalizedQuestion | null;
  practiceComplete: boolean;
}

interface StartPracticeArg {
  userId:      string;
  difficulty?: string;
}

interface SubmitPracticeAnswerArg {
  audioUri:    string;
  userId:      string;
  questionId:  string;
  answerText?: string;
}

// ── Normalizers ──────────────────────────────────────────────────────────────

const normalizeQuestion = (
  q: Record<string, unknown> | null | undefined,
): NormalizedQuestion | null => {
  if (!q) return null;
  return {
    id:         String(q['id']         ?? ''),
    text:       String(q['text']       ?? ''),
    options:    Array.isArray(q['options']) ? q['options'] : [],
    difficulty: String(q['difficulty'] ?? ''),
    skillId:    String(q['skill_id']   ?? ''),
  };
};

const normalizePracticeAnswerResponse = (
  data: Record<string, unknown>,
): NormalizedAnswerResponse => ({
  isCorrect:        Boolean(data['is_correct']),
  feedback:         String(data['feedback'] ?? ''),
  nextQuestion:     normalizeQuestion(data['next_question'] as Record<string, unknown> | null),
  practiceComplete: Boolean(data['practice_complete']),
});

// ── Mock data ────────────────────────────────────────────────────────────────

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const MOCK_QUESTIONS = [
  { id: 'p1', text: 'Tell me about yourself.', options: [], difficulty: 'easy', skill_id: 'intro' },
  { id: 'p2', text: 'Why should we hire you?',  options: [], difficulty: 'easy', skill_id: 'intro' },
];
const MOCK_FEEDBACK = [
  { feedback: 'Good start. Make it more structured.' },
  { feedback: 'Nice answer. Add stronger proof.' },
];

let _mockPracticeIndex = 0;

// ── Audio helper ─────────────────────────────────────────────────────────────

const getAudioFileForUpload = async (audioUri: string) => {
  if (!audioUri) throw new Error('No audio URI found.');

  if (Platform.OS === 'web') {
    const blob = await (await fetch(audioUri)).blob();
    return { file: blob as Blob, fileName: 'answer.webm', isBlob: true };
  }

  const lower = audioUri.toLowerCase();
  let fileName = 'answer.m4a';
  let mimeType = 'audio/m4a';

  if      (lower.endsWith('.wav'))  { fileName = 'answer.wav';  mimeType = 'audio/wav'; }
  else if (lower.endsWith('.mp3'))  { fileName = 'answer.mp3';  mimeType = 'audio/mpeg'; }
  else if (lower.endsWith('.aac'))  { fileName = 'answer.aac';  mimeType = 'audio/aac'; }
  else if (lower.endsWith('.caf'))  { fileName = 'answer.caf';  mimeType = 'audio/x-caf'; }
  else if (lower.endsWith('.webm')) { fileName = 'answer.webm'; mimeType = 'audio/webm'; }

  return { file: { uri: audioUri, name: fileName, type: mimeType }, fileName, isBlob: false };
};

// ── Slice ─────────────────────────────────────────────────────────────────────

export const practiceApi = createApi({
  reducerPath: 'practiceApi',
  baseQuery: fetchBaseQuery({ baseUrl: FULL_API_BASE_URL }),
  endpoints: (builder) => ({

    startPracticeQuestion: builder.query<NormalizedQuestion | null, StartPracticeArg>({
      queryFn: async ({ userId, difficulty = '' }, _api, _extraOptions, baseQuery) => {
        if (USE_MOCK_API) {
          await wait(500);
          _mockPracticeIndex = 0;
          return { data: normalizeQuestion(MOCK_QUESTIONS[0]) };
        }
        const params = new URLSearchParams();
        params.append('user_id', String(userId));
        if (difficulty) params.append('difficulty', difficulty);

        const result = await baseQuery({
          url: `/practice/questions/start?${params.toString()}`,
          method: 'GET', headers: { Accept: 'application/json' },
        });
        if (result.error) return { error: result.error };
        return { data: normalizeQuestion(result.data as Record<string, unknown>) };
      },
    }),

    submitPracticeAnswer: builder.mutation<NormalizedAnswerResponse, SubmitPracticeAnswerArg>({
      queryFn: async (
        { audioUri, userId, questionId, answerText = '' },
        _api, _extraOptions, baseQuery,
      ) => {
        if (USE_MOCK_API) {
          await wait(800);
          const idx = _mockPracticeIndex;
          const nextIdx = idx + 1;
          const feedbackObj = MOCK_FEEDBACK[idx] ?? { feedback: 'Good attempt.' };
          if (nextIdx >= MOCK_QUESTIONS.length) {
            _mockPracticeIndex = 0;
            return { data: { isCorrect: true, feedback: feedbackObj.feedback, nextQuestion: null, practiceComplete: true } };
          }
          _mockPracticeIndex = nextIdx;
          return {
            data: {
              isCorrect: true, feedback: feedbackObj.feedback,
              nextQuestion: normalizeQuestion(MOCK_QUESTIONS[nextIdx]),
              practiceComplete: false,
            },
          };
        }

        try {
          const formData = new FormData();
          formData.append('user_id',     String(userId));
          formData.append('question_id', String(questionId));
          if (answerText) formData.append('user_answer', answerText);

          if (audioUri) {
            const audioFile = await getAudioFileForUpload(audioUri);
            if (audioFile.isBlob) {
              formData.append('file', audioFile.file as Blob, audioFile.fileName);
            } else {
              formData.append('file', audioFile.file as unknown as Blob);
            }
          }

          const result = await baseQuery({
            url: '/practice/answer', method: 'POST', body: formData,
            headers: { Accept: 'application/json' },
          });
          if (result.error) return { error: result.error };
          return { data: normalizePracticeAnswerResponse(result.data as Record<string, unknown>) };
        } catch (err) {
          return { error: { status: 'FETCH_ERROR' as const, error: String(err) } };
        }
      },
    }),
  }),
});

export const {
  useStartPracticeQuestionQuery,
  useLazyStartPracticeQuestionQuery,
  useSubmitPracticeAnswerMutation,
} = practiceApi;
