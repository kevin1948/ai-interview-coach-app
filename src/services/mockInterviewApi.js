import { Platform } from "react-native";

const USE_MOCK_API = true;
const API_BASE_URL = "YOUR_BACKEND_URL/api/v1";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock data for development
const mockSessions = [
  {
    session_id: "sess-001",
    title: "Software Engineer Interview",
    created_at: "2024-03-20T10:30:00Z",
    status: "completed",
    questions_answered: 5,
    total_questions: 5,
    score: 85,
  },
  {
    session_id: "sess-002",
    title: "Frontend Developer Mock",
    created_at: "2024-03-18T14:15:00Z",
    status: "completed",
    questions_answered: 5,
    total_questions: 5,
    score: 72,
  },
  {
    session_id: "sess-003",
    title: "System Design Practice",
    created_at: "2024-03-15T09:00:00Z",
    status: "in_progress",
    questions_answered: 3,
    total_questions: 5,
    score: null,
  },
];

const mockQuestions = [
  { id: "q1", text: "Tell me about yourself.", options: [] },
  { id: "q2", text: "Why should we hire you?", options: [] },
  { id: "q3", text: "What are your strengths and weaknesses?", options: [] },
  { id: "q4", text: "Describe a challenging project you worked on.", options: [] },
  { id: "q5", text: "Where do you see yourself in 5 years?", options: [] },
];

const mockFeedback = {
  overall_score: 85,
  categories: [
    { name: "Communication", score: 90, icon: "chatbubbles-outline" },
    { name: "Technical Knowledge", score: 82, icon: "code-slash-outline" },
    { name: "Problem Solving", score: 88, icon: "bulb-outline" },
    { name: "Confidence", score: 80, icon: "shield-checkmark-outline" },
  ],
  strengths: [
    {
      title: "Strong Communication",
      description: "You articulated your thoughts clearly and maintained good structure in your responses.",
    },
    {
      title: "Technical Depth",
      description: "Demonstrated solid understanding of core concepts with relevant examples.",
    },
  ],
  improvements: [
    {
      title: "Pace of Speech",
      description: "Consider slowing down slightly to emphasize key points more effectively.",
    },
    {
      title: "STAR Method",
      description: "Try using the STAR method more consistently for behavioral questions.",
    },
  ],
  questions: [
    { id: "q1", question: "Tell me about yourself", score: 88, transcription: "..." },
    { id: "q2", question: "Why should we hire you?", score: 85, transcription: "..." },
    { id: "q3", question: "What are your strengths?", score: 82, transcription: "..." },
    { id: "q4", question: "Describe a challenging project", score: 90, transcription: "..." },
    { id: "q5", question: "Where do you see yourself in 5 years?", score: 80, transcription: "..." },
  ],
  feedback: "Overall, you demonstrated strong communication skills and technical knowledge. Focus on using the STAR method for behavioral questions and maintaining a steady pace throughout your responses.",
};

/**
 * Fetch all mock interview sessions for a user
 * GET /api/v1/interviews/sessions
 */
export const getMockInterviewSessions = async (userId) => {
  if (USE_MOCK_API) {
    await wait(500);
    return {
      sessions: mockSessions,
      total: mockSessions.length,
    };
  }

  const response = await fetch(`${API_BASE_URL}/interviews/sessions?user_id=${userId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch interview sessions");
  }

  return response.json();
};

/**
 * Start a new mock interview session
 * POST /api/v1/interviews/sessions
 */
export const startMockInterviewSession = async (userId) => {
  if (USE_MOCK_API) {
    await wait(700);

    const newSessionId = `sess-${Date.now()}`;
    return {
      session_id: newSessionId,
      status: "in_progress",
      current_question: mockQuestions[0],
      question_number: 1,
      total_questions: mockQuestions.length,
    };
  }

  const response = await fetch(`${API_BASE_URL}/interviews/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id: userId }),
  });

  if (!response.ok) {
    throw new Error("Failed to start interview session");
  }

  return response.json();
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
  questionNumber,
}) => {
  if (USE_MOCK_API) {
    await wait(1200);

    const nextIndex = questionNumber;
    const isComplete = nextIndex >= mockQuestions.length;

    return {
      session_complete: isComplete,
      next_question: isComplete ? null : mockQuestions[nextIndex],
      question_number: isComplete ? questionNumber : questionNumber + 1,
      transcription: "This is the transcribed text of your answer...",
      confidence_score: 0.85,
    };
  }

  const { file } = await getAudioFileForUpload(audioUri);

  const formData = new FormData();

  if (Platform.OS === "web") {
    formData.append("audio", file, "answer.webm");
  } else {
    formData.append("audio", file);
  }

  formData.append("question_id", questionId);

  const response = await fetch(
    `${API_BASE_URL}/interviews/sessions/${sessionId}/answer`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || "Failed to submit answer");
  }

  return response.json();
};

/**
 * Get feedback/analysis for a completed session
 * GET /api/v1/interviews/sessions/{session_id}/feedback
 */
export const getMockInterviewFeedback = async (sessionId) => {
  if (USE_MOCK_API) {
    await wait(600);

    return {
      session_id: sessionId,
      ...mockFeedback,
    };
  }

  const response = await fetch(
    `${API_BASE_URL}/interviews/sessions/${sessionId}/feedback`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch session feedback");
  }

  return response.json();
};

/**
 * Get session details (for resuming)
 * GET /api/v1/interviews/sessions/{session_id}
 */
export const getMockInterviewSession = async (sessionId) => {
  if (USE_MOCK_API) {
    await wait(400);

    const session = mockSessions.find((s) => s.session_id === sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    return {
      ...session,
      current_question: mockQuestions[session.questions_answered],
      question_number: session.questions_answered + 1,
    };
  }

  const response = await fetch(
    `${API_BASE_URL}/interviews/sessions/${sessionId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch session details");
  }

  return response.json();
};
