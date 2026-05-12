import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Official Safaricom / M-Pesa green
        mpesa: {
          green:        '#00A651',
          'green-dark': '#007A3D',
          'green-deep': '#005C2D',
          'green-light':'#00C060',
          'green-pale': '#E6F7EE',
        },
        // UI neutrals
        surface: {
          DEFAULT: '#F8FAFC',
          card:    '#FFFFFF',
          muted:   '#F1F5F9',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'Consolas',
          'monospace',
        ],
      },
      boxShadow: {
        phone:        '0 40px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.05)',
        dialog:       '0 25px 50px -12px rgba(0,0,0,0.35)',
        'ring-green': '0 0 0 3px rgba(0,166,81,0.3)',
      },
      keyframes: {
        'slide-up': {
          '0%':   { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        'pulse-green': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(0,166,81,0)' },
          '50%':      { boxShadow: '0 0 0 8px rgba(0,166,81,0.2)' },
        },
      },
      animation: {
        'slide-up':    'slide-up 0.35s ease-out',
        'pulse-green': 'pulse-green 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
