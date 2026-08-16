import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#1a1210",
          900: "#2a1a15",
        },
        maroon: {
          700: "#7a1f1f",
          600: "#8c2a1f",
        },
        brand: {
          orange: "#f2861d",
          yellow: "#f5c518",
        },
        cream: {
          100: "#f7f1e8",
        },
        cta: {
          DEFAULT: "#2e7d32",
          dark: "#215924",
        },
      },
      fontFamily: {
        heading: ["var(--font-poppins)", "sans-serif"],
        body: ["var(--font-poppins)", "sans-serif"],
        script: ["var(--font-sacramento)", "cursive"],
      },
      backgroundImage: {
        "wood-texture":
          "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.04), transparent 45%), repeating-linear-gradient(115deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 2px, transparent 2px, transparent 10px)",
        "kraft-texture":
          "radial-gradient(circle at 80% 0%, rgba(255,255,255,0.05), transparent 50%), repeating-linear-gradient(-8deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1px, transparent 1px, transparent 6px)",
      },
      boxShadow: {
        card: "0 10px 30px -12px rgba(26,18,16,0.25)",
        button: "0 8px 20px -6px rgba(46,125,50,0.5)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.22,1,0.36,1) forwards",
      },
    },
  },
  plugins: [],
};

export default config;
