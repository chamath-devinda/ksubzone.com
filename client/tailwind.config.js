/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        luxury: {
          950: '#030008', // Ultra dark obsidian background
          900: '#080414', // Deep luxury violet-black
          850: '#0e0720', // Layered surface
          800: '#140c2d', // Drawer & elevated cards
          700: '#231548', // Card hover / border focus
          600: '#38226b',
          DEFAULT: '#080414',
        },
        brand: {
          primary: '#8b5cf6',   // Electric Violet
          'primary-hover': '#7c3aed',
          secondary: '#ec4899', // Hot pink / Magenta
          accent: '#f59e0b',    // Luxury amber (IMDB)
          emerald: '#10b981',   // Approved / Success
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-outfit)', 'Outfit', 'system-ui', 'sans-serif'],
        milker: ['var(--font-milker)', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
        '2xl': '24px',
        '3xl': '32px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
        'glass-neon': '0 8px 32px 0 rgba(139, 92, 246, 0.22)',
        'glow-primary': '0 0 25px -5px rgba(139, 92, 246, 0.4)',
        'glow-pink': '0 0 25px -5px rgba(236, 72, 153, 0.4)',
        'glow-amber': '0 0 25px -5px rgba(245, 158, 11, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        }
      }
    },
  },
  plugins: [],
}
