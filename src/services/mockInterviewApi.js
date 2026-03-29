import { FULL_API_BASE_URL, API_BASE_URL } from "../config/apiConfig";

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
  console.error("Mock Interview API error:", error);

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

export const getMockInterviewSessions = async (candidateId) => {
  try {
    const response = await fetch(
      `${FULL_API_BASE_URL}/interviews/sessions?candidate_id=${encodeURIComponent(
        candidateId
      )}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    const data = await parseJsonSafely(response);

    if (!response.ok) {
      throw new Error(data?.message || "Failed to fetch mock interview sessions.");
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    handleNetworkError(error);
  }
};

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
      throw new Error(data?.message || "Failed to fetch mock interview result.");
    }

    return data;
  } catch (error) {
    handleNetworkError(error);
  }
};