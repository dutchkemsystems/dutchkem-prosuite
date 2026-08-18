/// <reference types="vite/client" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "convex",
          environment: "edge-runtime",
          include: ["convex/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "frontend",
          environment: "jsdom",
          globals: true,
          include: ["src/**/*.test.{ts,tsx}"],
          setupFiles: ["./src/test/setup.ts"],
          coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            include: ["src/components/**", "src/lib/**"],
            thresholds: {
              lines: 50,
              functions: 50,
              branches: 40,
              statements: 50,
            },
          },
        },
      },
    ],
  },
});
