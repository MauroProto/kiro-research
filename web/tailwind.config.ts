import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: "#0a0a0a",
          green: "#33ff33",
          amber: "#ffb000",
          cyan: "#00ffff",
          magenta: "#ff00ff",
          red: "#ff3333",
          dim: "#1a3a1a",
        },
      },
      fontFamily: {
        terminal: ["VT323", "IBM Plex Mono", "Courier New", "monospace"],
        dos: ["Perfect DOS VGA 437", "VT323", "monospace"],
      },
      animation: {
        blink: "blink 1s step-end infinite",
        scanline: "scanline 8s linear infinite",
        flicker: "flicker 0.15s infinite",
        glow: "glow 2s ease-in-out infinite alternate",
        typewriter: "typewriter 2s steps(40) 1s forwards",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.98" },
        },
        glow: {
          "0%": { textShadow: "0 0 5px #33ff33, 0 0 10px #33ff33" },
          "100%": { textShadow: "0 0 10px #33ff33, 0 0 20px #33ff33, 0 0 30px #33ff33" },
        },
        typewriter: {
          "0%": { width: "0" },
          "100%": { width: "100%" },
        },
      },
      backgroundImage: {
        "crt-overlay": "repeating-linear-gradient(0deg, rgba(0,0,0,0.15), rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px)",
      },
    },
  },
  plugins: [],
};

export default config;

