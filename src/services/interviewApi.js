import { Platform } from "react-native";
import {
  USE_MOCK_API,
  FULL_API_BASE_URL,
  API_BASE_URL,
} from "../config/apiConfig";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const MOCK_QUESTIONS = [
  { id: "q1", text: "Tell me about yourself.", options: [] },
  { id: "q2", text: "Why do you want to join this company?", options: [] },
];

const mockSessionStore = {};

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

const handleNetworkError = (error) => {
  console.error("Interview API error:", error);

  if (
    error instanceof TypeError &&
    (error.message.includes("Failed to fetch") ||
      error.message.includes("Network request failed"))
  ) {
    throw new Error(
      "Cannot connect to server. Please ensure the backend is running at " +
        API_BASE_URL
    );
  }

  throw error;
};

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
  };
};

const normalizeQuestion = (question) => {
  if (!question) return null;

  return {
    id: question.id ?? "",
    text: question.text ?? "",
    options: Array.isArray(question.options) ? question.options : [],
    difficulty: question.difficulty ?? "",
    skillId: question.skill_id ?? "",
  };
};

const normalizeStartSessionResponse = (data) => {
  return {
    sessionId: data.session_id ?? "",
    status: data.status ?? "",
    currentQuestion: normalizeQuestion(data.current_question),
  };
};

const normalizeSubmitAnswerResponse = (data) => {
  return {
    sessionComplete: Boolean(data.session_complete),
    nextQuestion: normalizeQuestion(data.next_question),
    transcription: data.transcription ?? "",
    confidenceScore:
      typeof data.confidence_score === "number" ? data.confidence_score : null,
  };
};

const startInterviewSessionMock = async ({ candidateId }) => {
  await wait(800);

  const sessionId = `mock-session-${Date.now()}`;
  mockSessionStore[sessionId] = {
    currentIndex: 0,
    userId: candidateId,
  };

  return {
    sessionId,
    status: "in_progress",
    currentQuestion: MOCK_QUESTIONS[0],
  };
};

const submitInterviewAnswerMock = async ({ sessionId }) => {
  await wait(900);

  const session = mockSessionStore[sessionId];
  if (!session) throw new Error("Mock session not found.");

  const nextIndex = session.currentIndex + 1;
  session.currentIndex = nextIndex;

  if (nextIndex >= MOCK_QUESTIONS.length) {
    return {
      sessionComplete: true,
      nextQuestion: null,
      transcription: "Mock transcription",
      confidenceScore: 0.91,
    };
  }

  return {
    sessionComplete: false,
    nextQuestion: MOCK_QUESTIONS[nextIndex],
    transcription: "Mock transcription",
    confidenceScore: 0.88,
  };
};

const getInterviewFeedbackMock = async (sessionId) => {
  await wait(500);

  return {
    session_id: sessionId,
    feedback: "Good communication. Improve structure and examples.",
  };
};

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

export const submitInterviewAnswer = async ({
  audioUri,
  sessionId,
  answerText = "",
}) => {
  if (USE_MOCK_API) {
    return submitInterviewAnswerMock({ sessionId });
  }

  try {
    const formData = new FormData();

    if (answerText) {
      formData.append("user_answer", answerText);
    }

    if (audioUri) {
      const { file, fileName } = await getAudioFileForUpload(audioUri);

      if (Platform.OS === "web") {
        formData.append("file", file, fileName);
      } else {
        formData.append("file", file);
      }
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