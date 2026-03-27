import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const sessions = [
  {
    title: "Projects",
    subtitle: "Practice explaining your projects clearly",
    icon: "code-slash-outline",
  },
  {
    title: "Experience",
    subtitle: "Practice answers about internships and work experience",
    icon: "briefcase-outline",
  },
  {
    title: "Introduction",
    subtitle: "Improve your self introduction and opening pitch",
    icon: "person-outline",
  },
];

export default function SessionPickerScreen({ navigation, route }) {
  const candidateId = route?.params?.candidateId || "";
  const resumeId = route?.params?.resumeId || "";

  const handleSelectSession = (item) => {
    if (!candidateId) {
      return;
    }

    navigation.navigate("Interview", {
      candidateId,
      resumeId,
      type: item.title,
      sessionTitle: `${item.title} Session`,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerBlock}>
          <Text style={styles.title}>Choose a Session</Text>
          <Text style={styles.subtitle}>
            Pick a focused area to practice with Interview Coach
          </Text>
        </View>

        {sessions.map((item, index) => (
          <TouchableOpacity
            key={`${item.title}-${index}`}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => handleSelectSession(item)}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={item.icon} size={24} color="#2563EB" />
            </View>

            <View style={styles.textWrap}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            </View>

            <Ionicons
              name="chevron-forward-outline"
              size={22}
              color="#94A3B8"
            />
          </TouchableOpacity>
        ))}
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
    padding: 20,
    paddingBottom: 28,
  },
  headerBlock: {
    marginBottom: 22,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: "#64748B",
    fontWeight: "500",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  textWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: "#64748B",
    fontWeight: "500",
  },
});