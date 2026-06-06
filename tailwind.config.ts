import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111111",
        graphite: "#1f1f1f",
        steel: "#3a3a3a",
        gold: "#c9a227",
        champagne: "#f2e4b8"
      },
      boxShadow: {
        soft: "0 16px 40px rgba(0, 0, 0, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
