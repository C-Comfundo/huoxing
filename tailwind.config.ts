import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F7F5F0", // oatmeal background
        foreground: "#3A3A3A", // deep charcoal text
        primary: {
          DEFAULT: "#BCAAA4", // soft terracotta
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#D7CCC8", // light taupe
          foreground: "#3A3A3A",
        },
        accent: {
          DEFAULT: "#A1887F", // darker taupe accent
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#EFEBE9", // very light taupe
          foreground: "#757575",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#3A3A3A",
        },
        border: "#D7CCC8",
      },
      fontFamily: {
        serif: ["NSimSun", "SimSun", "Songti SC", "STSong", "serif"], // body text fallback
        sans: ['var(--font-liuye-local)', "LiuYe", "sans-serif"], // local sans fallback
        liuye: ['var(--font-liuye-local)', "LiuYe", "serif"], // local liuye font
        youyou: ["youyou-yisong", "YouYou", "serif"], // split youyou font
      },
      animation: {
        "fade-in": "fadeIn 0.8s ease-out forwards",
        "fade-in-up": "fadeInUp 0.8s ease-out forwards",
        "fade-out": "fadeOut 1.8s ease-out forwards",
        "bounce-slow": "bounce 3s infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeOut: {
          "0%": { opacity: "1", transform: "translateX(-50%) translateY(0)" },
          "70%": { opacity: "1", transform: "translateX(-50%) translateY(0)" },
          "100%": { opacity: "0", transform: "translateX(-50%) translateY(-6px)" },
        },
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
  ],
};
export default config;
