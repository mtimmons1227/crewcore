/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          950: '#071620',
          900: '#102635',
          800: '#16364a',
          700: '#1e4b61',
          600: '#2f657d',
          500: '#3f7f99',
          400: '#76a9bb',
          300: '#a8c9d4',
          200: '#d7e8ec',
          100: '#eef7f9',
        },
      },
      boxShadow: {
        soft: '0 10px 30px rgba(7, 22, 32, 0.08)',
      },
    },
  },
  plugins: [],
};

