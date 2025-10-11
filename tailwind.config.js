/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        'chelsea-cucumber': {
          '50': '#f6faf3',
          '100': '#e9f4e4',
          '200': '#d4e7cb',
          '300': '#b0d4a1',
          '400': '#80b469',
          '500': '#649b4c',
          '600': '#4f7e3b',
          '700': '#406431',
          '800': '#35512a',
          '900': '#2d4324',
          '950': '#152310',
        },
      },
    },
  },
  plugins: [],
}