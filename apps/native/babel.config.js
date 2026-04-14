module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./",
            "@kynfowk/types": "../../packages/types/index.ts",
            "@kynfowk/utils": "../../packages/utils/index.ts",
            "@kynfowk/connections": "../../packages/connections/index.ts",
            "@kynfowk/data": "../../packages/data/index.ts",
          },
        },
      ],
    ],
  };
};
