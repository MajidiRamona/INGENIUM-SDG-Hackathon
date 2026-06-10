import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0f766e',
          light: '#14b8a6',
          dark: '#0d4f47',
        },
        surface: {
          DEFAULT: '#0f1117',
          card: '#161b22',
          border: '#21262d',
          hover: '#1c2128',
        },
      },
    },
  },
  plugins: [],
}

export default config
