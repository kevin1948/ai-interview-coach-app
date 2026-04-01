import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLazyGetMockInterviewResultQuery } from "./mockInterviewApiSlice";
import type { NavigationBridge } from "../../lib/navigationBridge";

import type { SessionParam } from "../../types/mockInterview";

/** Route-params shape this screen expects. */
interface MockInterviewResultRouteParams {
  session?: SessionParam;
}

/** Route object shape injected by the Expo Router wrapper. */
interface MockInterviewResultRoute {
  key?:    string;
  name?:   string;
  params?: MockInterviewResultRouteParams;
}

/** Component props. */
interface Props {
  route?:      MockInterviewResultRoute;
  navigation:  NavigationBridge;
}

// ── Raw backend payload ────────────────────────────────────────────────────────

/**
 * Shape of a single response item returned by the backend.
 * `is_correct` may be absent on incomplete responses.
 */
interface BackendResponseItem {
  question_text?:    string;
  confidence_score?: number;
  feedback?:         string;
  user_answer?:      string;
  is_correct?:       boolean;
}

interface BackendResultPayload {
  responses?: BackendResponseItem[];
  gap_analysis?: string;
}

// ── Normalised UI models ───────────────────────────────────────────────────────

interface NormalizedCategory {
  name:  string;
  icon:  string;
  score: number;
}

interface NormalizedFeedbackItem {
  type:        "strength" | "improvement";
  title:       string;
  description: string;
}

interface NormalizedQuestion {
  question:   string;
  score:      number;
  feedback:   string;
  userAnswer: string;
  isCorrect?: boolean;
}

interface NormalizedResult {
  overallScore: number;
  categories:   NormalizedCategory[];
  feedback:     NormalizedFeedbackItem[];
  questions:    NormalizedQuestion[];
  gapAnalysis:  string;
}

