import { Platform } from "react-native";
import {
  USE_MOCK_API,
  FULL_API_BASE_URL,
  API_BASE_URL,
} from "../config/apiConfig";

/*
Interview API
Used by Mock Interview flow
Handles:
- startInterviewSession()
- submitInterviewAnswer()
- getInterviewFeedback()
*/

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const MOCK_QUESTIONS = [
  {
    id: "q1",
    text: "Tell me about yourself.",
    options: [],
  },
  {
    id: "q2",
    text: "Why do you want to join this company?",
    options: [],
  },
  {
    id: "q3",
    text: "Describe a challenging project you worked on.",
    options: [],
  },
  {
    id: "q4",
    text: "What are your strengths and weaknesses?",
    options: [],
  },
  {
    id: "q5",
    text: "Where do you see yourself in five years?",
    options: [],
  },
];

const mockSessionStore = {};

/**
 * Common helper to parse JSON safely
 */
const parseJsonSafely = async (response) => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Server returned an invalid JSON response.");
  }
};

/**
 * Common helper for network errors
 */
const handleNetworkError = (error) => {
  console.error("API error:", error);

  if (
    error instanceof TypeError &&
    (error.message.includes("Failed to fetch") ||
      error.message.includes("Network request failed"))
  ) {
    throw new Error(
      "Cannot connect to server. Please ensure the backend is running and API_BASE_URL is correct: " +
        API_BASE_URL
    );
  }

  throw error;
};

/**
 * Get audio file ready for upload (handles web vs native)
 */
const getAudioFileForUpload = async (audioUri) => {
  if (!audioUri) {
    throw new Error("No audio URI found.");
  }

  if (Platform.OS === "web") {
    const blobResponse = await fetch(audioUri);
    const blob = await blobResponse.blob();

    return {
      file: blob,
      fileName: "answer.webm",
      mimeType: blob.type || "audio/webm",
    };
  }

  const lowerUri = audioUri.toLowerCase();

  let mimeType = "audio/m4a";
  let fileName = "answer.m4a";

  if (lowerUri.endsWith(".wav")) {
    mimeType = "audio/wav";
    fileName = "answer.wav";
  } else if (lowerUri.endsWith(".mp3")) {
    mimeType = "audio/mpeg";
    fileName = "answer.mp3";
  } else if (lowerUri.endsWith(".aac")) {
    mimeType = "audio/aac";
    fileName = "answer.aac";
  } else if (lowerUri.endsWith(".caf")) {
    mimeType = "audio/x-caf";
    fileName = "answer.caf";
  } else if (lowerUri.endsWith(".webm")) {
    mimeType = "audio/webm";
    fileName = "answer.webm";
  }

  return {
    file: {
      uri: audioUri,
      name: fileName,
      type: mimeType,
    },
    fileName,
    mimeType,
  };
};

/**
 * Normalize backend question object
 */
const normalizeQuestion = (question) => {
  if (!question) {
    return null;
  }

  return {
    id: question.id ?? "",
    text: question.text ?? "",
    options: Array.isArray(question.options) ? question.options : [],
  };
};

/**
 * Normalize session start response
 */
const normalizeStartSessionResponse = (data) => {
  return {
    sessionId: data.session_id ?? "",
    status: data.status ?? "",
    currentQuestion: normalizeQuestion(data.current_question),
  };
};

/**
 * Normalize answer submit response
 */
const normalizeSubmitAnswerResponse = (data) => {
  return {
    sessionComplete: Boolean(data.session_complete),
    nextQuestion: normalizeQuestion(data.next_question),
    transcription: data.transcription ?? "",
    confidenceScore:
      typeof data.confidence_score === "number" ? data.confidence_score : null,
  };
};

/**
 * MOCK: Start mock interview session
 */
const startInterviewSessionMock = async ({ candidateId }) => {
  await wait(900);

  const sessionId = `mock-session-${Date.now()}`;

  mockSessionStore[sessionId] = {
    userId: String(candidateId || "mock-user"),
    currentIndex: 0,
    answers: [],
    startedAt: new Date().toISOString(),
  };

  return {
    sessionId,
    status: "in_progress",
    currentQuestion: MOCK_QUESTIONS[0],
  };
};

/**
 * MOCK: Submit answer
 */
