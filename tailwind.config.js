/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // Design System Tokens
        canvas:    '#F7F5F0', // Cream Ivory — main application canvas
        alabaster: '#EFEBE3', // Soft Alabaster — secondary structural zones
        ink:       '#2E2822', // Rich Charcoal Taupe — primary contrast ink
        inkLight:  '#7A6F69', // Muted Mid-Tone — secondary labels, metadata
        inkHair:   '#C9C0B5', // Hairline color — thin dividers, borders
        parchment: '#E4DBC8', // Deeper parchment — header blocks, input areas
      },
      fontFamily: {
        display: ['"Playfair Display"', '"Georgia"', 'serif'],
        sans:    ['"Lato"', '"Optima"', '"Segoe UI"', 'Arial', 'sans-serif'],
        mono:    ['"Lato"', '"Optima"', '"Courier New"', 'monospace'],
      },
      fontSize: {
        'grand': ['4rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
      },
      letterSpacing: {
        'editorial': '0.18em',
      },
      borderWidth: {
        'hair': '1px',
      },
      boxShadow: {
        'none': 'none',
      }
    },
  },
  plugins: [],
}
