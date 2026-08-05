import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json"],
      reportsDirectory: "./test-reports/coverage",
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
    },
    reporters: ["verbose", ["junit", { outputFile: "./test-reports/report.xml" }]],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
