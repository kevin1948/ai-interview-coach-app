import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const MOCK_RESULT_DATA = {
  overallScore: 85,
  categories: [
    { name: "Communication", score: 90, icon: "chatbubbles-outline" },
    { name: "Technical Knowledge", score: 82, icon: "code-slash-outline" },
    { name: "Problem Solving", score: 88, icon: "bulb-outline" },
    { name: "Confidence", score: 80, icon: "shield-checkmark-outline" },
  ],
  feedback: [
    {
      type: "strength",
      title: "Strong Communication",
      description:
        "You articulated your thoughts clearly and maintained good structure in your responses.",
    },
    {
      type: "strength",
      title: "Technical Depth",
      description:
        "Demonstrated solid understanding of core concepts with relevant examples.",
    },
    {
      type: "improvement",
      title: "Pace of Speech",
      description:
        "Consider slowing down slightly to emphasize key points more effectively.",
    },
    {
      type: "improvement",
      title: "STAR Method",
      description:
        "Try using the STAR method more consistently for behavioral questions.",
    },
  ],
  questions: [
    { question: "Tell me about yourself", score: 88 },
    { question: "Describe a challenging project", score: 85 },
    { question: "How do you handle pressure?", score: 82 },
    { question: "Where do you see yourself in 5 years?", score: 90 },
    { question: "Why should we hire you?", score: 80 },
  ],
};

export default function MockInterviewResultScreen({ route, navigation }) {
  const session = route?.params?.session || {};
  const sessionTitle = session?.title || "Mock Interview";
  const result = MOCK_RESULT_DATA;

  const getScoreColor = (score) => {
    if (score >= 85) return "#10B981";
    if (score >= 70) return "#F59E0B";
    return "#EF4444";
  };

  const getScoreLabel = (score) => {
    if (score >= 85) return "Excellent";
    if (score >= 70) return "Good";
    return "Needs Improvement";
  };

  const renderScoreRing = () => {
    const score = result.overallScore;
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

  const renderCategoryCard = (category, index) => (
    <View key={index} style={styles.categoryCard}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryIconContainer}>
          <Ionicons name={category.icon} size={20} color="#2563EB" />
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

  const renderFeedbackItem = (item, index) => {
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

  const renderQuestionResult = (item, index) => (
    <View key={index} style={styles.questionRow}>
      <View style={styles.questionNumberBadge}>
        <Text style={styles.questionNumber}>Q{index + 1}</Text>
      </View>
      <Text style={styles.questionText} numberOfLines={1}>
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
  );

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
            Based on {result.questions.length} questions answered
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Breakdown</Text>
          {result.categories.map(renderCategoryCard)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Feedback & Insights</Text>

          <View style={styles.feedbackSubsection}>
            <Text style={styles.feedbackSubtitle}>Strengths</Text>
            {result.feedback
              .filter((f) => f.type === "strength")
              .map(renderFeedbackItem)}
          </View>

          <View style={styles.feedbackSubsection}>
            <Text style={styles.feedbackSubtitle}>Areas for Improvement</Text>
            {result.feedback
              .filter((f) => f.type === "improvement")
              .map(renderFeedbackItem)}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Question Results</Text>
          <View style={styles.questionsCard}>
            {result.questions.map(renderQuestionResult)}
          </View>
        </View>

        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate("MockInterviewSession")}
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
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
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
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "500",
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