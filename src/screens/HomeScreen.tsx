import { logger } from '../utils/logger';
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAppDispatch } from "../store/hooks";
import {
  setCandidateId as setStoreCandidateId,
  setResumeId as setStoreResumeId,
  setResumeUploaded as setStoreResumeUploaded,
} from "../store/profileSlice";
import type { NavigationBridge } from "../utils/navigationBridge";

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  navigation: NavigationBridge;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const [loading, setLoading]               = useState<boolean>(true);
  const [resumeUploaded, setResumeUploaded] = useState<boolean>(false);

  useEffect(() => {
    fetchProfileStatus();

    const unsubscribe = navigation.addListener("focus", () => {
      fetchProfileStatus();
    });

    return unsubscribe;
  }, [navigation]);

  const fetchProfileStatus = async (): Promise<void> => {
    try {
      // AsyncStorage.getItem returns `string | null`; both values are nullable.
      const storedCandidateId: string | null = await AsyncStorage.getItem("candidateId");
      const storedResumeId:    string | null = await AsyncStorage.getItem("resumeId");

      const hasResume: boolean = Boolean(
        storedCandidateId &&
          storedCandidateId.trim() &&
          storedResumeId &&
          storedResumeId.trim()
      );

      setResumeUploaded(hasResume);

      // Sync loaded values into the Redux store so other screens can read
      // state.profile without hitting AsyncStorage themselves.
      dispatch(setStoreCandidateId(storedCandidateId || ""));
      dispatch(setStoreResumeId(storedResumeId || ""));
      dispatch(setStoreResumeUploaded(hasResume));
    } catch (error) {
      logger.log("Failed to fetch profile status:", error);
      setResumeUploaded(false);
      // Reset store state on error too
      dispatch(setStoreCandidateId(""));
      dispatch(setStoreResumeId(""));
      dispatch(setStoreResumeUploaded(false));
    } finally {
      setLoading(false);
    }
  };

  const handleInterviewCoach = (): void => {
    if (!resumeUploaded) return;

    navigation.navigate("SessionPicker");
  };

  const handleMockInterview = (): void => {
    if (!resumeUploaded) return;

    navigation.navigate("MockInterviewList");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Interview App</Text>
      <Text style={styles.subtitle}>
        Upload your resume to unlock interview features
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" />
      ) : (
        <>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate("Resume")}
          >
            <Text style={styles.buttonText}>Resume</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, !resumeUploaded && styles.disabledButton]}
            onPress={handleInterviewCoach}
            disabled={!resumeUploaded}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Interview Coach</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, !resumeUploaded && styles.disabledButton]}
            onPress={handleMockInterview}
            disabled={!resumeUploaded}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Mock Interview</Text>
          </TouchableOpacity>

          {!resumeUploaded && (
            <Text style={styles.note}>Please upload your resume first.</Text>
          )}
        </>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F8FAFC",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    color: "#475569",
    marginBottom: 32,
  },
  button: {
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 16,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#94A3B8",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  note: {
    marginTop: 8,
    textAlign: "center",
    color: "#DC2626",
    fontSize: 14,
  },
});
