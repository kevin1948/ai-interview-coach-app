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
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const startInterviewSession = async (sessionType) => {
  if (USE_MOCK_API) {
    const questions = mockQuestions[sessionType] || mockQuestions.Introduction;

    await wait(700);

    return {
      sessionId: "mock-session-001",
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

export const submitInterviewAnswer = async ({
  audioUri,
  sessionType,
  questionNumber,
  sessionId,
}) => {
  if (USE_MOCK_API) {
    const questions = mockQuestions[sessionType] || mockQuestions.Introduction;
    const nextIndex = questionNumber;

    await wait(1200);

    const feedbackSamples = [
      "Good answer. Try to be more specific and structured.",
      "Nice response. Speak with a little more confidence and give a clear example.",
      "That was a solid answer. Add measurable impact if possible.",
    ];

    const feedbackText =
      feedbackSamples[(questionNumber - 1) % feedbackSamples.length];

    return {
      feedbackText,
      nextQuestionText: questions[nextIndex] || "",
      questionNumber: nextIndex + 1,
      isSessionComplete: nextIndex >= questions.length,
    };
  }

  const formData = new FormData();

  formData.append("audio", {
    uri: audioUri,
    name: "answer.m4a",
    type: "audio/m4a",
  });

  formData.append("sessionType", sessionType);
  formData.append("questionNumber", String(questionNumber));
  formData.append("sessionId", sessionId);

  const response = await fetch(`${BACKEND_BASE_URL}/interview/answer`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to submit interview answer");
  }

  return response.json();
};