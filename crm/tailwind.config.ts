import type { Config } from "tailwindcss";

// Charte Digital Aydin : Encre noire #050B1F, Azur royal #0B4FD8,
// Bordeaux nuit #4C0B1E, Amarante sombre #741A36 — Fraunces / Manrope.
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
      },
      colors: {
        ink: {
          950: "#050B1F",
          900: "#081128",
          850: "#0c1631",
          800: "#111d3d",
          700: "#1a2852",
          600: "#273668",
        },
        brand: {
          200: "#b9cdf8",
          300: "#8eaef3",
          400: "#4f84ee",
          500: "#0B4FD8",
          600: "#0942b6",
          700: "#073391",
        },
        accent: {
          400: "#a8385b",
          500: "#741A36",
          700: "#4C0B1E",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(11,79,216,.4), 0 8px 30px -8px rgba(11,79,216,.6)",
      },
    },
  },
  plugins: [],
} satisfies Config;
