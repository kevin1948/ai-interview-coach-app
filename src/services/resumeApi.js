const USE_MOCK_API = true;
const API_BASE_URL = "http://localhost:8000";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * MOCK: Upload resume
 */
const uploadResumeMock = async (file) => {
  await wait(1000);

  return {
    user_id: "mock-user-123",
    resume: {
      id: "mock-resume-456",
      filename: file?.name || "resume.pdf",
      parsed_data: {
        name: "user name",
        email: "user@example.com",
        phone: "+91 9876543210",
        skills: ["React Native", "Java", "DSA", "JavaScript"],
        education: "B.E. Computer Science Engineering",
      },
    },
  };
};

/**
 * MOCK: Parse resume
 */
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

export const uploadResume = async (file) => {
  if (USE_MOCK_API) {
    return uploadResumeMock(file);
  }

  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/api/resume/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to upload resume.");
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
    const response = await fetch(
      `${API_BASE_URL}/api/resume/parse/${resumeId}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to parse resume.");
    }

    return data;
  } catch (error) {
    console.error("Resume parse error:", error);
    throw error;
  }
};