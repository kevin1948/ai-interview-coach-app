/**
 * src/features/resume/resumeApiSlice.ts
 *
 * RTK Query slice for resume operations.
 * Endpoints: uploadResume (mutation), parseResume (query)
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { USE_MOCK_API, API_BASE_URL } from '../constants/apiConfig';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UploadResumeArg {
  file: { uri: string | File; name?: string; type?: string };
  userId?: string;
}

// ── Mock data ────────────────────────────────────────────────────────────────

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const MOCK_UPLOAD_RESPONSE = {
  user_id: 'mock-user-123',
  resume: {
    id: 'mock-resume-456',
    filename: 'resume.pdf',
    parsed_data: {
      name: 'Kevin Joshua',
      email: 'kevin@example.com',
      phone: '+91 9876543210',
      skills: ['React Native', 'Java', 'DSA', 'JavaScript'],
      education: 'B.E. Computer Science Engineering',
    },
  },
};

// ── Slice ─────────────────────────────────────────────────────────────────────

export const resumeApi = createApi({
  reducerPath: 'resumeApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
  endpoints: (builder) => ({

    uploadResume: builder.mutation<unknown, UploadResumeArg>({
      queryFn: async ({ file, userId = '' }, _api, _extraOptions, baseQuery) => {
        if (USE_MOCK_API) {
          await wait(1000);
          return {
            data: {
              ...MOCK_UPLOAD_RESPONSE,
              resume: { ...MOCK_UPLOAD_RESPONSE.resume, filename: file?.name ?? 'resume.pdf' },
            },
          };
        }

        try {
          const formData = new FormData();
          // React Native FormData accepts { uri, name, type } — cast required for TS
          formData.append('file', {
            uri:  file.uri,
            name: file.name ?? 'resume.pdf',
            type: 'application/pdf',
          } as unknown as Blob);

          const path = userId
            ? `/api/resume/upload?user_id=${encodeURIComponent(String(userId))}`
            : '/api/resume/upload';

          const result = await baseQuery({
            url: path, method: 'POST', body: formData,
            headers: { Accept: 'application/json' },
          });

          if (result.error) return { error: result.error };
          return { data: result.data };
        } catch (err) {
          return { error: { status: 'FETCH_ERROR' as const, error: String(err) } };
        }
      },
    }),

    parseResume: builder.query<unknown, string>({
      query: (resumeId) => `/api/resume/parse/${resumeId}`,
    }),
  }),
});

export const {
  useUploadResumeMutation,
  useParseResumeQuery,
  useLazyParseResumeQuery,
} = resumeApi;
