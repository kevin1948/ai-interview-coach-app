/**
 * src/features/mock-interview/mockInterviewApiSlice.ts
 *
 * RTK Query slice for mock interview list and raw result retrieval.
 * Returns raw backend data — no camelCase normalization.
 * Use interviewApiSlice's hooks when the normalized shape is needed.
 *
 * Endpoints: getMockInterviewSessions (query), getMockInterviewResult (query, raw)
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { FULL_API_BASE_URL } from '../constants/apiConfig';

export const mockInterviewApi = createApi({
  reducerPath: 'mockInterviewApi',
  baseQuery: fetchBaseQuery({ baseUrl: FULL_API_BASE_URL }),
  endpoints: (builder) => ({

    getMockInterviewSessions: builder.query<unknown[], string>({
      query: (candidateId) => ({
        url:    `/interviews/sessions?candidate_id=${encodeURIComponent(candidateId)}`,
        method: 'GET', headers: { Accept: 'application/json' },
      }),
      // Guarantee an array even if backend returns a non-array
      transformResponse: (data: unknown): unknown[] =>
        Array.isArray(data) ? data : [],
    }),

    getMockInterviewResult: builder.query<unknown, string>({
      query: (sessionId) => ({
        url:    `/interviews/sessions/${sessionId}/result`,
        method: 'GET', headers: { Accept: 'application/json' },
      }),
    }),
  }),
});

export const {
  useGetMockInterviewSessionsQuery,
  useLazyGetMockInterviewSessionsQuery,
  useGetMockInterviewResultQuery,
  useLazyGetMockInterviewResultQuery,
} = mockInterviewApi;
