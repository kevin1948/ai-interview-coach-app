/**
 * src/types/mockInterview.ts
 *
 * Shared, stable types for the mock interview feature.
 *
 * ── What lives here ──────────────────────────────────────────────────────────
 *
 *   SessionParam              — the serialised session object passed between
 *                               MockInterviewListScreen → route params →
 *                               MockInterviewResultScreen.
 *
 *   NormalizedInterviewQuestion   ┐
 *   NormalizedInterviewSession    │  camelCase shapes produced by
 *   NormalizedInterviewResponse   │  interviewApiSlice normalizers and
 *   NormalizedInterviewResult     ┘  consumed by MockInterviewScreen.
 *
 * ── What does NOT live here ──────────────────────────────────────────────────
 *
 *   BackendSession / BackendResponseItem / BackendResultPayload
 *     — raw snake_case API shapes, internal to their single consumer.
 *
 *   NormalizedCategory / NormalizedFeedbackItem / NormalizedQuestion /
 *   NormalizedResult (MockInterviewResultScreen's UI models)
 *     — derived purely inside MockInterviewResultScreen.tsx; no other
 *       screen reads them.
 *
 *   UiSession (MockInterviewListScreen)
 *     — produced and consumed in a single screen; not yet shared.
 *
 *   Route / Props interfaces (MockInterviewRouteParams, Props, etc.)
 *     — unique per screen; no cross-screen sharing.
 *
 *   StartInterviewSessionArg / SubmitMockInterviewAudioArg
 *     — slice-internal arg types, not meaningful outside the slice.
 */

// ── Session navigation param ─────────────────────────────────────────────────

/**
 * The session descriptor serialised by MockInterviewListScreen into route
 * params and deserialised by the result route wrapper before being passed to
 * MockInterviewResultScreen as route.params.session.
 *
 * All fields are optional because:
 *  - The route wrapper deserialises from a JSON string and guards with a
 *    type-narrowing check, so the object may be empty on parse failure.
 *  - MockInterviewResultScreen reads each field defensively with || fallbacks.
 */
export interface SessionParam {
  id?:     string;
  title?:  string;
  date?:   string;
  status?: string;
}

// ── Normalised interview session types ────────────────────────────────────────

/**
 * A single practice/mock interview question produced by the
 * interviewApiSlice normalizer from the backend's snake_case shape.
 */
export interface NormalizedInterviewQuestion {
  id:         string;
  text:       string;
  difficulty: string;
  skillId:    string;
}

/**
 * The full session payload returned by startInterviewSession, containing
 * the server-assigned sessionId and the ordered question list.
 */
export interface NormalizedInterviewSession {
  sessionId: string;
  questions: NormalizedInterviewQuestion[];
}

/**
 * Per-question result entry inside a completed session result.
 * confidenceScore and isCorrect are nullable because the backend may omit
 * them for unanswered or errored questions.
 */
export interface NormalizedInterviewResponse {
  questionText:    string;
  userAnswer:      string;
  confidenceScore: number | null;
  isCorrect:       boolean | null;
  feedback:        string;
}

/**
 * The full result payload returned by getMockInterviewResult after a session
 * is submitted.  gapAnalysis is the primary free-text feedback spoken aloud
 * and displayed in the completed-session UI.
 */
export interface NormalizedInterviewResult {
  sessionId:   string;
  status:      string;
  gapAnalysis: string;
  responses:   NormalizedInterviewResponse[];
}
