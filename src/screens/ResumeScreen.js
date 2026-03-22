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
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

export default function ResumeScreen({ navigation }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (file) => {
    if (!file) return;

    if (!file.name?.toLowerCase().endsWith(".pdf")) {
      Alert.alert("Invalid File", "Please upload a PDF file only.", [
        { text: "OK" },
      ]);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      Alert.alert("File Too Large", "Resume must be less than 5MB.", [
        { text: "OK" },
      ]);
      return;
    }

    setSelectedFile({
      name: file.name,
      size: file.size,
      uri: file.uri || file,
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

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 300);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const mockResponse = {
        user_id: "mock-user-001",
        resume: {
          id: "mock-resume-001",
        },
      };

      clearInterval(progressInterval);
      setUploadProgress(100);

      await AsyncStorage.setItem("candidateId", mockResponse.user_id);
      await AsyncStorage.setItem("resumeId", mockResponse.resume.id);

      setUploadSuccess(true);

      Alert.alert("Success", "Resume uploaded successfully!", [
        {
          text: "Continue",
          onPress: () => {
            setSelectedFile(null);
            setUploadProgress(0);
            setUploadSuccess(false);
            navigation.navigate("Home");
          },
        },
      ]);
    } catch (error) {
      setUploadProgress(0);
      Alert.alert(
        "Upload Failed",
        error?.message || "Failed to upload resume. Please try again.",
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
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: "application/pdf",
          copyToCacheDirectory: true,
          multiple: false,
        });

        if (result.canceled) return;

        const file = result.assets?.[0];
        if (!file) return;

        handleFileSelect({
          name: file.name,
          size: file.size,
          uri: file.uri,
        });
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick document. Please try again.", [
        { text: "OK" },
      ]);
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
        <View style={styles.headerSection}>
          <Text style={styles.mainTitle}>Upload Your Resume</Text>
          <Text style={styles.subtitle}>
            Help us understand your professional background
          </Text>
        </View>

        <View style={styles.uploadBoxWrapper}>
          {uploadSuccess ? (
            <View style={[styles.uploadBox, styles.successBox]}>
              <MaterialIcons
                name="check-circle"
                size={56}
                color="#10b981"
                style={styles.icon}
              />
              <Text style={styles.successText}>Resume Uploaded!</Text>
              <Text style={styles.successSubtext}>
                Your resume has been successfully submitted.
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
              <MaterialIcons
                name="cloud-upload"
                size={48}
                color="#3b82f6"
                style={styles.icon}
              />
              <Text style={styles.uploadText}>
                {selectedFile ? "Change File" : "Upload Resume"}
              </Text>
              <Text style={styles.uploadSubtext}>
                Click to browse or drag and drop
              </Text>
              <Text style={styles.formatText}>PDF only • Max 5MB</Text>
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
                if (
                  file &&
                  file.name &&
                  file.size !== undefined
                ) {
                  handleFileSelect({
                    name: file.name,
                    size: file.size,
                    uri: file,
                  });
                }
              }}
            />
          )}
        </View>

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
    borderColor: "#d1d5db",
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  uploadBoxPressed: {
    borderColor: "#3b82f6",
    backgroundColor: "#f0f9ff",
  },
  successBox: {
    borderWidth: 2,
    borderColor: "#10b981",
    backgroundColor: "#f0fdf4",
    borderStyle: "solid",
  },
  icon: {
    marginBottom: 12,
  },
  uploadText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  uploadSubtext: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },
  formatText: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
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