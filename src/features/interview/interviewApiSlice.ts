/**
 * src/features/interview/interviewApiSlice.ts
 *
 * RTK Query slice for mock interview session operations.
 * Endpoints: startInterviewSession, submitMockInterviewAudio, getMockInterviewResult
 *
 * getMockInterviewResult here returns the NORMALIZED (camelCase) shape.
 * Use mockInterviewApiSlice's hook when raw backend data is needed.
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Platform } from 'react-native';
import { FULL_API_BASE_URL } from '../../config/apiConfig';
import type {
  NormalizedInterviewQuestion,
  NormalizedInterviewSession,
  NormalizedInterviewResponse,
  NormalizedInterviewResult,
} from '../../types/mockInterview';

// ── Types ─────────────────────────────────────────────────────────────────────

// Shared types live in src/types/mockInterview.ts.
// Re-exported here so existing imports from this slice continue to work.
export type {
  NormalizedInterviewQuestion,
  NormalizedInterviewSession,
  NormalizedInterviewResponse,
  NormalizedInterviewResult,
} from '../../types/mockInterview';

interface StartInterviewSessionArg { candidateId: string; }
interface SubmitMockInterviewAudioArg { audioUri: string; sessionId: string; }

// ── Normalizers ──────────────────────────────────────────────────────────────

const normalizeQuestion = (q: Record<string, unknown>): NormalizedInterviewQuestion => ({
  id:         String(q['id']         ?? ''),
  text:       String(q['text']       ?? ''),
  difficulty: String(q['difficulty'] ?? ''),
  skillId:    String(q['skill_id']   ?? ''),
});

const normalizeStartSessionResponse = (data: Record<string, unknown>): NormalizedInterviewSession => ({
  sessionId: String(data['session_id'] ?? ''),
  questions: Array.isArray(data['questions'])
    ? (data['questions'] as Record<string, unknown>[]).map(normalizeQuestion)
    : [],
});

const normalizeMockInterviewResult = (data: Record<string, unknown>): NormalizedInterviewResult => ({
  sessionId:   String(data['session_id']   ?? ''),
  status:      String(data['status']       ?? ''),
  gapAnalysis: String(data['gap_analysis'] ?? ''),
  responses:   Array.isArray(data['responses'])
    ? (data['responses'] as Record<string, unknown>[]).map((item) => ({
        questionText:    String(item['question_text']   ?? ''),
        userAnswer:      String(item['user_answer']     ?? ''),
        confidenceScore: typeof item['confidence_score'] === 'number' ? item['confidence_score'] : null,
        isCorrect:       typeof item['is_correct']       === 'boolean' ? item['is_correct']       : null,
        feedback:        String(item['feedback']         ?? ''),
      }))
    : [],
});

// ── Audio helper ─────────────────────────────────────────────────────────────

const getAudioFileForUpload = async (audioUri: string) => {
  if (!audioUri) throw new Error('No audio URI found.');

  if (Platform.OS === 'web') {
    const blob = await (await fetch(audioUri)).blob();
    return { file: blob as Blob, fileName: 'mock_session.webm', isBlob: true };
  }

  const lower = audioUri.toLowerCase();
  let mimeType = 'audio/m4a';
  let fileName = 'mock_session.m4a';

  if      (lower.endsWith('.wav'))  { mimeType = 'audio/wav';   fileName = 'mock_session.wav'; }
  else if (lower.endsWith('.mp3'))  { mimeType = 'audio/mpeg';  fileName = 'mock_session.mp3'; }
  else if (lower.endsWith('.aac'))  { mimeType = 'audio/aac';   fileName = 'mock_session.aac'; }
  else if (lower.endsWith('.caf'))  { mimeType = 'audio/x-caf'; fileName = 'mock_session.caf'; }
  else if (lower.endsWith('.webm')) { mimeType = 'audio/webm';  fileName = 'mock_session.webm'; }

  return { file: { uri: audioUri, name: fileName, type: mimeType }, fileName, isBlob: false };
};

// ── Slice ─────────────────────────────────────────────────────────────────────

export const interviewApi = createApi({
  reducerPath: 'interviewApi',
  baseQuery: fetchBaseQuery({ baseUrl: FULL_API_BASE_URL }),
  endpoints: (builder) => ({

    startInterviewSession: builder.mutation<NormalizedInterviewSession, StartInterviewSessionArg>({
      query: ({ candidateId }) => ({
        url: '/interviews/sessions', method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: { user_id: String(candidateId) },
      }),
      transformResponse: (data: unknown) =>
        normalizeStartSessionResponse(data as Record<string, unknown>),
    }),

    submitMockInterviewAudio: builder.mutation<unknown, SubmitMockInterviewAudioArg>({
      queryFn: async ({ audioUri, sessionId }, _api, _extraOptions, baseQuery) => {
        try {
          const formData = new FormData();
          const audioFile = await getAudioFileForUpload(audioUri);
          if (audioFile.isBlob) {
            formData.append('file', audioFile.file as Blob, audioFile.fileName);
          } else {
            formData.append('file', audioFile.file as unknown as Blob);
          }
          const result = await baseQuery({
            url: `/interviews/sessions/${sessionId}/answer`, method: 'POST',
            body: formData, headers: { Accept: 'application/json' },
          });
          if (result.error) return { error: result.error };
          return { data: result.data };
        } catch (err) {
          return { error: { status: 'FETCH_ERROR' as const, error: String(err) } };
        }
      },
    }),

    getMockInterviewResult: builder.query<NormalizedInterviewResult, string>({
      query: (sessionId) => ({
        url: `/interviews/sessions/${sessionId}/result`,
        method: 'GET', headers: { Accept: 'application/json' },
      }),
      transformResponse: (data: unknown) =>
        normalizeMockInterviewResult(data as Record<string, unknown>),
    }),
  }),
});

export const {
  useStartInterviewSessionMutation,
  useSubmitMockInterviewAudioMutation,
  useGetMockInterviewResultQuery,
  useLazyGetMockInterviewResultQuery,
} = interviewApi;
