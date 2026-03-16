import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const sessions = [
  {
    title: "Project",
    subtitle: "Discuss your academic and internship projects",
    icon: "folder-open-outline",
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

export default function SessionPickerScreen({ navigation }) {
  const handleSelectSession = (item) => {
    navigation.navigate("Interview", {
      type: item.title,
      sessionTitle: `${item.title} Session`,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <View style={styles.headerBlock}>
          <Text style={styles.title}>Choose a Session</Text>
          <Text style={styles.subtitle}>
            Select the area you want to practice
          </Text>
        </View>

        <View style={styles.cardList}>
          {sessions.map((item) => (
            <TouchableOpacity
              key={item.title}
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => handleSelectSession(item)}
            >
              <View style={styles.cardLeft}>
                <View style={styles.iconWrap}>
                  <Ionicons name={item.icon} size={22} color="#2563EB" />
                </View>

                <View style={styles.cardTextWrap}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                </View>
              </View>

              <View style={styles.arrowWrap}>
                <Ionicons
                  name="chevron-forward-outline"
                  size={20}
                  color="#64748B"
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footerCard}>
          <Ionicons name="sparkles-outline" size={18} color="#2563EB" />
          <Text style={styles.footerText}>
            Choose a session and start practicing with AI voice guidance.
          </Text>
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
    paddingTop: Platform.OS === "web" ? 24 : 8,
    paddingBottom: 16,
    justifyContent: "space-between",
  },

  headerBlock: {
    marginTop: 8,
    marginBottom: 18,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },

  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: "#64748B",
    fontWeight: "500",
  },

  cardList: {
    flex: 1,
    justifyContent: "center",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },

  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  cardTextWrap: {
    flex: 1,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },

  cardSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    color: "#64748B",
    fontWeight: "500",
  },

  arrowWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },

  footerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  footerText: {
    marginLeft: 10,
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: "#64748B",
    fontWeight: "500",
  },
});