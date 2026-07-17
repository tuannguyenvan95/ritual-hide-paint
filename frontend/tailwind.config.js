/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ritual: {
          dark: '#0f172a',
          primary: '#8b5cf6',
          accent: '#10b981',
          accentHover: '#059669',
        }
      }
    },
  },
  plugins: [],
}
