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

        // BACKWARD COMPAT: Old naming convention → New 3-layer system
        // These aliases prevent "light mode" inputs when old class names are used
        'bg-primary': 'var(--bg-app)',      // Alias for bg-app
        'bg-secondary': 'var(--bg-surface)', // Alias for bg-surface  
        'bg-tertiary': 'var(--bg-active)',   // Alias for bg-active (input backgrounds)

        // Text Hierarchy
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',

        // Accent
        'accent': 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        // BACKWARD COMPAT: Old accent naming
        'accent-primary': 'var(--accent)',

        // Status Colors
        'status-green': 'var(--status-green)',
        'status-blue': 'var(--status-blue)',
        'status-yellow': 'var(--status-yellow)',
        'status-orange': 'var(--status-orange)',
        'status-red': 'var(--status-red)',
        'status-grey': 'var(--status-grey)',

        // Semantic aliases
        'danger': 'var(--status-red)',
        'warning': 'var(--status-orange)',
        'success': 'var(--status-green)',

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
