import type { Config } from 'tailwindcss'
import flowbite from 'flowbite/plugin'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    'node_modules/flowbite-react/**/*.{js,jsx,ts,tsx}',
    'node_modules/flowbite/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        evergreen: '#1F6F4A',
        sage: '#E9F5EE',
        moss: '#4FA071',
        soil: '#6B4F3B',
        sunlight: '#F6C445',
        chili: '#D4472B',
      },
    },
  },
  plugins: [flowbite],
}

export default config
