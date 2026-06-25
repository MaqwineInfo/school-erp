/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a56db',
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#1a56db',
          700: '#1d4ed8',
        },
      },
    },
  },
  plugins: [],
};
