import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Atea brand-ish palette (tweak freely)
        atea: {
          navy: "#0a1f44",
          red: "#e2231a",
          sand: "#f5f3ee",
          ink: "#1a1a1a",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      maxWidth: {
        content: "960px",
      },
    },
  },
  plugins: [],
};

export default config;
