/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // <-- Pastikan baris ini ada
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#0a0a0a',
        cardBg: '#141414',
        burgundy: '#800020',
        burgundyLight: '#a8002a'
      }
    },
  },
  plugins: [],
}