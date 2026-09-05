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
          950: '#06040b', // Obsidian violet canvas
          900: '#0d0916', // Primary card surface
          850: '#110c1d', // Layered surface
          800: '#151024', // Drawer & elevated cards
          700: '#251a3f', // Card hover / border focus
          600: '#3d286b',
          DEFAULT: '#0d0916',
        },
        brand: {
          primary: '#490570',   // User defined brand aubergine (primary)
          'primary-hover': '#72149A', // High contrast hover state
          'primary-light': '#b85adb', // Accessible text/accent on dark canvas
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
        'glass-neon': '0 8px 32px 0 rgba(73, 5, 112, 0.35)',
        'glow-primary': '0 0 25px -5px rgba(73, 5, 112, 0.55)',
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
