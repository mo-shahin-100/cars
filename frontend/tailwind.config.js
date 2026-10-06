/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
          900: '#082f49',
          950: '#031826'
        },
        workshop: {
          dark: '#0f172a',
          surface: '#1e293b',
          border: '#334155',
          muted: '#64748b',
          accent: '#f59e0b',
          success: '#10b981',
          danger: '#ef4444'
        }
      },
      fontFamily: {
        sans: ['Cairo', 'Tajawal', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
