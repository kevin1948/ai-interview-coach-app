import { Platform } from "react-native";

const USE_MOCK_API = true;
const API_BASE_URL = "http://localhost:8000";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const MOCK_PRACTICE_QUESTIONS = [
  {
    id: "p1",
    text: "Tell me about yourself.",
    options: [],
    difficulty: "BEGINNER",
    skill_id: "intro",
  },
  {
    id: "p2",
    text: "Why should we hire you?",
    options: [],
    difficulty: "BEGINNER",
    skill_id: "intro",
  },
  {
    id: "p3",
    text: "Describe a challenging project you worked on.",
    options: [],
    difficulty: "INTERMEDIATE",
    skill_id: "projects",
  },
  {
    id: "p4",
    text: "What are your strengths and weaknesses?",
    options: [],
    difficulty: "INTERMEDIATE",
    skill_id: "behavioral",
  },
  {
    id: "p5",
    text: "Where do you see yourself in five years?",
    options: [],
    difficulty: "BEGINNER",
    skill_id: "career",
  },
];

const MOCK_FEEDBACK = [
  {
    isCorrect: true,
    feedback:
      "Good start. Your answer is clear, but make it more structured by covering present, past, and future in that order.",
  },
  {
    isCorrect: true,
    feedback:
      "Nice answer. Mention two strong qualities and connect them to how they help the company.",
  },
  {
    isCorrect: true,
    feedback:
      "Strong attempt. Add measurable impact like numbers, performance, or outcomes to make the answer more convincing.",
  },
  {
    isCorrect: true,
    feedback:
      "Decent response. For weaknesses, mention how you are actively improving so it sounds mature and professional.",
  },
  {
    isCorrect: true,
    feedback:
      "Good answer. Your growth mindset is clear, and the response aligns well with long-term career development.",
  },
];

let mockPracticeIndex = 0;

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
  } catch (error) {
    throw new Error("Server returned an invalid JSON response.");
  }
};

/**
 * Common helper for network errors
 */
const handleNetworkError = (error) => {
  console.error("Practice API error:", error);

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

const normalizeQuestion = (question) => {
  if (!question) {
    return null;
  }

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

/**
 * MOCK: Start practice flow
 */
const startPracticeQuestionMock = async () => {
  await wait(700);
  mockPracticeIndex = 0;

  return normalizeQuestion(MOCK_PRACTICE_QUESTIONS[0]);
};

/**
 * MOCK: Submit practice answer
 */
const submitPracticeAnswerMock = async ({ audioUri }) => {
  await wait(1100);

  const currentIndex = mockPracticeIndex;
  const nextIndex = currentIndex + 1;

  const feedbackObj = MOCK_FEEDBACK[currentIndex] || {
    isCorrect: true,
    feedback: "Good attempt. Keep your answer more structured and specific.",
  };

  if (audioUri) {
    // mock path only; no upload needed
  }

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

/**
 * Start practice question
 * GET /api/v1/practice/questions/start
 */
export const startPracticeQuestion = async () => {
  if (USE_MOCK_API) {
    return startPracticeQuestionMock();
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/practice/questions/start`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    const data = await parseJsonSafely(response);

    if (!response.ok) {
      throw new Error(data.message || "Failed to start practice question.");
    }

    return normalizeQuestion(data);
  } catch (error) {
    handleNetworkError(error);
  }
};

/**
 * Submit practice answer
 * POST /api/v1/practice/answer
 */
export const submitPracticeAnswer = async ({ audioUri, answerText = "" }) => {
  if (USE_MOCK_API) {
    return submitPracticeAnswerMock({ audioUri, answerText });
  }

  try {
    const formData = new FormData();

    if (audioUri) {
      const { file, fileName } = await getAudioFileForUpload(audioUri);

      if (Platform.OS === "web") {
        formData.append("audio", file, fileName);
      } else {
        formData.append("audio", file);
      }
    }

    if (answerText) {
      formData.append("answer_text", answerText);
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/practice/answer`, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
    });

    const data = await parseJsonSafely(response);

    if (!response.ok) {
      throw new Error(data.message || "Failed to submit practice answer.");
    }

    return normalizePracticeAnswerResponse(data);
  } catch (error) {
    handleNetworkError(error);
  }
};