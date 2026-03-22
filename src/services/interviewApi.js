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

const isMockSession = (sessionType) => sessionType === "Mock";

const buildQueryString = (params) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      query.append(key, String(value));
    }
  });

  return query.toString();
};

const normalizePracticeStartResponse = (data) => {
  const questionText =
    data?.questionText ||
    data?.question?.text ||
    data?.current_question?.text ||
    data?.text ||
    "";

  return {
    sessionId: data?.sessionId || data?.session_id || "",
    questionNumber: data?.questionNumber || data?.question_number || 1,
    questionText,
    isSessionComplete:
      data?.isSessionComplete ??
      data?.practice_complete ??
      data?.session_complete ??
      false,
  };
};

const normalizePracticeAnswerResponse = (data, previousQuestionNumber) => {
  return {
    feedbackText: data?.feedback || data?.feedbackText || "",
    nextQuestionText:
      data?.nextQuestionText ||
      data?.next_question?.text ||
      data?.next_question_text ||
      "",
    questionNumber:
      data?.questionNumber ||
      data?.question_number ||
      (data?.next_question ? previousQuestionNumber + 1 : previousQuestionNumber),
    isSessionComplete:
      data?.isSessionComplete ??
      data?.practice_complete ??
      data?.session_complete ??
      false,
    raw: data,
  };
};

const normalizeMockStartResponse = (data) => {
  return {
    sessionId: data?.sessionId || data?.session_id || "",
    questionNumber: 1,
    questionText:
      data?.questionText ||
      data?.current_question?.text ||
      data?.question?.text ||
      "",
    isSessionComplete:
      data?.isSessionComplete ??
      data?.session_complete ??
      false,
    raw: data,
  };
};

const normalizeMockAnswerResponse = (data, previousQuestionNumber) => {
  return {
    feedbackText: data?.feedback || data?.feedbackText || "",
    nextQuestionText:
      data?.nextQuestionText ||
      data?.next_question?.text ||
      data?.next_question_text ||
      "",
    questionNumber:
      data?.questionNumber ||
      data?.question_number ||
      (data?.next_question ? previousQuestionNumber + 1 : previousQuestionNumber),
    isSessionComplete:
      data?.isSessionComplete ??
      data?.session_complete ??
      false,
    transcription: data?.transcription || "",
    confidenceScore: data?.confidence_score,
    raw: data,
  };
};

export const startInterviewSession = async ({
  sessionType,
  candidateId,
  resumeId,
}) => {
  if (USE_MOCK_API) {
    const questions = mockQuestions[sessionType] || mockQuestions.Introduction;

    await wait(700);

    return {
      sessionId: `mock-${sessionType.toLowerCase()}-001`,
      questionNumber: 1,
      questionText: questions[0],
      isSessionComplete: false,
      candidateId: candidateId || "mock-candidate-001",
      resumeId: resumeId || "mock-resume-001",
    };
  }

  if (isMockSession(sessionType)) {
    const response = await fetch(`${BACKEND_BASE_URL}/api/v1/interviews/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: candidateId,
      }),
    });

    const rawText = await response.text().catch(() => "");

    if (!response.ok) {
      throw new Error(rawText || "Failed to start mock interview session");
    }

    const data = JSON.parse(rawText);
    return normalizeMockStartResponse(data);
  }

  const queryString = buildQueryString({
    user_id: candidateId,
    resume_id: resumeId,
    session_type: sessionType,
  });

  const response = await fetch(
    `${BACKEND_BASE_URL}/api/v1/practice/questions/start?${queryString}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  const rawText = await response.text().catch(() => "");

  if (!response.ok) {
    throw new Error(rawText || "Failed to start interview practice session");
  }

  const data = JSON.parse(rawText);
  return normalizePracticeStartResponse(data);
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
  candidateId,
  resumeId,
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
      candidateId: candidateId || "mock-candidate-001",
      resumeId: resumeId || "mock-resume-001",
      report: isSessionComplete
        ? {
            questionsAsked: questions,
            candidateAnswers: [],
            feedback: feedbackSamples.slice(0, questions.length),
            performanceMetrics: {
              confidenceScore: 80,
              clarityScore: 78,
              contentScore: 82,
            },
          }
        : undefined,
    };
  }

  const { file, fileName } = await getAudioFileForUpload(audioUri);
  const formData = new FormData();

  if (Platform.OS === "web") {
    formData.append("audio", file, fileName);
  } else {
    formData.append("audio", file);
  }

  if (isMockSession(sessionType)) {
    formData.append("user_id", String(candidateId || ""));
    formData.append("session_id", String(sessionId || ""));
    formData.append("question_number", String(questionNumber));

    const response = await fetch(
      `${BACKEND_BASE_URL}/api/v1/interviews/sessions/${sessionId}/answer`,
      {
        method: "POST",
        body: formData,
      }
    );

    const rawText = await response.text().catch(() => "");

    if (!response.ok) {
      throw new Error(rawText || "Failed to submit mock interview answer");
    }

    const data = JSON.parse(rawText);
    return normalizeMockAnswerResponse(data, questionNumber);
  }

  formData.append("user_id", String(candidateId || ""));
  formData.append("resume_id", String(resumeId || ""));
  formData.append("session_type", String(sessionType || ""));
  formData.append("question_number", String(questionNumber));
  formData.append("session_id", String(sessionId || ""));

  const response = await fetch(`${BACKEND_BASE_URL}/api/v1/practice/answer`, {
    method: "POST",
    body: formData,
  });

  const rawText = await response.text().catch(() => "");

  if (!response.ok) {
    throw new Error(rawText || "Failed to submit interview practice answer");
  }

  const data = JSON.parse(rawText);
  return normalizePracticeAnswerResponse(data, questionNumber);
};

export const getMockInterviewFeedback = async (sessionId) => {
  const response = await fetch(
    `${BACKEND_BASE_URL}/api/v1/interviews/sessions/${sessionId}/feedback`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  const rawText = await response.text().catch(() => "");

  if (!response.ok) {
    throw new Error(rawText || "Failed to fetch mock interview feedback");
  }

  return JSON.parse(rawText);
};