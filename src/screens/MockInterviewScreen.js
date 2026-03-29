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
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";

import Waveform from "../../components/Waveform";
import useRealtimeWaveform from "../audio/useRealtimeWaveform";
import {
  startInterviewSession,
  submitMockInterviewAudio,
  getMockInterviewResult,
} from "../services/interviewApi";

const MIN_DURATION_SECONDS = 290;
const AUTO_STOP_SECONDS = 294;
const MAX_ALLOWED_SECONDS = 315;

export default function MockInterviewScreen({ route, navigation }) {
  const sessionTitle = route?.params?.sessionTitle || "Mock Interview";
  const candidateId = route?.params?.candidateId || "";

  const { isRecording, bars, start, stop } = useRealtimeWaveform();

  const [seconds, setSeconds] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [hasStartedRecording, setHasStartedRecording] = useState(false);
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);

  const [sessionId, setSessionId] = useState("");
  const [questions, setQuestions] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [statusText, setStatusText] = useState("Preparing your mock session...");
  const [finalResult, setFinalResult] = useState(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const mountedRef = useRef(true);

  const recordingStartTimeRef = useRef(null);
  const autoStopTriggeredRef = useRef(false);

  const currentQuestion = questions[questionIndex] || null;
  const totalQuestions = questions.length;

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

    if (isRecording && recordingStartTimeRef.current) {
      interval = setInterval(() => {
        const elapsed = Math.floor(
          (Date.now() - recordingStartTimeRef.current) / 1000
        );
        setSeconds(elapsed);
      }, 250);
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
  }, [isRecording, glowAnim, pulseAnim]);

  useEffect(() => {
    if (!isRecording || isSubmitting || sessionFinished) return;
    if (autoStopTriggeredRef.current) return;

    if (seconds >= AUTO_STOP_SECONDS) {
      autoStopTriggeredRef.current = true;
      setHasAutoSubmitted(true);
      handleFinishSession(true);
    }
  }, [seconds, isRecording, isSubmitting, sessionFinished]);

  useEffect(() => {
    if (!isRecording || isSubmitting || sessionFinished) return;

    if (seconds < MIN_DURATION_SECONDS) {
      setStatusText(
        "Recording in progress. Keep answering clearly. Minimum required duration not reached yet."
      );
    } else if (seconds < AUTO_STOP_SECONDS) {
      setStatusText(
        "Good progress. You can submit now or continue speaking until auto-stop."
      );
    } else if (seconds <= MAX_ALLOWED_SECONDS) {
      setStatusText("Finalizing your mock interview...");
    }
  }, [seconds, isRecording, isSubmitting, sessionFinished]);

  const formattedTime = useMemo(() => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [seconds]);

  const progressText = useMemo(() => {
    if (!isRecording) {
      return `Required: ${MIN_DURATION_SECONDS}s minimum`;
    }

    if (seconds < MIN_DURATION_SECONDS) {
      return `Minimum submission time remaining: ${MIN_DURATION_SECONDS - seconds}s`;
    }

    if (seconds < AUTO_STOP_SECONDS) {
      return `You can submit now or recording will auto-stop in ${AUTO_STOP_SECONDS - seconds}s`;
    }

    return "Auto-submitting...";
  }, [seconds, isRecording]);

  const speakTextAsync = (text) => {
    return new Promise((resolve) => {
      if (!text || !text.trim()) {
        resolve();
        return;
      }

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

  const speakCurrentQuestion = async (
    indexToSpeak = questionIndex,
    questionsList = questions
  ) => {
    const question = questionsList[indexToSpeak];

    if (!question?.text) return;

    setStatusText("AI is asking the question...");
    await speakTextAsync(question.text);

    if (!mountedRef.current) return;

    if (!hasStartedRecording) {
      setStatusText("Tap the mic to start the full mock interview recording.");
    } else if (seconds < MIN_DURATION_SECONDS) {
      setStatusText(
        "Answer this question clearly and continue speaking without long pauses."
      );
    } else {
      setStatusText(
        "Answer this question clearly. You may submit now or continue."
      );
    }
  };

  const initializeSession = async () => {
    try {
      setStatusText("Loading mock interview questions...");

      const data = await startInterviewSession({
        candidateId,
      });

      if (!mountedRef.current) return;

      const fetchedQuestions = Array.isArray(data?.questions)
        ? data.questions
        : [];

      setSessionId(data.sessionId || "");
      setQuestions(fetchedQuestions);
      setQuestionIndex(0);
      setSessionFinished(false);
      setFinalResult(null);
      setHasStartedRecording(false);
      setHasAutoSubmitted(false);
      setSeconds(0);
      recordingStartTimeRef.current = null;
      autoStopTriggeredRef.current = false;

      if (!fetchedQuestions.length) {
        throw new Error("No mock interview questions received.");
      }

      await speakCurrentQuestion(0, fetchedQuestions);
    } catch (error) {
      console.log("Mock session init error:", error);

      if (!mountedRef.current) return;

      Alert.alert("Error", error?.message || "Could not start mock interview.");
      setStatusText("Session failed.");
    }
  };

  const handleStartRecording = async () => {
    try {
      setStatusText("Starting full-session recording...");
      await start();

      if (!mountedRef.current) return;

      recordingStartTimeRef.current = Date.now();
      autoStopTriggeredRef.current = false;
      setHasStartedRecording(true);
      setHasAutoSubmitted(false);
      setSeconds(0);
      setStatusText(
        "Recording started. Keep answering clearly without long pauses."
      );
    } catch (error) {
      console.log("Start recording error:", error);

      if (!mountedRef.current) return;

      setStatusText("Microphone error");
      Alert.alert(
        "Microphone Error",
        error?.message || "Could not access microphone."
      );
    }
  };

  const handleNextQuestion = async () => {
    if (!hasStartedRecording || !isRecording) {
      Alert.alert(
        "Start Recording First",
        "Please start the recording before moving to the next question."
      );
      return;
    }

    if (isSpeaking || isSubmitting || sessionFinished) return;

    const nextIndex = questionIndex + 1;

    if (nextIndex >= questions.length) {
      Alert.alert(
        "All Questions Reached",
        seconds >= MIN_DURATION_SECONDS
          ? "You have reached the final question. You can submit now or continue until auto-stop."
          : "You have reached the final question. Keep speaking until the minimum duration is reached."
      );
      return;
    }

    setQuestionIndex(nextIndex);
    await speakCurrentQuestion(nextIndex, questions);
  };

  const handleFinishSession = async (isAutoFinish = false) => {
    if (!hasStartedRecording || !isRecording) {
      Alert.alert(
        "Recording Not Started",
        "Please start the recording before finishing the session."
      );
      return;
    }

    if (!isAutoFinish && seconds < MIN_DURATION_SECONDS) {
      Alert.alert(
        "Recording Too Short",
        `Please continue the mock interview for at least ${MIN_DURATION_SECONDS} seconds before submitting.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setStatusText(
        isAutoFinish
          ? "Stopping recording automatically..."
          : "Stopping recording..."
      );

      const audioUri = await stop();
      recordingStartTimeRef.current = null;

      if (!audioUri) {
        throw new Error("No recording produced.");
      }

      if (!mountedRef.current) return;

      setStatusText("Uploading full mock interview audio...");
      await submitMockInterviewAudio({
        audioUri,
        sessionId,
      });

      if (!mountedRef.current) return;

      setStatusText("Fetching final result...");
      const result = await getMockInterviewResult(sessionId);

      if (!mountedRef.current) return;

      setFinalResult(result);
      setSessionFinished(true);
      setIsSubmitting(false);
      setStatusText("Session complete.");

      const spokenSummary =
        result?.gapAnalysis || "Your mock interview has been completed.";
      await speakTextAsync(spokenSummary);

      if (!mountedRef.current) return;

      Alert.alert("Session Complete", "Your mock interview result is ready.");
    } catch (error) {
      console.log("Finish session error:", error);

      recordingStartTimeRef.current = null;

      if (!mountedRef.current) return;

      setIsSubmitting(false);
      setStatusText("Failed to complete session.");
      setHasAutoSubmitted(false);
      autoStopTriggeredRef.current = false;

      Alert.alert(
        "Error",
        error?.message || "Failed to complete mock interview."
      );
    }
  };

  const handleReplayQuestion = async () => {
    if (
      !currentQuestion?.text ||
      isSubmitting ||
      isSpeaking ||
      sessionFinished
    ) {
      return;
    }

    await speakCurrentQuestion(questionIndex, questions);
  };

  const handlePracticeAgain = () => {
    navigation.replace("MockInterviewSession", {
      sessionTitle: "New Mock Interview",
      candidateId,
    });
  };

  const assistantStateText = isSubmitting
    ? "Processing..."
    : isSpeaking
    ? "Audio Playing..."
    : sessionFinished
    ? "Completed"
    : isRecording
    ? "Recording..."
    : "Ready";

  const isWeb = Platform.OS === "web";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
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

            <View style={styles.rightTopGroup}>
              <View style={styles.questionNumberPill}>
                <Text style={styles.questionNumberText}>
                  {sessionFinished
                    ? `${totalQuestions}/${totalQuestions}`
                    : `${Math.min(questionIndex + 1, totalQuestions)}/${totalQuestions || 0}`}
                </Text>
              </View>

              {!sessionFinished && (
                <TouchableOpacity
                  style={[
                    styles.replayButton,
                    (isSubmitting || isSpeaking) && styles.replayButtonDisabled,
                  ]}
                  onPress={handleReplayQuestion}
                  disabled={isSubmitting || isSpeaking}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="volume-high-outline"
                    size={18}
                    color="#0F172A"
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <Text style={styles.questionText}>
            {sessionFinished
              ? "Mock interview completed successfully."
              : currentQuestion?.text || "Loading question..."}
          </Text>
        </View>

        {!sessionFinished ? (
          <>
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
                          isWeb
                            ? styles.waveformShellWeb
                            : styles.waveformShellMobile,
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
                    (isSpeaking || isSubmitting || sessionFinished) &&
                      styles.micButtonDisabled,
                  ]}
                  onPress={handleStartRecording}
                  activeOpacity={0.9}
                  disabled={
                    isRecording || isSpeaking || isSubmitting || sessionFinished
                  }
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Ionicons name="mic" size={30} color="#fff" />
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

              <Text style={styles.progressText}>{progressText}</Text>
              <Text style={styles.statusText}>{statusText}</Text>

              <View style={styles.actionButtonsWrapper}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.secondaryActionButton,
                    (!hasStartedRecording || isSpeaking || isSubmitting) &&
                      styles.actionButtonDisabled,
                  ]}
                  onPress={handleNextQuestion}
                  disabled={!hasStartedRecording || isSpeaking || isSubmitting}
                  activeOpacity={0.85}
                >
                  <Text style={styles.secondaryActionButtonText}>
                    Next Question
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.primaryActionButton,
                    (!hasStartedRecording ||
                      isSpeaking ||
                      isSubmitting ||
                      seconds < MIN_DURATION_SECONDS) &&
                      styles.actionButtonDisabled,
                  ]}
                  onPress={() => handleFinishSession(false)}
                  disabled={
                    !hasStartedRecording ||
                    isSpeaking ||
                    isSubmitting ||
                    seconds < MIN_DURATION_SECONDS
                  }
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.primaryActionButtonText}>Submit Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.feedbackSection}>
            <View style={styles.feedbackCard}>
              <View style={styles.feedbackHeader}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                <Text style={styles.feedbackTitle}>Gap Analysis</Text>
              </View>

              <Text style={styles.feedbackBody}>
                {finalResult?.gapAnalysis || "No gap analysis available."}
              </Text>
            </View>

            {!!finalResult?.responses?.length && (
              <View style={styles.responsesCard}>
                <Text style={styles.responsesTitle}>Responses Review</Text>

                {finalResult.responses.map((item, index) => (
                  <View
                    key={`${item.questionText}-${index}`}
                    style={styles.responseItem}
                  >
                    <Text style={styles.responseQuestion}>
                      Q{index + 1}. {item.questionText}
                    </Text>

                    {!!item.userAnswer ? (
                      <Text style={styles.responseAnswer}>
                        Answer: {item.userAnswer}
                      </Text>
                    ) : null}

                    {typeof item.confidenceScore === "number" ? (
                      <Text style={styles.responseMeta}>
                        Confidence: {(item.confidenceScore * 100).toFixed(0)}%
                      </Text>
                    ) : null}

                    {!!item.feedback ? (
                      <Text style={styles.responseFeedback}>
                        Feedback: {item.feedback}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}

            <View style={styles.completedInfoCard}>
              <Text style={styles.completedInfoText}>{statusText}</Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handlePracticeAgain}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Practice Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
  },

  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "web" ? 20 : 8,
    paddingBottom: 24,
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
    marginBottom: 16,
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

  progressText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#2563EB",
    fontWeight: "700",
    marginBottom: 8,
  },

  statusText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#64748B",
    fontWeight: "500",
  },

  actionButtonsWrapper: {
    marginTop: 16,
    gap: 10,
  },

  actionButton: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  actionButtonDisabled: {
    opacity: 0.5,
  },

  secondaryActionButton: {
    backgroundColor: "#E2E8F0",
  },

  secondaryActionButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },

  primaryActionButton: {
    backgroundColor: "#2563EB",
  },

  primaryActionButtonText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  feedbackSection: {
    marginTop: 8,
  },

  feedbackCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    marginBottom: 14,
  },

  feedbackHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  feedbackTitle: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },

  feedbackBody: {
    fontSize: 15,
    lineHeight: 24,
    color: "#475569",
    fontWeight: "500",
  },

  responsesCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },

  responsesTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 14,
  },

  responseItem: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 14,
    marginTop: 14,
  },

  responseQuestion: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },

  responseAnswer: {
    fontSize: 14,
    lineHeight: 21,
    color: "#334155",
    marginBottom: 6,
  },

  responseMeta: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
    marginBottom: 6,
  },

  responseFeedback: {
    fontSize: 14,
    lineHeight: 21,
    color: "#475569",
  },

  completedInfoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },

  completedInfoText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },

  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 12,
  },

  primaryButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
  },
});