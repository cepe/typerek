/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/views/**/*.{erb,html,html.erb}',
    './app/helpers/**/*.rb',
    './app/javascript/**/*.js',
    './app/frontend/**/*.{js,css}',
  ],
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
        muted: '#969B9D',
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