import { Platform } from "react-native";

// Backend API Configuration
const API_BASE_URL = "http://localhost:8000"; // Change port if your backend uses different port
const UPLOAD_ENDPOINT = `${API_BASE_URL}/api/resume/upload`;

/**
 * Upload resume file to backend
 * @param {Object} fileData - File data object
 * @param {string} fileData.uri - File URI/path
 * @param {string} fileData.name - File name
 * @param {number} fileData.size - File size in bytes
 * @returns {Promise<Object>} Response from backend
 */
export const uploadResume = async (fileData) => {
  try {
    const formData = new FormData();

    // Handle different platforms
    if (Platform.OS === "web") {
      // For web platform
      formData.append("file", fileData);
    } else {
      // For iOS and Android
      formData.append("file", {
        uri: fileData.uri,
        type: "application/pdf",
        name: fileData.name || "resume.pdf",
      });
    }

    const response = await fetch(UPLOAD_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        // Don't set Content-Type header when using FormData
        // The browser/platform will set it automatically with boundary
      },
      body: formData,
      timeout: 30000, // 30 second timeout
    });

    // Parse response
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
 * Get resume upload history
 * @returns {Promise<Array>} List of uploaded resumes
 */
export const getResumeHistory = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/resume/history`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to fetch resume history."
      );
    }

    return data;
  } catch (error) {
    console.error("Failed to get resume history:", error);
    throw error;
  }
};

/**
 * Parse resume and extract information
 * @param {string} resumeId - Resume ID from upload response
 * @returns {Promise<Object>} Parsed resume data
 */
export const parseResume = async (resumeId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/resume/parse/${resumeId}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to parse resume."
      );
    }

    return data;
  } catch (error) {
    console.error("Failed to parse resume:", error);
    throw error;
  }
};

/**
 * Delete a resume
 * @param {string} resumeId - Resume ID to delete
 * @returns {Promise<Object>} Delete response
 */
export const deleteResume = async (resumeId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/resume/${resumeId}`,
      {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to delete resume."
      );
    }

    return data;
  } catch (error) {
    console.error("Failed to delete resume:", error);
    throw error;
  }
};
