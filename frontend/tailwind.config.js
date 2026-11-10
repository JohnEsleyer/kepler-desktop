/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'space-black': '#030712',
        'surface-slate': '#0b0f19',
        'cosmic-slate': '#111827',
        'border-slate': '#1e293b',
      }
    },
  },
  plugins: [],
}