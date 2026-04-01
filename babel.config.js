module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      // jsxImportSource: "nativewind" enables className on all RN primitives
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
    ],
    plugins: [
      // Reanimated must always be listed last
      "react-native-reanimated/plugin",
    ],
  };
};
