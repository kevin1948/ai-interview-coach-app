import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { getMockInterviewSessions } from "../services/mockInterviewApi";

export default function MockInterviewListScreen({ navigation }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Refresh sessions when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchSessions();
    }, [])
  );

  const fetchSessions = async () => {
    try {
      const userId = "current-user"; // Replace with actual user ID from auth
      const response = await getMockInterviewSessions(userId);

      // Transform API response to component format
      const formattedSessions = response.sessions.map((session) => ({
        id: session.session_id,
        title: session.title || "Mock Interview",
        date: session.created_at,
        questionsAnswered: session.questions_answered,
        totalQuestions: session.total_questions,
        status: session.status === "in_progress" ? "incomplete" : session.status,
        score: session.score,
      }));

      setSessions(formattedSessions);
    } catch (error) {
      console.log("Failed to fetch sessions:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSessions();
  };

  const handleSessionPress = (session) => {
    if (session.status === "completed") {
      navigation.navigate("MockInterviewResult", { session });
    } else {
      // Resume incomplete session
      navigation.navigate("MockInterviewSession", {
        sessionId: session.id,
        sessionTitle: session.title,
      });
    }
  };

  const handleNewSession = () => {
    navigation.navigate("MockInterviewSession", {
      sessionTitle: "New Mock Interview",
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusColor = (status) => {
    return status === "completed" ? "#10B981" : "#F59E0B";
  };

  const getStatusText = (status) => {
    return status === "completed" ? "Completed" : "In Progress";
  };

  const renderSessionCard = ({ item }) => (
    <TouchableOpacity
      style={styles.sessionCard}
      onPress={() => handleSessionPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="document-text-outline" size={20} color="#2563EB" />
          <Text style={styles.sessionTitle} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + "20" },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          />
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color="#64748B" />
          <Text style={styles.infoText}>{formatDate(item.date)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="help-circle-outline" size={16} color="#64748B" />
          <Text style={styles.infoText}>
            {item.questionsAnswered}/{item.totalQuestions} Questions
          </Text>
        </View>
      </View>

      {item.status === "completed" && item.score !== null && (
        <View style={styles.scoreSection}>
          <View style={styles.scoreBar}>
            <View
              style={[styles.scoreFill, { width: `${item.score}%` }]}
            />
          </View>
          <Text style={styles.scoreText}>{item.score}% Score</Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.tapHint}>
          {item.status === "completed"
            ? "Tap to view results"
            : "Tap to continue"}
        </Text>
        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="briefcase-outline" size={64} color="#CBD5E1" />
      </View>
      <Text style={styles.emptyTitle}>No Sessions Yet</Text>
      <Text style={styles.emptySubtitle}>
        Start your first mock interview to practice and improve your skills
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Mock Interviews</Text>
          <Text style={styles.screenSubtitle}>
            Practice makes perfect. Review your sessions below.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading sessions...</Text>
          </View>
        ) : (
          <FlatList
            data={sessions}
            renderItem={renderSessionCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#2563EB"]}
                tintColor="#2563EB"
              />
            }
          />
        )}

        {/* Floating Action Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={handleNewSession}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "web" ? 24 : 16,
    paddingBottom: 16,
  },
  screenTitle: {
    fontSize: 28,
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#64748B",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  sessionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginLeft: 10,
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardBody: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 20,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    fontSize: 13,
    color: "#64748B",
    marginLeft: 6,
    fontWeight: "500",
  },
  scoreSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  scoreBar: {
    flex: 1,
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    overflow: "hidden",
    marginRight: 12,
  },
  scoreFill: {
    height: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 3,
  },
  scoreText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  tapHint: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
