import React, { useState, useRef, useEffect } from "react";
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
import * as DocumentPicker from "expo-document-picker";
import { useUploadResumeMutation } from "./resumeApiSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAppDispatch } from "../../store/hooks";
import {
  setCandidateId,
  setResumeId,
  setResumeUploaded,
} from "../profile/profileSlice";
import type { NavigationBridge } from "../../lib/navigationBridge";

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  navigation: NavigationBridge;
};

/**
 * File descriptor stored in component state and passed to the upload mutation.
 * uri is a native file path (string) on mobile, or a browser File object on web.
 */
interface SelectedFile {
  name: string;
  size: number;
  uri:  string | File;
}

// ── Parsed resume shapes (mirrors backend response) ───────────────────────────

interface ParsedResumePersonal {
  full_name?: string;
  email?:     string;
  phone?:     string;
  location?:  string;
}

interface ParsedResumeExperienceItem {
  title?:       string;
  company?:     string;
  duration?:    string;
  description?: string;
}

/**
 * The `resume` object returned inside the upload response.
 * Kept minimal — only fields consumed by this screen are declared.
 * Candidate for promotion to src/types/ when a second consumer appears.
 */
interface ParsedResumeData {
  id:          string;
  filename?:   string;
  personal?:   ParsedResumePersonal;
  skills?:     string[];
  experience?: ParsedResumeExperienceItem[];
}

/** Full upload response shape from the resume upload API. */
interface UploadResumeResponse {
  user_id: string;
  resume:  ParsedResumeData;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ResumeScreen({ navigation }: Props) {
  const [selectedFile, setSelectedFile]   = useState<SelectedFile | null>(null);
  const [uploading, setUploading]         = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsedResume, setParsedResume]   = useState<ParsedResumeData | null>(null);

  // On web this ref points to the hidden <input type="file" /> element.
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const dispatch = useAppDispatch();

  // RTK Query mutation hook — replaces direct uploadResume() import
  const [triggerUploadResume] = useUploadResumeMutation();

  useEffect(() => {
    const resetStoredResumeState = async (): Promise<void> => {
      try {
        await AsyncStorage.removeItem("candidateId");
        await AsyncStorage.removeItem("resumeId");
      } catch (error) {
        console.log("Failed to clear stored resume state:", error);
      }
    };

    resetStoredResumeState();
  }, []);

  const handleFileSelect = async (file: SelectedFile): Promise<void> => {
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
      // file.uri is always provided by all callers; the || fallback was defensive dead-code.
      uri:  file.uri,
    });
    setUploadSuccess(false);
  };

  const handleUpload = async (): Promise<void> => {
    if (!selectedFile) {
      Alert.alert("No File Selected", "Please select a PDF resume first.");
      return;
    }

    let progressInterval: ReturnType<typeof setInterval> | undefined;

    try {
      setUploading(true);
      setUploadProgress(0);

      // Clear previous stored IDs before new upload
      await AsyncStorage.removeItem("candidateId");
      await AsyncStorage.removeItem("resumeId");

      progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 300);

      // Use RTK Query mutation; check result instead of .unwrap() so that
      // error messages are extracted from RTK Query's { status, data } shape
      // exactly as the original code extracted them from thrown Error objects.
      const result = await triggerUploadResume({ file: selectedFile });
      if (result.error) {
        // RTK Query error is a discriminated union — .data and .error fields
        // are not present on all variants; cast to access them safely.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errAny  = result.error as any;
        const errData = errAny?.data;
        throw new Error(
          errData?.detail   ||
          errData?.message  ||
          errData?.error    ||
          errAny?.error     ||
          "Failed to upload resume."
        );
      }

      // result.data is `unknown` at the slice level; cast to the known response shape.
      const response = result.data as UploadResumeResponse;

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response?.user_id || !response?.resume?.id) {
        throw new Error("Invalid response from resume upload API");
      }

      // Store fresh values only after confirmed success
      await AsyncStorage.setItem("candidateId", response.user_id);
      await AsyncStorage.setItem("resumeId", response.resume.id);

      // Immediately sync Redux so any screen that reads the store
      // gets the updated values without waiting for HomeScreen's
      // AsyncStorage focus-listener bridge.
      dispatch(setCandidateId(response.user_id));
      dispatch(setResumeId(response.resume.id));
      dispatch(setResumeUploaded(true));

      if (response?.resume) {
        setParsedResume(response.resume);
      }

      setUploadSuccess(true);

      Alert.alert("Success", "Resume uploaded successfully!", [
        {
          text: "Continue",
          onPress: () => {
            navigation.navigate("Home");
          },
        },
      ]);
    } catch (error) {
      if (progressInterval) {
        clearInterval(progressInterval);
      }

      setUploadProgress(0);

      Alert.alert(
        "Upload Failed",
        (error as Error)?.message || "Failed to upload resume. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleBrowseFiles = async (): Promise<void> => {
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
          // DocumentPicker size is number | null | undefined; normalise to 0 if absent.
          size: file.size ?? 0,
          uri:  file.uri,
        });
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick document. Please try again.", [
        { text: "OK" },
      ]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    // sizes[i] is guaranteed in-bounds for realistic file sizes; fallback defensively.
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + (sizes[i] ?? "");
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
                if (file && file.name && file.size !== undefined) {
                  handleFileSelect({
                    name: file.name,
                    size: file.size,
                    uri:  file,
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

        {uploadSuccess && parsedResume && (
          <View style={styles.parsedDataContainer}>
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

            <Pressable
              style={({ pressed }) => [
                styles.uploadAnotherButton,
                pressed && styles.uploadAnotherPressed,
              ]}
              onPress={async () => {
                try {
                  await AsyncStorage.removeItem("candidateId");
                  await AsyncStorage.removeItem("resumeId");
                } catch (error) {
                  console.log("Failed to clear stored resume state:", error);
                }

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

// ── Styles ────────────────────────────────────────────────────────────────────

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
