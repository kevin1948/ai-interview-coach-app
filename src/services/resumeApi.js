import { USE_MOCK_API, API_BASE_URL } from "../config/apiConfig";

/*
Resume API
Handles:
- resume upload
- resume parsing
*/

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const uploadResumeMock = async (file) => {
  await wait(1000);

  return {
    user_id: "mock-user-123",
    resume: {
      id: "mock-resume-456",
      filename: file?.name || "resume.pdf",
      parsed_data: {
        name: "Kevin Joshua",
        email: "kevin@example.com",
        phone: "+91 9876543210",
        skills: ["React Native", "Java", "DSA", "JavaScript"],
        education: "B.E. Computer Science Engineering",
      },
    },
  };
};

const parseResumeMock = async (resumeId) => {
  await wait(700);

  return {
    resume_id: resumeId,
    parsed_data: {
      name: "Kevin Joshua",
      email: "kevin@example.com",
      phone: "+91 9876543210",
      skills: ["React Native", "Java", "DSA", "JavaScript"],
      education: "B.E. Computer Science Engineering",
      projects: [
        "AI Interview Coach App",
        "Mock Interview Mobile Application",
      ],
    },
  };
};

const parseJsonSafely = async (response) => {
  const text = await response.text();

  console.log("Resume API raw response text:", text);

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

export const uploadResume = async (file, userId = "") => {
  if (USE_MOCK_API) {
    return uploadResumeMock(file);
  }

  try {
    const formData = new FormData();

    const nativeFile = {
      uri: file.uri,
      name: file.name || "resume.pdf",
      type: "application/pdf",
    };

    formData.append("file", nativeFile);

    const url = userId
      ? `${API_BASE_URL}/api/resume/upload?user_id=${encodeURIComponent(
          String(userId)
        )}`
      : `${API_BASE_URL}/api/resume/upload`;

    console.log("Resume upload URL:", url);
    console.log("Resume upload file:", nativeFile);

    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    const data = await parseJsonSafely(response);

    console.log("Resume upload status:", response.status);
    console.log("Resume upload parsed response:", data);

    if (!response.ok) {
      throw new Error(
        data?.detail ||
          data?.message ||
          data?.error ||
          data?.raw ||
          "Failed to upload resume."
      );
    }

    return data;
  } catch (error) {
    console.error("Resume upload error:", error);
    throw error;
  }
};

export const parseResume = async (resumeId) => {
  if (USE_MOCK_API) {
    return parseResumeMock(resumeId);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/resume/parse/${resumeId}`);
    const data = await parseJsonSafely(response);

    if (!response.ok) {
      throw new Error(
        data?.detail ||
          data?.message ||
          data?.error ||
          data?.raw ||
          "Failed to parse resume."
      );
    }

    return data;
  } catch (error) {
    console.error("Resume parse error:", error);
    throw error;
  }
};