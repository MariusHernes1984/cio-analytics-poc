import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Atea brand palette — sourced directly from atea.no/dist/assets/style*.css.
        // The :root declares --color-green/red/grey/etc. Green is the primary
        // brand color (logo + CTAs). The other tokens here map to Atea's own
        // scale so the UI uses real brand hex values, not placeholders.
        atea: {
          green: "#008a00", // primary brand (green-500), Atea logo + CTAs
          greenDark: "#006e00", // green-600, for hover state on primary
          red: "#d62429", // red-500, accents/danger
          navy: "#1f2325", // grey-800, dark headings/text ("navy" kept as role name)
          ink: "#1f2325", // grey-800, body text
          sand: "#f7f7f7", // grey-25, body background / subtle hover
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
