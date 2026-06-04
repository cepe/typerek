/** @type {import('tailwindcss').Config} */
// Ported 1:1 from the Rails app's tailwind.config.js so the React UI keeps the
// exact same design tokens. Only the `content` globs differ (they point at the
// SPA sources instead of the ERB views).
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#12A751',
          dark: '#0E8C43',
          tint: '#EAFAF1',
        },
        danger: {
          DEFAULT: '#FA6A6A',
          tint: '#FDEFEF',
        },
        ink: '#1D2420',
        muted: '#5F6A6D',
        line: '#E4E4E4',
        surface: '#ECEDEE',
      },
      fontFamily: {
        sans: ['Roboto', 'ui-sans-serif', 'system-ui', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 10px 30px rgba(0,0,0,0.05)',
      },
    },
  },
  plugins: [],
}
