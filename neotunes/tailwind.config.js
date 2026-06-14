/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        neonPurple: '#7B61FF',
        electricBlue: '#00D4FF',
        acidGreen: '#00FF85',
        deepBlack: '#0A0A0A',
        softDark: '#1C1C1E',
      }
    },
  },
  plugins: [],
}
