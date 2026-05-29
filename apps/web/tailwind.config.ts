import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Legacy placeholder — used by stub nav/pages until they're redesigned.
        deximon: {
          DEFAULT: "#3b82f6",
          dark: "#1d4ed8",
        },
        // Design-system tokens (dark-only palette).
        base: "#0B0B0E",
        surface: "#15151A",
        surface2: "#1B1B22",
        hair: "#2A2A2F",
        ink: "#F2F2F0",
        ink2: "#9CA3AF",
        ink3: "#6B7280",
        "dx-red": "#D8232A",
        "dx-red-hover": "#B71C2C",
        "dx-blue": "#3B5BA9",
        "dx-gold": "#F2C94C",
        "dx-green": "#3FB97A",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
