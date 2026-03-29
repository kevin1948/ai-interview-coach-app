import { Platform } from "react-native";
import {
  USE_MOCK_API,
  FULL_API_BASE_URL,
  API_BASE_URL,
} from "../config/apiConfig";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseJsonSafely = async (response) => {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return text;
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
      "Cannot connect to backend. Ensure server running at:\n" +
        FULL_API_BASE_URL
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
      fileName: "mock_session.webm",
      mimeType: blob.type || "audio/webm",
    };
  }

  const lowerUri = audioUri.toLowerCase();

  let mimeType = "audio/m4a";
  let fileName = "mock_session.m4a";

  if (lowerUri.endsWith(".wav")) {
    mimeType = "audio/wav";
    fileName = "mock_session.wav";
  } else if (lowerUri.endsWith(".mp3")) {
    mimeType = "audio/mpeg";
    fileName = "mock_session.mp3";
  } else if (lowerUri.endsWith(".aac")) {
    mimeType = "audio/aac";
    fileName = "mock_session.aac";
  } else if (lowerUri.endsWith(".caf")) {
    mimeType = "audio/x-caf";
    fileName = "mock_session.caf";
  } else if (lowerUri.endsWith(".webm")) {
    mimeType = "audio/webm";
    fileName = "mock_session.webm";
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

const normalizeQuestion = (question) => ({
  id: question.id ?? "",
  text: question.text ?? "",
  difficulty: question.difficulty ?? "",
  skillId: question.skill_id ?? "",
});

const normalizeStartSessionResponse = (data) => ({
  sessionId: data.session_id ?? "",
  questions: Array.isArray(data.questions)
    ? data.questions.map(normalizeQuestion)
    : [],
});

const normalizeMockInterviewResult = (data) => ({
  sessionId: data.session_id ?? "",
  status: data.status ?? "",
  gapAnalysis: data.gap_analysis ?? "",
  responses: Array.isArray(data.responses)
    ? data.responses.map((item) => ({
        questionText: item.question_text ?? "",
        userAnswer: item.user_answer ?? "",
        confidenceScore:
          typeof item.confidence_score === "number"
            ? item.confidence_score
            : null,
        isCorrect:
          typeof item.is_correct === "boolean"
            ? item.is_correct
            : null,
        feedback: item.feedback ?? "",
      }))
    : [],
});

/*
==============================
START MOCK SESSION
==============================
*/

export const startInterviewSession = async ({ candidateId }) => {
  try {
    const response = await fetch(
      `${FULL_API_BASE_URL}/interviews/sessions`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: String(candidateId),
        }),
      }
    );

    const data = await parseJsonSafely(response);

    if (!response.ok) {
      throw new Error(
        data?.detail ||
          data?.message ||
          "Failed to start mock interview session."
      );
    }

    return normalizeStartSessionResponse(data);
  } catch (error) {
    handleNetworkError(error);
  }
};

/*
==============================
UPLOAD MOCK AUDIO
==============================
*/

export const submitMockInterviewAudio = async ({
  audioUri,
  sessionId,
}) => {
  try {
    const formData = new FormData();

    const { file, fileName, mimeType } =
      await getAudioFileForUpload(audioUri);

    console.log("Uploading audio:", {
      sessionId,
      audioUri,
      fileName,
      mimeType,
      platform: Platform.OS,
    });

    if (Platform.OS === "web") {
      formData.append("file", file, fileName);
    } else {
      formData.append("file", {
        uri: file.uri,
        name: file.name,
        type: file.type,
      });
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

    const rawText = await response.text();

    console.log("UPLOAD STATUS:", response.status);
    console.log("UPLOAD RESPONSE:", rawText);

    let parsed = {};

    try {
      parsed = rawText ? JSON.parse(rawText) : {};
    } catch {
      parsed = rawText;
    }

    if (!response.ok) {
      if (parsed?.detail) {
        throw new Error(JSON.stringify(parsed.detail));
      }

      if (parsed?.message) {
        throw new Error(parsed.message);
      }

      throw new Error(`Upload failed (${response.status})`);
    }

    return parsed;
  } catch (error) {
    handleNetworkError(error);
  }
};

/*
==============================
FETCH RESULT
==============================
*/

export const getMockInterviewResult = async (sessionId) => {
  try {
    const response = await fetch(
      `${FULL_API_BASE_URL}/interviews/sessions/${sessionId}/result`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    const data = await parseJsonSafely(response);

    if (!response.ok) {
      throw new Error(
        data?.detail ||
          data?.message ||
          "Failed to fetch mock interview result."
      );
    }

    return normalizeMockInterviewResult(data);
  } catch (error) {
    handleNetworkError(error);
  }
};