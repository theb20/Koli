import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Identité Régal Express : noir/blanc épuré, accent rouge promo, bandeau doré.
        ink: {
          950: "#0a0a0a",
          900: "#1a1a1a",
        },
        maroon: {
          700: "#c92e3a",
          600: "#e23744",
        },
        // brand.orange conserve sa valeur d'origine : components/CategoryStrip.tsx
        // (page intouchable) s'appuie dessus pour le cercle "Poulet" mis en avant —
        // la remapper aurait changé son apparence sans toucher au fichier lui-même.
        brand: {
          orange: "#f2861d",
          yellow: "#8a6a1e",
        },
        // Nouveau token pour l'accent rouge Régal Express, utilisé partout ailleurs.
        accent: "#e23744",
        cream: {
          100: "#ffffff",
        },
        surface: {
          100: "#f3f3f3",
        },
        muted: "#6b6b6b",
        cta: {
          DEFAULT: "#12a150",
          dark: "#0d7d3f",
        },
      },
      fontFamily: {
        heading: ["var(--font-archivo)", "sans-serif"],
        body: ["var(--font-archivo)", "sans-serif"],
      },
      backgroundImage: {
        "wood-texture":
          "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.03), transparent 45%), repeating-linear-gradient(115deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 2px, transparent 2px, transparent 10px)",
        "kraft-texture":
          "radial-gradient(circle at 80% 0%, rgba(255,255,255,0.04), transparent 50%), repeating-linear-gradient(-8deg, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 6px)",
      },
      // Rayons redéfinis globalement — cartes 10px, boutons toujours en pilule.
      borderRadius: {
        xl: "10px",
        "2xl": "10px",
        "3xl": "10px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(10,10,10,0.08), 0 1px 2px rgba(10,10,10,0.05)",
        button: "none",
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
