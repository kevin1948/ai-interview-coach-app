import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { uploadResume } from "../services/resumeApi";

// Only import DocumentPicker on native platforms
let DocumentPicker;
if (Platform.OS !== "web") {
  DocumentPicker = require("react-native-document-picker").default;
}

export default function ResumeScreen() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsedResume, setParsedResume] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (file) => {
    if (!file) return;

    // Validate file type
    if (!file.name?.endsWith(".pdf")) {
      Alert.alert("Invalid File", "Please upload a PDF file only.", [
        { text: "OK" },
      ]);
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      Alert.alert("File Too Large", "Resume must be less than 5MB.", [
        { text: "OK" },
      ]);
      return;
    }

    setSelectedFile({
      name: file.name,
      size: file.size,
      uri: file,
    });
    setUploadSuccess(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert("No File Selected", "Please select a PDF resume first.", [
        { text: "OK" },
      ]);
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 300);

      const response = await uploadResume(selectedFile.uri);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Store parsed resume data from API response
      if (response.resume) {
        setParsedResume(response.resume);
      }

      setUploadSuccess(true);
    } catch (error) {
      setUploading(false);
      setUploadProgress(0);
      Alert.alert(
        "Upload Failed",
        error.message || "Failed to upload resume. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setUploading(false);
    }
  };

  const handleBrowseFiles = async () => {
    try {
      if (Platform.OS === "web") {
        fileInputRef.current?.click();
      } else if (DocumentPicker) {
        // Use DocumentPicker for native Android and iOS
        const result = await DocumentPicker.pick({
          type: [DocumentPicker.types.pdf],
          allowMultiple: false,
          copyTo: "cachesDirectory",
        });

        if (result && result.length > 0) {
          const file = result[0];
          handleFileSelect({
            name: file.name,
            size: file.size,
            uri: file.fileCopyUri || file.uri,
          });
        }
      } else {
        Alert.alert(
          "Error",
          "File picker not available on this platform.",
          [{ text: "OK" }]
        );
      }
    } catch (err) {
      if (DocumentPicker && DocumentPicker.isCancel(err)) {
        // User cancelled the picker
        return;
      }
      Alert.alert(
        "Error",
        "Failed to pick document. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.container}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.mainTitle}>Upload Your Resume</Text>
          <Text style={styles.subtitle}>
            Help us understand your professional background
          </Text>
        </View>

        {/* Upload Box - Clean White MNC Style */}
        <View style={styles.uploadBoxWrapper}>
          {uploadSuccess && parsedResume ? (
            <View style={[styles.uploadBox, styles.successBox]}>
              <MaterialIcons
                name="check-circle"
                size={56}
                color="#10b981"
                style={styles.icon}
              />
              <Text style={styles.successText}>Resume Uploaded!</Text>
              <Text style={styles.successSubtext}>
                Your resume has been successfully parsed.
              </Text>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.uploadBox,
                pressed && styles.uploadBoxPressed,
              ]}
              onPress={handleBrowseFiles}
            >
              <View style={styles.uploadIconContainer}>
                <MaterialIcons
                  name="cloud-upload"
                  size={52}
                  color="#2563EB"
                />
              </View>
              <Text style={styles.uploadText}>
                {selectedFile ? "Change File" : "Upload Resume"}
              </Text>
              <Text style={styles.uploadSubtext}>
                Drag and drop or click to browse
              </Text>
              <View style={styles.formatBadge}>
                <Text style={styles.formatText}>PDF only • Max 5MB</Text>
              </View>
            </Pressable>
          )}

          {Platform.OS === "web" && (
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
          )}
        </View>

        {/* Selected File Info */}
        {selectedFile && !uploadSuccess && (
          <View style={styles.fileInfoBox}>
            <View style={styles.fileInfoContent}>
              <MaterialIcons
                name="description"
                size={28}
                color="#3b82f6"
                style={styles.fileIcon}
              />
              <View style={styles.fileDetails}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {selectedFile.name}
                </Text>
                <Text style={styles.fileSize}>
                  {formatFileSize(selectedFile.size)}
                </Text>
              </View>
            </View>
            {!uploading && (
              <Pressable onPress={() => setSelectedFile(null)}>
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </Pressable>
            )}
          </View>
        )}

        {/* Upload Progress */}
        {uploading && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${uploadProgress}%` }]}
              />
            </View>
            <Text style={styles.progressText}>{uploadProgress}%</Text>
          </View>
        )}

        {/* Action Buttons */}
        {selectedFile && !uploadSuccess && (
          <View style={styles.buttonGroup}>
            <Pressable
              style={({ pressed }) => [
                styles.uploadButton,
                pressed && styles.uploadButtonPressed,
                uploading && styles.uploadButtonDisabled,
              ]}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <MaterialIcons
                    name="send"
                    size={20}
                    color="white"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.uploadButtonText}>Upload Resume</Text>
                </>
              )}
            </Pressable>

            {!uploading && (
              <Pressable
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed && styles.cancelButtonPressed,
                ]}
                onPress={() => setSelectedFile(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Parsed Resume Data Display */}
        {uploadSuccess && parsedResume && (
          <View style={styles.parsedDataContainer}>
            {/* Personal Info Card */}
            <View style={styles.dataCard}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="person" size={22} color="#2563EB" />
                <Text style={styles.cardTitle}>Personal Information</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.personalName}>
                  {parsedResume.personal?.full_name}
                </Text>
                <Text style={styles.personalDetail}>
                  {parsedResume.personal?.email}
                </Text>
                <Text style={styles.personalDetail}>
                  {parsedResume.personal?.phone}
                </Text>
                <Text style={styles.personalDetail}>
                  {parsedResume.personal?.location}
                </Text>
              </View>
            </View>

            {/* Skills Card */}
            <View style={styles.dataCard}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="code" size={22} color="#2563EB" />
                <Text style={styles.cardTitle}>Skills</Text>
              </View>
              <View style={styles.skillsContainer}>
                {parsedResume.skills?.map((skill, index) => (
                  <View key={index} style={styles.skillBadge}>
                    <Text style={styles.skillText}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Experience Card */}
            <View style={styles.dataCard}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="work" size={22} color="#2563EB" />
                <Text style={styles.cardTitle}>Experience</Text>
              </View>
              <View style={styles.cardContent}>
                {parsedResume.experience?.map((exp, index) => (
                  <View key={index} style={styles.experienceItem}>
                    <Text style={styles.expTitle}>{exp.title}</Text>
                    <Text style={styles.expCompany}>
                      {exp.company} • {exp.duration}
                    </Text>
                    <Text style={styles.expDescription}>{exp.description}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Upload Another Button */}
            <Pressable
              style={({ pressed }) => [
                styles.uploadAnotherButton,
                pressed && styles.uploadAnotherPressed,
              ]}
              onPress={() => {
                setSelectedFile(null);
                setUploadProgress(0);
                setUploadSuccess(false);
                setParsedResume(null);
              }}
            >
              <MaterialIcons name="refresh" size={20} color="#2563EB" />
              <Text style={styles.uploadAnotherText}>Upload Another Resume</Text>
            </Pressable>
          </View>
        )}

        {/* Info Cards */}
        {!selectedFile && !uploadSuccess && (
          <View style={styles.infoCardsContainer}>
            <View style={styles.infoCard}>
              <MaterialIcons
                name="check"
                size={24}
                color="#10b981"
                style={styles.infoIcon}
              />
              <Text style={styles.infoTitle}>Easy Upload</Text>
              <Text style={styles.infoDescription}>
                Upload your resume in a single click
              </Text>
            </View>

            <View style={styles.infoCard}>
              <MaterialIcons
                name="security"
                size={24}
                color="#3b82f6"
                style={styles.infoIcon}
              />
              <Text style={styles.infoTitle}>Secure</Text>
              <Text style={styles.infoDescription}>
                Your data is encrypted and secure
              </Text>
            </View>

            <View style={styles.infoCard}>
              <MaterialIcons
                name="speed"
                size={24}
                color="#f59e0b"
                style={styles.infoIcon}
              />
              <Text style={styles.infoTitle}>Fast Processing</Text>
              <Text style={styles.infoDescription}>
                Instant resume analysis and feedback
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  contentContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    maxWidth: 600,
    alignSelf: "center",
    width: "100%",
  },
  headerSection: {
    marginBottom: 32,
    marginTop: 12,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    lineHeight: 24,
  },
  uploadBoxWrapper: {
    marginBottom: 24,
  },
  uploadBox: {
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    borderRadius: 20,
    padding: 48,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.06)",
      },
    }),
  },
  uploadBoxPressed: {
    borderColor: "#2563EB",
    backgroundColor: "#F8FAFC",
    borderStyle: "solid",
  },
  successBox: {
    borderWidth: 2,
    borderColor: "#10b981",
    backgroundColor: "#f0fdf4",
    borderStyle: "solid",
  },
  uploadIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  icon: {
    marginBottom: 12,
  },
  uploadText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  uploadSubtext: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 16,
  },
  formatBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  formatText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  successText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#10b981",
    marginBottom: 4,
  },
  successSubtext: {
    fontSize: 14,
    color: "#047857",
  },
  fileInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  fileInfoContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  fileIcon: {
    marginRight: 12,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 12,
    color: "#9ca3af",
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3b82f6",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    fontWeight: "500",
  },
  buttonGroup: {
    gap: 12,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  uploadButtonPressed: {
    backgroundColor: "#2563eb",
  },
  uploadButtonDisabled: {
    backgroundColor: "#93c5fd",
    opacity: 0.7,
  },
  buttonIcon: {
    marginRight: 8,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    backgroundColor: "white",
  },
  cancelButtonPressed: {
    backgroundColor: "#f3f4f6",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
  },
  // Parsed Resume Data Styles
  parsedDataContainer: {
    marginTop: 8,
    gap: 16,
  },
  dataCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginLeft: 10,
  },
  cardContent: {
    gap: 8,
  },
  personalName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  personalDetail: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 22,
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skillBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  skillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
  experienceItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  expTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  expCompany: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
    marginBottom: 6,
  },
  expDescription: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
  },
  uploadAnotherButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  uploadAnotherPressed: {
    backgroundColor: "#DBEAFE",
  },
  uploadAnotherText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2563EB",
    marginLeft: 8,
  },
  infoCardsContainer: {
    marginTop: 24,
    gap: 16,
  },
  infoCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  infoIcon: {
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 18,
  },
});
