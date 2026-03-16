import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";

import Waveform from "../../components/Waveform";
import useRealtimeWaveform from "../audio/useRealtimeWaveform";
import {
  startInterviewSession,
  submitInterviewAnswer,
} from "../services/interviewApi";

export default function MockInterviewScreen({ route }) {
  const sessionIdFromRoute = route?.params?.sessionId || "";
  const sessionTitle = route?.params?.sessionTitle || "Mock Interview";

  const { isRecording, bars, start, stop } = useRealtimeWaveform();

  const [seconds, setSeconds] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingNext, setIsLoadingNext] = useState(false);

  const [sessionId, setSessionId] = useState(sessionIdFromRoute);
  const [questionIndex, setQuestionIndex] = useState(1);
  const [questionText, setQuestionText] = useState("");
  const [statusText, setStatusText] = useState("Preparing your mock session...");
  const [simpleResponse, setSimpleResponse] = useState("");

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    initializeSession();

    return () => {
      Speech.stop();
    };
  }, []);

  useEffect(() => {
    let interval;

    if (isRecording) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    let pulseLoop;

    if (isRecording) {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ])
      );

      pulseLoop.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => pulseLoop?.stop();
  }, [isRecording]);

  const formattedTime = useMemo(() => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [seconds]);

  const speakTextAsync = (text) => {
    return new Promise((resolve) => {
      if (!text) return resolve();

      setIsSpeaking(true);
      Speech.stop();

      Speech.speak(text, {
        language: "en-US",
        rate: 0.95,
        onDone: () => {
          setIsSpeaking(false);
          resolve();
        },
        onStopped: () => {
          setIsSpeaking(false);
          resolve();
        },
        onError: () => {
          setIsSpeaking(false);
          resolve();
        },
      });
    });
  };

  const speakQuestion = async (text) => {
    setStatusText("AI is asking the question...");
    await speakTextAsync(text);
    setStatusText("Tap the mic to start answering.");
  };

  const initializeSession = async () => {
    try {
      setStatusText("Loading first mock question...");

      const data = await startInterviewSession("Mock");

      setSessionId(data.sessionId || "");
      setQuestionIndex(data.questionNumber || 1);
      setQuestionText(data.questionText || "");

      await speakQuestion(data.questionText || "First question.");
    } catch (error) {
      console.log("Session init error:", error);
      Alert.alert("Error", "Could not start mock interview.");
      setStatusText("Session failed.");
    }
  };

  const handleMicPress = async () => {
    if (isSpeaking || isLoadingNext) return;

    try {
      if (!isRecording) {
        setSeconds(0);
        setSimpleResponse("");
        setStatusText("Starting microphone...");
        await start();
        setStatusText("Recording in progress...");
      } else {
        setStatusText("Stopping recording...");
        setIsLoadingNext(true);

        const audioUri = await stop();

        if (!audioUri) {
          throw new Error("No recording produced.");
        }

        await handleBackendFlow(audioUri);
      }
    } catch (error) {
      console.log("Mic error:", error);
      setIsLoadingNext(false);
      setStatusText("Microphone error");

      Alert.alert(
        "Microphone Error",
        error?.message || "Could not access microphone"
      );
    }
  };

  const handleBackendFlow = async (audioUri) => {
    try {
      const data = await submitInterviewAnswer({
        audioUri,
        sessionType: "Mock",
        questionNumber: questionIndex,
        sessionId,
      });

      setSimpleResponse("Response recorded successfully.");
      setStatusText("Saving your answer...");
      await speakTextAsync("Response recorded. Moving to the next question.");

      if (data.isSessionComplete) {
        setIsLoadingNext(false);
        setSeconds(0);
        setStatusText("Session complete.");
        Alert.alert("Session Complete", "You finished the mock interview.");
        return;
      }

      setQuestionIndex(data.questionNumber || questionIndex + 1);
      setQuestionText(data.nextQuestionText || "");
      setSeconds(0);

      setStatusText("Next question...");
      await speakTextAsync(data.nextQuestionText);

      setIsLoadingNext(false);
      setStatusText("Tap the mic to answer.");
      setSimpleResponse("");
    } catch (error) {
      console.log("Backend error:", error);
      setIsLoadingNext(false);
      setStatusText("Failed to process answer.");
      Alert.alert("Error", "Failed to process recording.");
    }
  };

  const handleReplayQuestion = async () => {
    if (!questionText || isLoadingNext || isRecording) return;
    await speakQuestion(questionText);
  };

  const assistantStateText = isRecording
    ? "Listening..."
    : isSpeaking
    ? "Playing question..."
    : isLoadingNext
    ? "Processing..."
    : "Tap to Speak";

  const isWeb = Platform.OS === "web";

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerBlock}>
            <Text style={styles.screenTitle}>Mock Interview</Text>
            <Text style={styles.screenSubtitle}>{sessionTitle}</Text>
          </View>

          <View style={styles.questionCard}>
            <View style={styles.questionTopRow}>
              <View style={styles.questionBadge}>
                <Ionicons name="sparkles" size={15} color="#2563EB" />
                <Text style={styles.questionBadgeText}>AI Question</Text>
              </View>

              <TouchableOpacity
                style={styles.replayButton}
                onPress={handleReplayQuestion}
                disabled={isRecording || isLoadingNext}
                activeOpacity={0.85}
              >
                <Ionicons name="volume-high-outline" size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <Text style={styles.questionText}>
              {questionText || "Loading question..."}
            </Text>
          </View>

          {simpleResponse ? (
            <View style={styles.responseCard}>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color="#16A34A"
                style={styles.responseIcon}
              />
              <Text style={styles.responseText}>{simpleResponse}</Text>
            </View>
          ) : null}

          <View style={styles.centerSection}>
            <Animated.View
              style={[
                styles.voiceGlow,
                isWeb ? styles.voiceGlowWeb : styles.voiceGlowMobile,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <View
                style={[
                  styles.voiceOrbOuter,
                  isWeb ? styles.voiceOrbOuterWeb : styles.voiceOrbOuterMobile,
                ]}
              >
                <View
                  style={[
                    styles.voiceOrbInner,
                    isWeb ? styles.voiceOrbInnerWeb : styles.voiceOrbInnerMobile,
                  ]}
                >
                  <Text style={styles.orbTitle}>Voice Response</Text>
                  <Text style={styles.orbSubTitle}>{assistantStateText}</Text>

                  <View
                    style={[
                      styles.waveformShell,
                      isWeb ? styles.waveformShellWeb : styles.waveformShellMobile,
                    ]}
                  >
                    <Waveform bars={bars} />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.micButton,
                      isRecording && styles.micButtonActive,
                    ]}
                    onPress={handleMicPress}
                    activeOpacity={0.9}
                  >
                    {isLoadingNext ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Ionicons
                        name={isRecording ? "stop" : "mic"}
                        size={30}
                        color="#fff"
                      />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </View>

          <View style={styles.bottomCard}>
            <View style={styles.timerRow}>
              <View style={styles.timerPill}>
                <Ionicons name="time-outline" size={16} color="#0F172A" />
                <Text style={styles.timerText}>{formattedTime}</Text>
              </View>
            </View>

            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#EEF4FF",
  },

  container: {
    flex: 1,
    backgroundColor: "#EEF4FF",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "web" ? 24 : 8,
  },

  scrollContent: {
    paddingBottom: 28,
  },

  headerBlock: {
    marginTop: 8,
    marginBottom: 16,
  },

  screenTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },

  screenSubtitle: {
    marginTop: 6,
    fontSize: 15,
    color: "#64748B",
    fontWeight: "500",
  },

  questionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  questionTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  questionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },

  questionBadgeText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },

  replayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  questionText: {
    marginTop: 16,
    fontSize: 21,
    lineHeight: 31,
    fontWeight: "700",
    color: "#0F172A",
  },

  responseCard: {
    marginTop: 16,
    backgroundColor: "#F0FDF4",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },

  responseIcon: {
    marginRight: 8,
  },

  responseText: {
    color: "#166534",
    fontSize: 14,
    fontWeight: "600",
  },

  centerSection: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 34,
    marginBottom: 28,
  },

  voiceGlow: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(37,99,235,0.08)",
  },

  voiceGlowWeb: {
    width: 420,
    height: 420,
    borderRadius: 210,
  },

  voiceGlowMobile: {
    width: 360,
    height: 360,
    borderRadius: 180,
  },

  voiceOrbOuter: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.12)",
  },

  voiceOrbOuterWeb: {
    width: 370,
    height: 370,
    borderRadius: 185,
  },

  voiceOrbOuterMobile: {
    width: 320,
    height: 320,
    borderRadius: 160,
  },

  voiceOrbInner: {
    backgroundColor: "#071433",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.22,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },

  voiceOrbInnerWeb: {
    width: 332,
    height: 332,
    borderRadius: 166,
    paddingTop: 34,
    paddingBottom: 26,
    paddingHorizontal: 28,
  },

  voiceOrbInnerMobile: {
    width: 286,
    height: 286,
    borderRadius: 143,
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 24,
  },

  orbTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  orbSubTitle: {
    marginTop: 6,
    color: "rgba(226,232,240,0.8)",
    fontSize: 14,
    fontWeight: "600",
  },

  waveformShell: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  waveformShellWeb: {
    width: 245,
    height: 170,
    marginTop: 26,
  },

  waveformShellMobile: {
    width: 210,
    height: 150,
    marginTop: 24,
  },

  micButton: {
    marginTop: 14,
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },

  micButtonActive: {
    backgroundColor: "#DC2626",
    shadowColor: "#DC2626",
  },

  bottomCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
  },

  timerText: {
    marginLeft: 7,
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },

  statusText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#64748B",
    fontWeight: "500",
  },
});