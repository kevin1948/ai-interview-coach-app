import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * MOCK SESSION DATA (temporary until backend ready)
 */
const MOCK_SESSIONS = [
  {
    id: "session-1",
    title: "Frontend Developer Mock Interview",
    date: "2026-03-23T12:00:00Z",
    questionsAnswered: 5,
    totalQuestions: 5,
    status: "completed",
    score: 82,
  },
  {
    id: "session-2",
    title: "React Native Mock Interview",
    date: "2026-03-21T15:30:00Z",
    questionsAnswered: 3,
    totalQuestions: 5,
    status: "incomplete",
    score: null,
  },
];

export default function MockInterviewListScreen({ navigation }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchSessions();
    }, [])
  );

  /**
   * MOCK FETCH SESSIONS
   */
  const fetchSessions = async () => {
    try {
      const candidateId = await AsyncStorage.getItem("candidateId");

      if (!candidateId) {
        setSessions([]);
        return;
      }

      // backend not ready → using mock data
      setSessions(MOCK_SESSIONS);
    } catch (error) {
      console.log("Failed to fetch sessions:", error);
      setSessions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSessions();
  };

  /**
   * CONTINUE SESSION
   */
  const handleSessionPress = async (session) => {
    const candidateId = await AsyncStorage.getItem("candidateId");

    if (session.status === "completed") {
      navigation.navigate("MockInterviewResult", { session });
    } else {
      navigation.navigate("MockInterviewSession", {
        sessionId: session.id,
        sessionTitle: session.title,
        candidateId,
      });
    }
  };

  /**
   * START NEW SESSION
   */
  const handleNewSession = async () => {
    const candidateId = await AsyncStorage.getItem("candidateId");

    navigation.navigate("MockInterviewSession", {
      sessionTitle: "New Mock Interview",
      candidateId,
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No date";

    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusColor = (status) =>
    status === "completed" ? "#10B981" : "#F59E0B";

  const getStatusText = (status) =>
    status === "completed" ? "Completed" : "In Progress";

  const renderSessionCard = ({ item }) => (
    <TouchableOpacity
      style={styles.sessionCard}
      onPress={() => handleSessionPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Ionicons
            name="document-text-outline"
            size={20}
            color="#2563EB"
          />

          <Text style={styles.sessionTitle}>{item.title}</Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: `${getStatusColor(item.status)}20` },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          />

          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(item.status) },
            ]}
          >
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.infoText}>
          📅 {formatDate(item.date)}
        </Text>

        <Text style={styles.infoText}>
          ❓ {item.questionsAnswered}/{item.totalQuestions} Questions
        </Text>
      </View>

      {item.status === "completed" && item.score !== null && (
        <Text style={styles.scoreText}>{item.score}% Score</Text>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.tapHint}>
          {item.status === "completed"
            ? "Tap to view results"
            : "Tap to continue"}
        </Text>

        <Ionicons
          name="chevron-forward"
          size={18}
          color="#94A3B8"
        />
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name="briefcase-outline"
        size={64}
        color="#CBD5E1"
      />

      <Text style={styles.emptyTitle}>No Sessions Yet</Text>

      <Text style={styles.emptySubtitle}>
        Start your first mock interview
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Mock Interviews</Text>

          <Text style={styles.screenSubtitle}>
            Practice makes perfect
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" />
        ) : (
          <FlatList
            data={sessions}
            renderItem={renderSessionCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
            }
          />
        )}

        <TouchableOpacity
          style={styles.fab}
          onPress={handleNewSession}
        >
          <Ionicons name="add" size={32} color="#fff" />
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
    paddingHorizontal: 20,
    backgroundColor: "#F8FAFC",
  },
  header: {
    marginTop: Platform.OS === "web" ? 24 : 12,
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
  },
  screenSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  listContent: {
    paddingBottom: 100,
  },
  sessionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  sessionTitle: {
    marginLeft: 8,
    fontWeight: "700",
    fontSize: 16,
    color: "#0F172A",
  },
  statusBadge: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignItems: "center",
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
    marginBottom: 10,
  },
  infoText: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 4,
  },
  scoreText: {
    fontWeight: "700",
    color: "#2563EB",
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 8,
  },
  tapHint: {
    fontSize: 13,
    color: "#94A3B8",
  },
  emptyState: {
    alignItems: "center",
    marginTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#2563EB",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },
});