/** Empty result used while loading or when data is absent. */
const EMPTY_RESULT: NormalizedResult = {
  overallScore: 0,
  categories:   [],
  feedback:     [],
  questions:    [],
  gapAnalysis:  "",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function MockInterviewResultScreen({ route, navigation }: Props) {
  const session      = route?.params?.session || {};
  const sessionTitle = session?.title || "Mock Interview";
  const sessionId    = session?.id    || "";

  const [loading, setLoading] = useState<boolean>(true);
  const [result,  setResult]  = useState<BackendResultPayload | null>(null);

  // RTK Query lazy hook — replaces getMockInterviewResult import
  const [triggerGetMockInterviewResult] = useLazyGetMockInterviewResultQuery();

  useEffect(() => {
    fetchResult();
  }, [sessionId]);

  const fetchResult = async (): Promise<void> => {
    try {
      if (!sessionId) {
        throw new Error("Session ID not found.");
      }

      const queryResult = await triggerGetMockInterviewResult(sessionId);
      if (queryResult.error) {
        // RTK Query error is a discriminated union (FetchBaseQueryError | SerializedError).
        // Cast to access data/error fields consistently with original JS behaviour.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errData = (queryResult.error as any)?.data;
        throw new Error(
          errData?.message || errData?.detail ||
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (queryResult.error as any)?.error ||
          "Failed to load result."
        );
      }

      // The slice types result as `unknown`; narrow via BackendResultPayload.
      setResult(queryResult.data as BackendResultPayload);
    } catch (error) {
      console.log("Failed to fetch mock result:", error);
      Alert.alert("Error", (error as Error)?.message || "Failed to load result.");
    } finally {
      setLoading(false);
    }
  };

  const normalizedResult = useMemo<NormalizedResult>(() => {
    if (!result) return EMPTY_RESULT;

    const responses: BackendResponseItem[] =
      Array.isArray(result.responses) ? result.responses : [];

    const confidenceValues: number[] = responses
      .map((item): number | null =>
        typeof item.confidence_score === "number"
          ? Math.round(
              item.confidence_score <= 1
                ? item.confidence_score * 100
                : item.confidence_score
            )
          : null
      )
      .filter((item): item is number => typeof item === "number");

    const overallScore: number = confidenceValues.length
      ? Math.round(
          confidenceValues.reduce((sum, value) => sum + value, 0) /
            confidenceValues.length
        )
      : 0;

    const questions: NormalizedQuestion[] = responses.map((item) => ({
      question: item.question_text || "Question",
      score:
        typeof item.confidence_score === "number"
          ? Math.round(
              item.confidence_score <= 1
                ? item.confidence_score * 100
                : item.confidence_score
            )
          : 0,
      feedback:   item.feedback   || "",
      userAnswer: item.user_answer || "",
      isCorrect:  item.is_correct,
    }));

    const strongResponses = responses.filter(
      (item) => item.feedback && !item.feedback.toLowerCase().includes("improve")
    );

    const improvementResponses = responses.filter(
      (item) =>
        item.feedback &&
        (item.feedback.toLowerCase().includes("improve") ||
          item.feedback.toLowerCase().includes("missing") ||
          item.feedback.toLowerCase().includes("add") ||
          item.feedback.toLowerCase().includes("better"))
    );

    const feedback: NormalizedFeedbackItem[] = [
      ...strongResponses.slice(0, 2).map(
        (item): NormalizedFeedbackItem => ({
          type:        "strength",
          title:       "Strong Response",
          description: item.feedback || "",
        })
      ),
      ...improvementResponses.slice(0, 2).map(
        (item): NormalizedFeedbackItem => ({
          type:        "improvement",
          title:       "Needs Improvement",
          description: item.feedback || "",
        })
      ),
    ];

    const categories: NormalizedCategory[] = [
      {
        name:  "Confidence",
        icon:  "analytics-outline",
        score: overallScore,
      },
      {
        name:  "Correctness",
        icon:  "checkmark-done-outline",
        score: responses.length
          ? Math.round(
              (responses.filter((item) => item.is_correct === true).length /
                responses.length) *
                100
            )
          : 0,
      },
      {
        name:  "Clarity",
        icon:  "chatbubble-ellipses-outline",
        score: overallScore,
      },
    ];

    const gapAnalysis = result.gap_analysis || "";
    return { overallScore, categories, feedback, questions, gapAnalysis };
  }, [result]);

  const getScoreColor = (score: number): string => {
    if (score >= 85) return "#10B981";
    if (score >= 70) return "#F59E0B";
    return "#EF4444";
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 85) return "Excellent";
    if (score >= 70) return "Good";
    return "Needs Improvement";
  };

  const renderScoreRing = (): React.ReactElement => {
    const score = normalizedResult.overallScore;
    const color = getScoreColor(score);

    return (
      <View style={styles.scoreRingContainer}>
        <View style={[styles.scoreRingOuter, { borderColor: color + "30" }]}>
          <View style={[styles.scoreRingInner, { borderColor: color }]}>
            <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
            <Text style={styles.scoreLabel}>{getScoreLabel(score)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderCategoryCard = (category: NormalizedCategory, index: number): React.ReactElement => (
    <View key={index} style={styles.categoryCard}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryIconContainer}>
          <Ionicons name={category.icon as never} size={20} color="#2563EB" />
        </View>
        <Text style={styles.categoryName}>{category.name}</Text>
        <Text
          style={[styles.categoryScore, { color: getScoreColor(category.score) }]}
        >
          {category.score}%
        </Text>
      </View>
      <View style={styles.categoryBar}>
        <View
          style={[
            styles.categoryBarFill,
            {
              width: `${category.score}%`,
              backgroundColor: getScoreColor(category.score),
            },
          ]}
        />
      </View>
    </View>
  );

  const renderFeedbackItem = (item: NormalizedFeedbackItem, index: number): React.ReactElement => {
    const isStrength = item.type === "strength";
    return (
      <View
        key={index}
        style={[
          styles.feedbackCard,
          isStrength ? styles.feedbackStrength : styles.feedbackImprovement,
        ]}
      >
        <View style={styles.feedbackHeader}>
          <Ionicons
            name={isStrength ? "checkmark-circle" : "alert-circle"}
            size={22}
            color={isStrength ? "#10B981" : "#F59E0B"}
          />
          <Text style={styles.feedbackTitle}>{item.title}</Text>
        </View>
        <Text style={styles.feedbackDescription}>{item.description}</Text>
      </View>
    );
  };

  const renderQuestionResult = (item: NormalizedQuestion, index: number): React.ReactElement => (
    <View key={index} style={styles.questionRow}>
      <View style={styles.questionHeader}>
        <View style={styles.questionNumberBadge}>
          <Text style={styles.questionNumber}>Q{index + 1}</Text>
        </View>
        <Text style={styles.questionText}>
          {item.question}
        </Text>
        <View
          style={[
            styles.questionScoreBadge,
            { backgroundColor: getScoreColor(item.score) + "20" },
          ]}
        >
          <Text
            style={[styles.questionScore, { color: getScoreColor(item.score) }]}
          >
            {item.score}%
          </Text>
        </View>
      </View>
      
      <View style={styles.answerSection}>
        <Text style={styles.answerLabel}>Your Answer:</Text>
        <Text style={styles.answerText}>{item.userAnswer || "No answer provided"}</Text>
      </View>
      
      <View style={styles.feedbackSection}>
        <Text style={styles.answerLabel}>Feedback:</Text>
        <Text style={styles.feedbackText}>{item.feedback || "Pending feedback"}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loaderText}>Loading interview analysis...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Interview Analysis</Text>
          <Text style={styles.sessionTitle}>{sessionTitle}</Text>
        </View>

        <View style={styles.scoreCard}>
          {renderScoreRing()}
          <Text style={styles.scoreCardTitle}>Overall Performance</Text>
          <Text style={styles.scoreCardSubtitle}>
            Based on {normalizedResult.questions.length} questions answered
          </Text>
        </View>

        {normalizedResult.gapAnalysis ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gap Analysis</Text>
            <View style={styles.gapAnalysisCard}>
              <Ionicons name="analytics" size={24} color="#2563EB" style={styles.gapIcon} />
              <Text style={styles.gapAnalysisText}>{normalizedResult.gapAnalysis}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Breakdown</Text>
          {normalizedResult.categories.map(renderCategoryCard)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Feedback & Insights</Text>

          <View style={styles.feedbackSubsection}>
            <Text style={styles.feedbackSubtitle}>Strengths</Text>
            {normalizedResult.feedback
              .filter((f) => f.type === "strength")
              .map(renderFeedbackItem)}
          </View>

          <View style={styles.feedbackSubsection}>
            <Text style={styles.feedbackSubtitle}>Areas for Improvement</Text>
            {normalizedResult.feedback
              .filter((f) => f.type === "improvement")
              .map(renderFeedbackItem)}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Question Results</Text>
          <View style={styles.questionsCard}>
            {normalizedResult.questions.map(renderQuestionResult)}
          </View>
        </View>

        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
              navigation.navigate("MockInterviewSession", {
                sessionTitle: "New Mock Interview",
              })
            }
            activeOpacity={0.85}
          >
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Practice Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate("MockInterviewList")}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryButtonText}>Back to Sessions</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
  },
  header: {
    paddingTop: Platform.OS === "web" ? 24 : 16,
    paddingBottom: 20,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  sessionTitle: {
    marginTop: 6,
    fontSize: 15,
    color: "#64748B",
    fontWeight: "500",
  },
  scoreCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  scoreRingContainer: {
    marginBottom: 16,
  },
  scoreRingOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreRingInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 6,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  scoreNumber: {
    fontSize: 36,
    fontWeight: "800",
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 2,
  },
  scoreCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  scoreCardSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 14,
  },
  categoryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  categoryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  categoryName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  categoryScore: {
    fontSize: 16,
    fontWeight: "700",
  },
  categoryBar: {
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    overflow: "hidden",
  },
  categoryBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  feedbackSubsection: {
    marginBottom: 16,
  },
  feedbackSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 10,
  },
  feedbackCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  feedbackStrength: {
    backgroundColor: "#F0FDF4",
    borderLeftColor: "#10B981",
  },
  feedbackImprovement: {
    backgroundColor: "#FFFBEB",
    borderLeftColor: "#F59E0B",
  },
  feedbackHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  feedbackTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    marginLeft: 8,
  },
  feedbackDescription: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
    marginLeft: 30,
  },
  questionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 6,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  questionRow: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  questionNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  questionNumber: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  questionText: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "600",
    lineHeight: 22,
    marginRight: 12,
  },
  questionScoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  questionScore: {
    fontSize: 13,
    fontWeight: "700",
  },
  answerSection: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  feedbackSection: {
    backgroundColor: "#F0FDF4",
    padding: 12,
    borderRadius: 10,
  },
  answerLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 4,
  },
  answerText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
  },
  feedbackText: {
    fontSize: 14,
    color: "#065F46",
    lineHeight: 20,
  },
  gapAnalysisCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  gapIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  gapAnalysisText: {
    flex: 1,
    fontSize: 14,
    color: "#1E3A8A",
    lineHeight: 22,
  },
  actionsSection: {
    marginTop: 8,
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
    shadowColor: "#2563EB",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryButtonText: {
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
