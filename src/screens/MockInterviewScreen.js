import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";

import Waveform from "../../components/Waveform";
import useRealtimeWaveform from "../audio/useRealtimeWaveform";
import {
  startInterviewSession,
  submitInterviewAnswer,
  getInterviewFeedback,
} from "../services/interviewApi";

export default function MockInterviewScreen({ route, navigation }) {
  const sessionTitle = route?.params?.sessionTitle || "Mock Interview";
  const candidateId = route?.params?.candidateId || "";

  const { isRecording, bars, start, stop } = useRealtimeWaveform();

  const [seconds, setSeconds] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [sessionFinished, setSessionFinished] = useState(false);

  const [sessionId, setSessionId] = useState("");
  const [questionIndex, setQuestionIndex] = useState(1);
  const [questionText, setQuestionText] = useState("");
  const [statusText, setStatusText] = useState("Preparing your mock session...");
  const [finalFeedback, setFinalFeedback] = useState(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    initializeSession();

    return () => {
      mountedRef.current = false;
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
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.02,
              duration: 650,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 650,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 0.38,
              duration: 650,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0.14,
              duration: 650,
              useNativeDriver: true,
            }),
          ]),
        ])
      );

      pulseLoop.start();
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
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
      if (!text || !text.trim()) return resolve();

      Speech.stop();

      if (mountedRef.current) {
        setIsSpeaking(true);
      }

      Speech.speak(text, {
        language: "en-US",
        rate: 0.95,
        pitch: 1.0,
        onDone: () => {
          if (mountedRef.current) setIsSpeaking(false);
          resolve();
        },
        onStopped: () => {
          if (mountedRef.current) setIsSpeaking(false);
          resolve();
        },
        onError: () => {
          if (mountedRef.current) setIsSpeaking(false);
          resolve();
        },
      });
    });
  };

  const speakQuestion = async (text) => {
    if (!text) return;

    setStatusText("AI is asking the question...");
    await speakTextAsync(text);

    if (mountedRef.current) {
      setStatusText("Tap the mic to start answering.");
    }
  };

  const initializeSession = async () => {
    try {
      setStatusText("Loading first mock question...");

      const data = await startInterviewSession({
        candidateId,
      });

      if (!mountedRef.current) return;

      setSessionId(data.sessionId || "");
      setQuestionIndex(1);
      setQuestionText(data.currentQuestion?.text || "");
      setSessionFinished(false);

      await speakQuestion(data.currentQuestion?.text || "First question.");
    } catch (error) {
      console.log("Mock session init error:", error);

      if (!mountedRef.current) return;

      Alert.alert("Error", error?.message || "Could not start mock interview.");
      setStatusText("Session failed.");
    }
  };

  const handleMicPress = async () => {
    if (isSpeaking || isLoadingNext || sessionFinished) return;

    try {
      if (!isRecording) {
        setSeconds(0);
        setStatusText("Starting microphone...");
        await start();

        if (mountedRef.current) {
          setStatusText("Recording in progress...");
        }
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

      if (!mountedRef.current) return;

      setIsLoadingNext(false);
      setStatusText("Microphone error");

      Alert.alert(
        "Microphone Error",
        error?.message || "Could not access microphone"
      );
    }
  };

  const handleSessionCompletion = async () => {
    try {
      setStatusText("Fetching final feedback...");

      const feedback = await getInterviewFeedback(sessionId);

      if (!mountedRef.current) return;

      setFinalFeedback(feedback);
    } catch (error) {
      console.log("Feedback fetch error:", error);
    }

    if (!mountedRef.current) return;

    setSessionFinished(true);
    setIsLoadingNext(false);
    setStatusText("Session complete.");

    await speakTextAsync("Your mock interview session is completed.");

    if (!mountedRef.current) return;

    Alert.alert(
      "Session Complete",
      "You finished the mock interview.",
      [
        {
          text: "Go Back",
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const handleBackendFlow = async (audioUri) => {
    try {
      setStatusText("Sending answer to backend...");

      const data = await submitInterviewAnswer({
        audioUri,
        sessionId,
      });

      if (!mountedRef.current) return;

      setSeconds(0);

      if (data.sessionComplete) {
        await handleSessionCompletion();
        return;
      }

      const nextQuestionText = data.nextQuestion?.text || "";

      setQuestionIndex((prev) => prev + 1);
      setQuestionText(nextQuestionText);
      setStatusText("Playing next question...");

      await speakQuestion(nextQuestionText || "Next question.");

      if (mountedRef.current) {
        setIsLoadingNext(false);
      }
    } catch (error) {
      console.log("Backend error:", error);

      if (!mountedRef.current) return;

      setIsLoadingNext(false);
      setStatusText("Failed to process answer.");

      Alert.alert("Error", error?.message || "Failed to process recording.");
    }
  };

  const handleReplayQuestion = async () => {
    if (!questionText || isLoadingNext || isRecording || isSpeaking || sessionFinished) {
      return;
    }

    await speakQuestion(questionText);
  };

  const assistantStateText = isRecording
    ? "Listening..."
    : isSpeaking
    ? "Audio Playing..."
    : isLoadingNext
    ? "Processing..."
    : sessionFinished
    ? "Completed"
    : "Tap to Speak";

  const isWeb = Platform.OS === "web";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
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

            <View style={styles.rightTopGroup}>
              <View style={styles.questionNumberPill}>
                <Text style={styles.questionNumberText}>Q{questionIndex}</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.replayButton,
                  (isRecording || isLoadingNext || isSpeaking) &&
                    styles.replayButtonDisabled,
                ]}
                onPress={handleReplayQuestion}
                disabled={isRecording || isLoadingNext || isSpeaking}
                activeOpacity={0.85}
              >
                <Ionicons name="volume-high-outline" size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.questionText}>
            {questionText || "Loading question..."}
          </Text>
        </View>

        <View style={styles.centerSection}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.voiceGlow,
              isWeb ? styles.voiceGlowWeb : styles.voiceGlowMobile,
              {
                opacity: glowAnim,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />

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

              <View style={styles.waveformArea}>
                <View style={styles.waveformClipper}>
                  <View
                    style={[
                      styles.waveformShell,
                      isWeb ? styles.waveformShellWeb : styles.waveformShellMobile,
                    ]}
                  >
                    <Waveform bars={bars} />
                  </View>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.micButtonFloating,
                isRecording && styles.micButtonActive,
                (isSpeaking || isLoadingNext || sessionFinished) &&
                  styles.micButtonDisabled,
              ]}
              onPress={handleMicPress}
              activeOpacity={0.9}
              disabled={isSpeaking || isLoadingNext || sessionFinished}
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

        <View style={styles.bottomCard}>
          <View style={styles.timerRow}>
            <View style={styles.timerPill}>
              <Ionicons name="time-outline" size={16} color="#0F172A" />
              <Text style={styles.timerText}>{formattedTime}</Text>
            </View>
          </View>

          <Text style={styles.statusText}>{statusText}</Text>
        </View>
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
    paddingTop: Platform.OS === "web" ? 20 : 8,
    paddingBottom: 14,
    justifyContent: "space-between",
  },

  headerBlock: {
    marginTop: 4,
    marginBottom: 10,
  },

  screenTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },

  screenSubtitle: {
    marginTop: 4,
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

  rightTopGroup: {
    flexDirection: "row",
    alignItems: "center",
  },

  questionNumberPill: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    marginRight: 10,
  },

  questionNumberText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
  },

  replayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  replayButtonDisabled: {
    opacity: 0.5,
  },

  questionText: {
    marginTop: 16,
    fontSize: 21,
    lineHeight: 31,
    fontWeight: "700",
    color: "#0F172A",
  },

  centerSection: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    minHeight: Platform.OS === "web" ? 360 : 280,
    marginTop: 4,
    marginBottom: 18,
  },

  voiceGlow: {
    position: "absolute",
    backgroundColor: "#2563EB",
  },

  voiceGlowWeb: {
    width: 380,
    height: 380,
    borderRadius: 190,
  },

  voiceGlowMobile: {
    width: 286,
    height: 286,
    borderRadius: 143,
  },

  voiceOrbOuter: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.06)",
    overflow: "visible",
  },

  voiceOrbOuterWeb: {
    width: 350,
    height: 350,
    borderRadius: 175,
  },

  voiceOrbOuterMobile: {
    width: 270,
    height: 270,
    borderRadius: 135,
  },

  voiceOrbInner: {
    backgroundColor: "#071433",
    alignItems: "center",
    justifyContent: "flex-start",
    shadowColor: "#0F172A",
    shadowOpacity: 0.22,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
    overflow: "hidden",
  },

  voiceOrbInnerWeb: {
    width: 316,
    height: 316,
    borderRadius: 158,
    paddingTop: 28,
    paddingBottom: 38,
    paddingHorizontal: 24,
  },

  voiceOrbInnerMobile: {
    width: 240,
    height: 240,
    borderRadius: 120,
    paddingTop: 22,
    paddingBottom: 34,
    paddingHorizontal: 16,
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

  waveformArea: {
    width: "100%",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: Platform.OS === "web" ? 8 : 0,
    paddingBottom: Platform.OS === "web" ? 26 : 22,
  },

  waveformClipper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 999,
  },

  waveformShell: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  waveformShellWeb: {
    width: 226,
    height: 110,
  },

  waveformShellMobile: {
    width: 176,
    height: 84,
  },

  micButtonFloating: {
    position: "absolute",
    bottom: -10,
    alignSelf: "center",
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    zIndex: 20,
  },

  micButtonActive: {
    backgroundColor: "#DC2626",
    shadowColor: "#DC2626",
  },

  micButtonDisabled: {
    opacity: 0.7,
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