const submitInterviewAnswerMock = async ({ audioUri, sessionId }) => {
  await wait(1200);

  if (!mockSessionStore[sessionId]) {
    throw new Error("Mock session not found.");
  }

  const session = mockSessionStore[sessionId];

  if (audioUri) {
    session.answers.push({
      questionId: MOCK_QUESTIONS[session.currentIndex]?.id || "",
      audioUri,
      submittedAt: new Date().toISOString(),
    });
  }

  const nextIndex = session.currentIndex + 1;
  session.currentIndex = nextIndex;

  if (nextIndex >= MOCK_QUESTIONS.length) {
    return {
      sessionComplete: true,
      nextQuestion: null,
      transcription: "This is a mock transcription of the final answer.",
      confidenceScore: 0.91,
    };
  }

  return {
    sessionComplete: false,
    nextQuestion: MOCK_QUESTIONS[nextIndex],
    transcription: "This is a mock transcription of your answer.",
    confidenceScore: 0.88,
  };
};

/**
 * MOCK: Final feedback
 */
const getInterviewFeedbackMock = async (sessionId) => {
  await wait(800);

  const session = mockSessionStore[sessionId];

  if (!session) {
    throw new Error("Mock feedback session not found.");
  }

  return {
    session_id: sessionId,
    overall_score: 82,
    summary:
      "Good communication and confidence. Answers were clear, but could be improved with stronger examples and more structured storytelling.",
    strengths: [
      "Good speaking confidence",
      "Clear basic communication",
      "Attempted all questions",
    ],
    improvements: [
      "Use more project-based examples",
      "Answer with STAR structure",
      "Be more precise in strengths and weaknesses",
    ],
    question_feedback: [
      {
        question: "Tell me about yourself.",
        score: 8,
        feedback: "Good introduction, but make it more structured.",
      },
      {
        question: "Why do you want to join this company?",
        score: 8,
        feedback: "Decent answer, but make it company-specific.",
      },
      {
        question: "Describe a challenging project you worked on.",
        score: 9,
        feedback: "Strong answer. Add measurable impact for even better quality.",
      },
      {
        question: "What are your strengths and weaknesses?",
        score: 7,
        feedback: "Good attempt, but weaknesses should include improvement action.",
      },
      {
        question: "Where do you see yourself in five years?",
        score: 9,
        feedback: "Well answered and aligned with growth mindset.",
      },
    ],
  };
};

/**
 * Start mock interview session
 * POST /api/v1/interviews/sessions
 */
export const startInterviewSession = async ({ candidateId }) => {
  if (USE_MOCK_API) {
    return startInterviewSessionMock({ candidateId });
  }

  try {
    const response = await fetch(`${FULL_API_BASE_URL}/interviews/sessions`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: String(candidateId),
      }),
    });

    const data = await parseJsonSafely(response);

    if (!response.ok) {
      throw new Error(data.message || "Failed to start interview session.");
    }

    return normalizeStartSessionResponse(data);
  } catch (error) {
    handleNetworkError(error);
  }
};

/**
 * Submit interview answer
 * POST /api/v1/interviews/sessions/{session_id}/answer
 */
export const submitInterviewAnswer = async ({ audioUri, sessionId }) => {
  if (USE_MOCK_API) {
    return submitInterviewAnswerMock({ audioUri, sessionId });
  }

  try {
    const { file, fileName } = await getAudioFileForUpload(audioUri);

    const formData = new FormData();

    if (Platform.OS === "web") {
      formData.append("audio", file, fileName);
    } else {
      formData.append("audio", file);
    }

    const response = await fetch(
      `${FULL_API_BASE_URL}/interviews/sessions/${sessionId}/answer`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: formData,
      }
    );

    const data = await parseJsonSafely(response);

    if (!response.ok) {
      throw new Error(data.message || "Failed to submit interview answer.");
    }

    return normalizeSubmitAnswerResponse(data);
  } catch (error) {
    handleNetworkError(error);
  }
};

/**
 * Get final feedback
 * GET /api/v1/interviews/sessions/{session_id}/feedback
 */
export const getInterviewFeedback = async (sessionId) => {
  if (USE_MOCK_API) {
    return getInterviewFeedbackMock(sessionId);
  }

  try {
    const response = await fetch(
      `${FULL_API_BASE_URL}/interviews/sessions/${sessionId}/feedback`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    const data = await parseJsonSafely(response);

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch interview feedback.");
    }

    return data;
  } catch (error) {
    handleNetworkError(error);
  }
};