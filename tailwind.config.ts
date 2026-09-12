import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f7f5",
          100: "#dcece5",
          500: "#1f7a5c",
          600: "#166148",
          700: "#124d3a",
        },
      },
    },
  },
  plugins: [],
};

export default config;
