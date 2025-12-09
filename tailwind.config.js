import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Structural tokens
        'bg-primary': '#0f172a', // slate-950
        'bg-secondary': '#1e293b', // slate-800
        'bg-tertiary': '#334155',  // slate-700

        // Aliases & Accents
        primary: colors.cyan,    // Maps primary-50, primary-100 etc to cyan

        'accent-primary': '#06b6d4', // cyan-500
        'accent-hover': '#22d3ee',   // cyan-400
        'danger': '#ef4444',         // red-500
        'success': '#22c55e',        // green-500
      },
      boxShadow: {
        'blue-glow': '0 0 10px rgba(6, 182, 212, 0.5)', // cyan-500 glow
      }
    },
  },
  darkMode: 'class',
  plugins: [],
}
