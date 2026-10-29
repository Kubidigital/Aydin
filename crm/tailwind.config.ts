import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        ink: {
          950: "#07080d",
          900: "#0b0d14",
          850: "#10121b",
          800: "#151824",
          700: "#1d2130",
          600: "#2a2f42",
        },
        brand: {
          300: "#b5a8ff",
          400: "#9583ff",
          500: "#7c5cff",
          600: "#6a45f5",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(124,92,255,.35), 0 8px 30px -8px rgba(124,92,255,.55)",
      },
    },
  },
  plugins: [],
} satisfies Config;
