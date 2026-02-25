/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        coral: {
          DEFAULT: '#E8806A',
          dark: '#D66B55',
          light: '#F2A090',
        },
        charcoal: '#1A1A1A',
        'off-black': '#111111',
        cream: '#FAF9F7',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
}
