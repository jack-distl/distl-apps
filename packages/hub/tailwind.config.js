import preset from '../shared/styles/tailwind.preset.js'

/** @type {import('tailwindcss').Config} */
export default {
  presets: [preset],
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
    '../shared/components/**/*.{js,jsx}',
  ],
}
