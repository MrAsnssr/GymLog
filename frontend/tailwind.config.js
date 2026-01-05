/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#13ec5b",
        "background-light": "#f6f8f6",
        "background-dark": "#102216",
        "surface-dark": "#112217",
        "surface-highlight": "#23482f",
        "text-muted": "#92c9a4",
      },
      fontFamily: {
        "display": ["Space Grotesk", "sans-serif"],
        "body": ["Noto Sans", "sans-serif"],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}


