import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          page: "var(--surface-page)",
          1: "var(--surface-1)",
        },
        ink: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        hairline: "var(--border-hairline)",
        gridline: "var(--gridline)",
        baseline: "var(--baseline)",
        series: {
          1: "var(--series-1)",
          2: "var(--series-2)",
          3: "var(--series-3)",
          4: "var(--series-4)",
          5: "var(--series-5)",
          6: "var(--series-6)",
          7: "var(--series-7)",
          8: "var(--series-8)",
        },
        status: {
          good: "var(--status-good)",
          warning: "var(--status-warning)",
          serious: "var(--status-serious)",
          critical: "var(--status-critical)",
        },
        sequential: {
          100: "var(--sequential-100)",
          250: "var(--sequential-250)",
          450: "var(--sequential-450)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
