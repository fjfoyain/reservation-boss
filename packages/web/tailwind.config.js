/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
    theme: {
      extend: {
        colors: {
          'nh-navy': '#003057',
          'nh-teal': '#00A9CE',
          'nh-light-blue': '#4A9EC4',
          'nh-dark-navy': '#002040',
        },
      },
    },
    plugins: [],
  };