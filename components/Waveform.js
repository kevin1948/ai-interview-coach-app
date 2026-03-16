import React from "react";
import { View, StyleSheet } from "react-native";

export default function Waveform({ bars = [] }) {
  const centerIndex = (bars.length - 1) / 2;

  return (
    <View style={styles.container}>
      {bars.map((level, index) => {
        const distanceFromCenter = Math.abs(index - centerIndex) / centerIndex;
        const centerWeight = 1 - distanceFromCenter * 0.45;
        const shapedLevel = Math.max(0, Math.min(1, level * centerWeight));

        const totalHeight = Math.max(16, shapedLevel * 96);
        const opacity = 0.22 + shapedLevel * 0.78;

        return (
          <View key={index} style={styles.barWrap}>
            <View
              style={[
                styles.bar,
                {
                  height: totalHeight,
                  opacity,
                },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 120,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  barWrap: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  bar: {
    width: 5,
    marginHorizontal: 1.5,
    borderRadius: 999,
    backgroundColor: "#60A5FA",
  },
});