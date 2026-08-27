/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#0A0F1E',
        cardBg: '#111827',
        primaryAccent: '#3B82F6',
        dangerColor: '#EF4444',
        warningColor: '#F59E0B',
        goodColor: '#10B981',
        textPrimary: '#F9FAFB',
        textSecondary: '#9CA3AF',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'card': '12px',
      },
      boxShadow: {
        'cardShadow': '0 4px 24px rgba(0, 0, 0, 0.4)',
      }
    },
  },
  plugins: [],
}
