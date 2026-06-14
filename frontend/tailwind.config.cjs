/** @type {import('tailwindcss').Config} */
// Ported 1:1 from the Rails app's tailwind.config.js so the React UI keeps the
// exact same design tokens. Only the `content` globs differ (they point at the
// SPA sources instead of the ERB views).
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Dark mode is toggled by adding the `dark` class to <html> (see src/lib/theme.ts).
  darkMode: 'class',
  theme: {
    extend: {
      // Semantic colours are CSS variables (space-separated RGB channels) so a single
      // `.dark` override in index.css flips the whole UI. The `<alpha-value>` slot
      // keeps Tailwind's opacity modifiers working (e.g. border-line/70, text-ink/70).
      colors: {
        brand: {
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          dark: 'rgb(var(--brand-dark) / <alpha-value>)',
          tint: 'rgb(var(--brand-tint) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--danger) / <alpha-value>)',
          tint: 'rgb(var(--danger-tint) / <alpha-value>)',
        },
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        // Raised surfaces (cards, inputs) — white in light mode, a lighter slate than
        // the page background in dark mode. Replaces hardcoded `bg-white`.
        raised: 'rgb(var(--raised) / <alpha-value>)',
        // The top navigation bar. Bright brand green in light mode, a deep calm green
        // in dark mode (the bright brand green glares on a dark page).
        header: 'rgb(var(--header) / <alpha-value>)',
        // Warm "highlight" used for live matches, the prize zone and notice banners.
        // Light amber in light mode, a muted warm-dark + light-amber text in dark mode,
        // so these accents stop glaring while staying readable.
        highlight: {
          DEFAULT: 'rgb(var(--highlight) / <alpha-value>)',
          fg: 'rgb(var(--highlight-fg) / <alpha-value>)',
        },
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
