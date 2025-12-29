/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      animation: {
        'pulse-green': 'pulse-green 1.5s ease-in-out infinite',
        'pulse-blue': 'pulse-blue 1.5s ease-in-out infinite',
        'pulse-purple': 'pulse-purple 1.5s ease-in-out infinite',
        'pulse-orange': 'pulse-orange 1.5s ease-in-out infinite',
        'slide-in': 'slide-in 0.3s ease-out',
      },
      keyframes: {
        'pulse-green': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.7)' },
          '50%': { boxShadow: '0 0 0 15px rgba(34, 197, 94, 0)' },
        },
        'pulse-blue': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.7)' },
          '50%': { boxShadow: '0 0 0 15px rgba(59, 130, 246, 0)' },
        },
        'pulse-purple': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(168, 85, 247, 0.7)' },
          '50%': { boxShadow: '0 0 0 15px rgba(168, 85, 247, 0)' },
        },
        'pulse-orange': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(249, 115, 22, 0.7)' },
          '50%': { boxShadow: '0 0 0 15px rgba(249, 115, 22, 0)' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
