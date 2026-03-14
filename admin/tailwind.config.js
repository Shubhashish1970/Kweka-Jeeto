/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        page: '#F8FAFC',
        primary: '#14b8a6',
        'primary-variant': '#0d9488',
        'on-primary': '#FFFFFF',
        surface: '#FAFAF9',
        'surface-variant': '#F5F5F4',
        'on-surface': '#1C1917',
        'on-surface-variant': '#57534E',
        outline: '#E7E5E4',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
