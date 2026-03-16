import { Platform } from "react-native";

const USE_MOCK_API = true;
const BACKEND_BASE_URL = "YOUR_BACKEND_URL";

const mockQuestions = {
  Project: [
    "Tell me about a project you are proud of.",
    "What challenge did you face in that project?",
    "What impact did your project create?",
  ],
  Experience: [
    "Tell me about your internship experience.",
    "What did you learn while working in a team?",
    "Describe a challenge you solved during your internship.",
  ],
  Introduction: [
    "Tell me about yourself.",
    "What are your strengths?",
    "Why should we hire you?",
  ],
  Mock: [
    "Tell me about yourself.",
    "Why should we hire you?",
    "What are your strengths and weaknesses?",
  ],
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const startInterviewSession = async (sessionType) => {
  if (USE_MOCK_API) {
    const questions = mockQuestions[sessionType] || mockQuestions.Introduction;

    await wait(700);

    return {
      sessionId: `mock-${sessionType.toLowerCase()}-001`,
      questionNumber: 1,
      questionText: questions[0],
      isSessionComplete: false,
    };
  }

  const response = await fetch(`${BACKEND_BASE_URL}/interview/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sessionType }),
  });

  if (!response.ok) {
    throw new Error("Failed to start interview session");
  }

  return response.json();
};

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

export const submitInterviewAnswer = async ({
  audioUri,
  sessionType,
  questionNumber,
  sessionId,
}) => {
  if (USE_MOCK_API) {
    const questions = mockQuestions[sessionType] || mockQuestions.Introduction;

    await wait(1200);

    const feedbackSamples = [
      "Good answer. Try to be more specific and structured.",
      "Nice response. Speak with a little more confidence and give a clear example.",
      "That was a solid answer. Add measurable impact if possible.",
    ];

    const feedbackText =
      feedbackSamples[(questionNumber - 1) % feedbackSamples.length];

    const currentIndex = questionNumber - 1;
    const nextIndex = currentIndex + 1;
    const isSessionComplete = nextIndex >= questions.length;

    return {
      feedbackText,
      nextQuestionText: isSessionComplete ? "" : questions[nextIndex],
      questionNumber: isSessionComplete ? questionNumber : questionNumber + 1,
      isSessionComplete,
    };
  }

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

  const response = await fetch(`${BACKEND_BASE_URL}/interview/answer`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || "Failed to submit interview answer");
  }

  return response.json();
};