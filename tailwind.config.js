/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf2f4',
          100: '#fce7eb',
          200: '#f8d2d9',
          300: '#f2afbc',
          400: '#e88095',
          500: '#d9536f',
          600: '#c23352',
          700: '#a2223e',
          800: '#882037',
          900: '#732033',
          950: '#400c18',
        },
        maroon: {
          50: '#fcf3f5',
          100: '#f8e4e8',
          200: '#f2ced6',
          300: '#e7aeb9',
          400: '#d78494',
          500: '#c25c70',
          600: '#a84055',
          700: '#8a3144',
          800: '#732c3b',
          900: '#632936',
          950: '#3a131c',
        },
        roseaccent: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(162, 34, 62, 0.07)',
        'premium': '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
