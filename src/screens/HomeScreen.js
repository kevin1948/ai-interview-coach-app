import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [resumeUploaded, setResumeUploaded] = useState(false);

  useEffect(() => {
    fetchProfileStatus();
  }, []);

  const fetchProfileStatus = async () => {
  try {
    // Temporary mock backend response
    const response = { resumeUploaded: true }; 

    setResumeUploaded(response.resumeUploaded);
  } catch (error) {
    console.log("Failed to fetch profile status:", error);
  } finally {
    setLoading(false);
  }
};

  const handleInterviewCoach = () => {
    if (!resumeUploaded) return;
    navigation.navigate("SessionPicker");
  };

  const handleMockInterview = () => {
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
        <ActivityIndicator size="large" />
      ) : (
        <>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate("Resume")}
          >
            <Text style={styles.buttonText}>Resume</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              !resumeUploaded && styles.disabledButton
            ]}
            onPress={handleInterviewCoach}
            disabled={!resumeUploaded}
          >
            <Text style={styles.buttonText}>Interview Coach</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              !resumeUploaded && styles.disabledButton
            ]}
            onPress={handleMockInterview}
            disabled={!resumeUploaded}
          >
            <Text style={styles.buttonText}>Mock Interview</Text>
          </TouchableOpacity>

          {!resumeUploaded && (
            <Text style={styles.note}>
              Please upload your resume first.
            </Text>
          )}
        </>
      )}
    </View>
  );
}

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