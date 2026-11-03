import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F1B2D",
        slate2: "#5B6778",
        line: "#DCE2EA",
        wash: "#F2F5F9",
        signal: "#1B5BFF",
        ok: "#0E8F6A",
        caution: "#B86A00",
        stop: "#C1332B",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
