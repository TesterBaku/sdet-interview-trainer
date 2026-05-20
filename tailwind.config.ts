import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#101820",
        paper: "#f6efe3",
        brass: "#b98736",
        blueprint: "#17324d",
        signal: "#d84f2a"
      },
      fontFamily: {
        display: ["Georgia", "Cambria", "Times New Roman", "serif"],
        body: ["Aptos", "Segoe UI", "sans-serif"]
      },
      boxShadow: {
        panel: "0 22px 70px rgba(16, 24, 32, 0.14)"
      }
    }
  },
  plugins: []
};

export default config;
