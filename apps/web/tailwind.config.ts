import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--color-background) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        card: 'rgb(var(--color-card) / <alpha-value>)',
        hover: 'rgb(var(--color-hover) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        lime: 'rgb(var(--color-lime) / <alpha-value>)',
        green: 'rgb(var(--color-green) / <alpha-value>)',
        darkGreen: '#052E1A',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        info: 'rgb(var(--color-info) / <alpha-value>)',
      },
      boxShadow: {
        glow: 'var(--shadow-glow)',
      },
      borderRadius: {
        xl2: '1.5rem',
      },
    },
  },
  plugins: [],
};

export default config;
