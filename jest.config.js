/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  roots: ["<rootDir>/__tests__"],
  testMatch: ["**/*.test.ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "tsconfig.test.json",
      },
    ],
  },
  extensionsToTreatAsEsm: [".ts"],
  transformIgnorePatterns: [
    // Transform ESM packages
    "node_modules/(?!(chalk|ansi-styles)/)",
  ],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  // Make Jest globals available without import
  injectGlobals: true,
};

export default config;
