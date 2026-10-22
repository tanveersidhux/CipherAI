import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: {
        '2xl': '1280px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--border))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        risk: {
          low: {
            DEFAULT: 'hsl(var(--risk-low))',
            foreground: 'hsl(var(--risk-low-foreground))',
            border: 'hsl(var(--risk-low-border))',
          },
          medium: {
            DEFAULT: 'hsl(var(--risk-medium))',
            foreground: 'hsl(var(--risk-medium-foreground))',
            border: 'hsl(var(--risk-medium-border))',
          },
          high: {
            DEFAULT: 'hsl(var(--risk-high))',
            foreground: 'hsl(var(--risk-high-foreground))',
            border: 'hsl(var(--risk-high-border))',
          },
          critical: {
            DEFAULT: 'hsl(var(--risk-critical))',
            foreground: 'hsl(var(--risk-critical-foreground))',
            border: 'hsl(var(--risk-critical-border))',
          },
          inconclusive: {
            DEFAULT: 'hsl(var(--risk-inconclusive))',
            foreground: 'hsl(var(--risk-inconclusive-foreground))',
            border: 'hsl(var(--risk-inconclusive-border))',
          },
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
} satisfies Config
