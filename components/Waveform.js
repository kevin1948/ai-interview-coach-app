import React from "react";
import { View, StyleSheet } from "react-native";

export default function Waveform({ bars = [] }) {
  const centerIndex = (bars.length - 1) / 2;

  return (
    <View style={styles.container}>
      {bars.map((level, index) => {
        const distanceFromCenter = Math.abs(index - centerIndex) / centerIndex;

        // premium shape: taller at center, shorter at edges
        const centerWeight = 1 - distanceFromCenter * 0.4;

        const shapedLevel = Math.max(0, Math.min(1, level * centerWeight));

        const height = Math.max(10, shapedLevel * 170);
        const opacity = 0.22 + shapedLevel * 0.78;

        return (
          <View
            key={index}
            style={[
              styles.bar,
              {
                height,
                opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 170,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    overflow: "hidden",
  },
  bar: {
    width: 5,
    marginHorizontal: 1.5,
    borderRadius: 999,
    backgroundColor: "#60A5FA",
  },
});