import { Platform } from "react-native";

// Backend API Configuration - Change this to your actual backend URL
const API_BASE_URL = "http://localhost:8000";

/**
 * Upload resume file to backend
 * POST /api/resume/upload
 * @param {Object} fileData - File data object
 * @returns {Promise<Object>} Response with parsed resume data
 */
export const uploadResume = async (fileData) => {
  try {
    const formData = new FormData();

    // Handle different platforms
    if (Platform.OS === "web") {
      formData.append("file", fileData);
    } else {
      formData.append("file", {
        uri: fileData.uri,
        type: "application/pdf",
        name: fileData.name || "resume.pdf",
      });
    }

    const response = await fetch(`${API_BASE_URL}/api/resume/upload`, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(
        responseData.message ||
          `Upload failed with status ${response.status}. Please try again.`
      );
    }

    return responseData;
  } catch (error) {
    console.error("Resume upload error:", error);

    if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
      throw new Error(
        "Cannot connect to server. Please ensure the backend is running at " +
          API_BASE_URL
      );
    }

    throw new Error(error.message || "Failed to upload resume. Please try again.");
  }
};

/**
 * Get parsed resume information
 * GET /api/resume/parse/{resume_id}
 * @param {string} resumeId - Resume ID from upload response
 * @returns {Promise<Object>} Detailed parsed resume data
 */
export const getResumeDetails = async (resumeId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/resume/parse/${resumeId}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch resume details.");
    }

    return data;
  } catch (error) {
    console.error("Failed to get resume details:", error);

    if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
      throw new Error(
        "Cannot connect to server. Please ensure the backend is running at " +
          API_BASE_URL
      );
    }

    throw error;
  }
};
