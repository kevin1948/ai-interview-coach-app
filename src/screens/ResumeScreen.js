import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function ResumeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Resume screen will be handled by teammate.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 16 }
});