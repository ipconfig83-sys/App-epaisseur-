/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        presbyta: {
          // Deep medical blue palette
          50: '#eef4fb',
          100: '#d6e5f4',
          200: '#a9c5e6',
          300: '#7aa2d3',
          400: '#4f7fbb',
          500: '#2f5d9e',
          600: '#1f447d',
          700: '#163461',
          800: '#0f2547',
          900: '#0a1a33',
          950: '#050d1d',
        },
        gold: {
          50: '#fdf9ec',
          100: '#faf0c8',
          200: '#f4dc8d',
          300: '#ecc154',
          400: '#e3a833',
          500: '#c98a1f',
          600: '#a66818',
          700: '#824d18',
          800: '#5e371a',
          900: '#3d2412',
        },
        glass: {
          light: 'rgba(255, 255, 255, 0.65)',
          dark: 'rgba(10, 26, 51, 0.55)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(15, 37, 71, 0.18)',
        'gold-glow': '0 0 24px rgba(227, 168, 51, 0.35)',
        'lab': '0 10px 40px -10px rgba(15, 37, 71, 0.45)',
      },
      animation: {
        'spin-slow': 'spin 12s linear infinite',
        'pulse-soft': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      backgroundImage: {
        'lab-gradient': 'radial-gradient(circle at 20% 0%, #163461 0%, #0a1a33 45%, #050d1d 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 100%)',
        'gold-gradient': 'linear-gradient(135deg, #ecc154 0%, #c98a1f 100%)',
      },
    },
  },
  plugins: [],
};
