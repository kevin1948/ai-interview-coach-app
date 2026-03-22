import { Platform } from "react-native";

// Backend API Configuration - Change this to your actual backend URL
const API_BASE_URL = "http://localhost:8000";

/**
 * Start an interview session
 * POST /interview/start
 */
export const startInterviewSession = async (sessionType) => {
  try {
    const response = await fetch(`${API_BASE_URL}/interview/start`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionType }),
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
        "Cannot connect to server. Please ensure the backend is running at " +
          API_BASE_URL
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
 * Submit interview answer
 * POST /interview/answer
 */
export const submitInterviewAnswer = async ({
  audioUri,
  sessionType,
  questionNumber,
  sessionId,
}) => {
  try {
    const { file } = await getAudioFileForUpload(audioUri);

    const formData = new FormData();

    if (Platform.OS === "web") {
      formData.append("audio", file, "answer.webm");
    } else {
      formData.append("audio", file);
    }

    formData.append("sessionType", sessionType);
    formData.append("questionNumber", String(questionNumber));
    formData.append("sessionId", sessionId);

    const response = await fetch(`${API_BASE_URL}/interview/answer`, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to submit interview answer.");
    }

    return data;
  } catch (error) {
    console.error("Failed to submit answer:", error);

    if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
      throw new Error(
        "Cannot connect to server. Please ensure the backend is running at " +
          API_BASE_URL
      );
    }

    throw error;
  }
};
