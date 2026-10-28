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
        brand: {
          navy: "#0f172a",
          "navy-light": "#1e293b",
          gold: "#d97706",
          "gold-light": "#f59e0b",
          cream: "#fbf8f2",
        },
      },
    },
  },
  plugins: [],
};
export default config;
