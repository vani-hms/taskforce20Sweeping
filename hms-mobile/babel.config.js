module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./src"],
          alias: {
            "@": "./src/modules/taskforce",
          },
        },
      ],
      "react-native-reanimated/plugin"  // ⚠ MUST be last
    ],
  };
};
