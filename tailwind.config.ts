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
        background: "var(--background)",
        foreground: "var(--foreground)",
        gradit: {
          purple: "#7352FF",
          purpleDark: "#5E3EE3",
          purpleLight: "#EDE8FF",
          pink: "#FF5376",
          pinkLight: "#FFE8EC",
          blue: "#3D82F6",
          blueLight: "#EBF3FF",
          yellow: "#FFB020",
          yellowLight: "#FFF7E6",
          green: "#05C168",
          greenLight: "#E6F9F0",
          red: "#F64E60",
          redLight: "#FFE2E5",
          sidebar: "#F7F8FC",
          card: "#FFFFFF",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'card': '0 10px 30px 0 rgba(115, 82, 255, 0.06)',
        'glow': '0 0 25px rgba(115, 82, 255, 0.35)',
      }
    },
  },
  plugins: [],
};
export default config;
