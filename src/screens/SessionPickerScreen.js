import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";

const sessions = [
  {
    title: "Project",
    subtitle: "Discuss your academic and internship projects",
  },
  {
    title: "Experience",
    subtitle: "Practice answers about work and internships",
  },
  {
    title: "Introduction",
    subtitle: "Improve your self introduction and opening pitch",
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Choose a Session</Text>
        <Text style={styles.subtitle}>
          Select the area you want to practice
        </Text>

        <View style={styles.cardsWrapper}>
          {sessions.map((item) => (
            <TouchableOpacity
              key={item.title}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => handleSelectSession(item)}
            >
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            </TouchableOpacity>
          ))}
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
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "#EEF4FF",
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
    marginTop: 8,
  },

  subtitle: {
    marginTop: 8,
    marginBottom: 24,
    fontSize: 15,
    color: "#64748B",
    fontWeight: "500",
    lineHeight: 22,
  },

  cardsWrapper: {
    marginTop: 4,
  },

  card: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 22,
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  cardTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#0F172A",
  },

  cardSubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#64748B",
    lineHeight: 22,
    fontWeight: "500",
  },
});