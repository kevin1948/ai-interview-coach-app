import { Platform } from "react-native";

// Backend API Configuration - Change this to your actual backend URL
const API_BASE_URL = "http://localhost:8000/api/v1";

/**
 * Fetch all mock interview sessions for a user
 * GET /api/v1/interviews/sessions
 */
export const getMockInterviewSessions = async (userId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/interviews/sessions?user_id=${userId}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch interview sessions.");
    }

    return data;
  } catch (error) {
    console.error("Failed to fetch sessions:", error);

    if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
      throw new Error(
        "Cannot connect to server. Please ensure the backend is running."
      );
    }

    throw error;
  }
};

/**
 * Start a new mock interview session
 * POST /api/v1/interviews/sessions
 */
export const startMockInterviewSession = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/interviews/sessions`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: userId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to start interview session.");
    }

    return data;
  } catch (error) {
    console.error("Failed to start session:", error);

    if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
      throw new Error(
        "Cannot connect to server. Please ensure the backend is running."
      );
    }

    throw error;
  }
};

/**
 * Get audio file ready for upload (handles web vs native)
 */
const getAudioFileForUpload = async (audioUri) => {
  if (!audioUri) {
    throw new Error("No audio URI found");
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
 * Submit answer for current question
 * POST /api/v1/interviews/sessions/{session_id}/answer
 */
export const submitMockInterviewAnswer = async ({
  sessionId,
  questionId,
  audioUri,
}) => {
  try {
    const { file } = await getAudioFileForUpload(audioUri);

    const formData = new FormData();

    if (Platform.OS === "web") {
      formData.append("audio", file, "answer.webm");
    } else {
      formData.append("audio", file);
    }

    if (questionId) {
      formData.append("question_id", questionId);
    }

    const response = await fetch(
      `${API_BASE_URL}/interviews/sessions/${sessionId}/answer`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to submit answer.");
    }

    return data;
  } catch (error) {
    console.error("Failed to submit answer:", error);

    if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
      throw new Error(
        "Cannot connect to server. Please ensure the backend is running."
      );
    }

    throw error;
  }
};

/**
 * Get feedback/analysis for a completed session
 * GET /api/v1/interviews/sessions/{session_id}/feedback
 */
export const getMockInterviewFeedback = async (sessionId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/interviews/sessions/${sessionId}/feedback`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch session feedback.");
    }

    return data;
  } catch (error) {
    console.error("Failed to get feedback:", error);

    if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
      throw new Error(
        "Cannot connect to server. Please ensure the backend is running."
      );
    }

    throw error;
  }
};

/**
 * Get session details (for resuming)
 * GET /api/v1/interviews/sessions/{session_id}
 */
export const getMockInterviewSession = async (sessionId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/interviews/sessions/${sessionId}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch session details.");
    }

    return data;
  } catch (error) {
    console.error("Failed to get session details:", error);

    if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
      throw new Error(
        "Cannot connect to server. Please ensure the backend is running."
      );
    }

    throw error;
  }
};
