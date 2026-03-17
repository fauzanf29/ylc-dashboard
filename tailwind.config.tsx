/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}", 
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#0a0a0a',
        cardBg: '#141414',
        burgundy: '#800020',
        burgundyLight: '#a8002a'
      },
      // INI DIA TAMBAHAN ANIMASI KILAPNYA BRE! 🔥
      keyframes: {
        shine: {
          '100%': { left: '125%' },
        }
      },
      animation: {
        shine: 'shine 1s',
      }
    },
  },
  plugins: [],
}