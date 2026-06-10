import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        card: '#1a1a1a',
        'card-hover': '#222222',
        border: '#2a2a2a',
        'accent-green': '#00e676',
        'accent-red': '#ef4444',
        'accent-blue': '#3b82f6',
        'text-primary': '#ffffff',
        'text-secondary': '#888888',
        'text-muted': '#555555',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        mobile: '430px',
      },
    },
  },
  plugins: [],
}

export default config
