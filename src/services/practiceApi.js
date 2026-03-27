import { Platform } from "react-native";
import {
  USE_MOCK_API,
  FULL_API_BASE_URL,
  API_BASE_URL,
} from "../config/apiConfig";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const MOCK_PRACTICE_QUESTIONS = [
  {
    id: "p1",
    text: "Tell me about yourself.",
    options: [],
    difficulty: "easy",
    skill_id: "intro",
  },
  {
    id: "p2",
    text: "Why should we hire you?",
    options: [],
    difficulty: "easy",
    skill_id: "intro",
  },
];

const MOCK_FEEDBACK = [
  {
    isCorrect: true,
    feedback: "Good start. Make it more structured.",
  },
  {
    isCorrect: true,
    feedback: "Nice answer. Add stronger proof.",
  },
];

let mockPracticeIndex = 0;

const parseJsonSafely = async (response) => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const handleNetworkError = (error) => {
  console.error("Practice API error:", error);

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
    };
  }

  const lowerUri = audioUri.toLowerCase();

  let fileName = "answer.m4a";
  let mimeType = "audio/m4a";

  if (lowerUri.endsWith(".wav")) {
    fileName = "answer.wav";
    mimeType = "audio/wav";
  } else if (lowerUri.endsWith(".mp3")) {
    fileName = "answer.mp3";
    mimeType = "audio/mpeg";
  } else if (lowerUri.endsWith(".aac")) {
    fileName = "answer.aac";
    mimeType = "audio/aac";
  } else if (lowerUri.endsWith(".caf")) {
    fileName = "answer.caf";
    mimeType = "audio/x-caf";
  } else if (lowerUri.endsWith(".webm")) {
    fileName = "answer.webm";
    mimeType = "audio/webm";
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

const normalizePracticeAnswerResponse = (data) => {
  return {
    isCorrect: Boolean(data.is_correct),
    feedback: data.feedback ?? "",
    nextQuestion: normalizeQuestion(data.next_question),
    practiceComplete: Boolean(data.practice_complete),
  };
};

const startPracticeQuestionMock = async () => {
  await wait(500);
  mockPracticeIndex = 0;
  return normalizeQuestion(MOCK_PRACTICE_QUESTIONS[0]);
};

const submitPracticeAnswerMock = async () => {
  await wait(800);

  const currentIndex = mockPracticeIndex;
  const nextIndex = currentIndex + 1;
  const feedbackObj = MOCK_FEEDBACK[currentIndex] || {
    isCorrect: true,
    feedback: "Good attempt.",
  };

  if (nextIndex >= MOCK_PRACTICE_QUESTIONS.length) {
    mockPracticeIndex = 0;

    return {
      isCorrect: feedbackObj.isCorrect,
      feedback: feedbackObj.feedback,
      nextQuestion: null,
      practiceComplete: true,
    };
  }

  mockPracticeIndex = nextIndex;

  return {
    isCorrect: feedbackObj.isCorrect,
    feedback: feedbackObj.feedback,
    nextQuestion: normalizeQuestion(MOCK_PRACTICE_QUESTIONS[nextIndex]),
    practiceComplete: false,
  };
};

export const startPracticeQuestion = async ({ userId, difficulty = "" }) => {
  if (USE_MOCK_API) {
    return startPracticeQuestionMock();
  }

  try {
    const params = new URLSearchParams();
    params.append("user_id", String(userId));
    if (difficulty) {
      params.append("difficulty", difficulty);
    }

    const url = `${FULL_API_BASE_URL}/practice/questions/start?${params.toString()}`;

    console.log("Practice start URL:", url);
    console.log("Practice start userId:", userId);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const data = await parseJsonSafely(response);

    console.log("Practice start status:", response.status);
    console.log("Practice start response:", data);

    if (!response.ok) {
      throw new Error(
        data?.detail ||
          data?.message ||
          data?.error ||
          data?.raw ||
          "Failed to start practice question."
      );
    }

    return normalizeQuestion(data);
  } catch (error) {
    handleNetworkError(error);
  }
};

export const submitPracticeAnswer = async ({
  audioUri,
  userId,
  questionId,
  answerText = "",
}) => {
  if (USE_MOCK_API) {
    return submitPracticeAnswerMock();
  }

  try {
    const formData = new FormData();

    formData.append("user_id", String(userId));
    formData.append("question_id", String(questionId));

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

    const response = await fetch(`${FULL_API_BASE_URL}/practice/answer`, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
    });

    const data = await parseJsonSafely(response);

    console.log("Practice answer status:", response.status);
    console.log("Practice answer response:", data);

    if (!response.ok) {
      throw new Error(
        data?.detail ||
          data?.message ||
          data?.error ||
          data?.raw ||
          "Failed to submit practice answer."
      );
    }

    return normalizePracticeAnswerResponse(data);
  } catch (error) {
    handleNetworkError(error);
  }
};