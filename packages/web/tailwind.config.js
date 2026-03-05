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
          // v3 design system
          'v3-navy': '#112A46',
          'v3-teal': '#00A3E0',
          'v3-blue': '#1183d4',
          'v3-blue-dark': '#0a558c',
          'v3-success': '#03543F',
          'v3-success-bg': '#DEF7EC',
        },
      },
    },
    plugins: [],
  };