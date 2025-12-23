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
        // 3-Layer Background System (reference CSS vars)
        'bg-app': 'var(--bg-app)',
        'bg-surface': 'var(--bg-surface)',
        'bg-active': 'var(--bg-active)',

        // Text Hierarchy
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',

        // Accent
        'accent': 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',

        // Status Colors
        'status-green': 'var(--status-green)',
        'status-blue': 'var(--status-blue)',
        'status-yellow': 'var(--status-yellow)',
        'status-orange': 'var(--status-orange)',
        'status-red': 'var(--status-red)',
        'status-grey': 'var(--status-grey)',

        // Keep primary alias for compatibility
        primary: colors.cyan,
      },
      borderColor: {
        'subtle': 'var(--border-subtle)',
        'default': 'var(--border-default)',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
}
