/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
theme: {
  extend: {
     colors: {
      ivory: '#F2E8DA',
      beige: '#D7BFA2',
      taupe: '#B7A8A0',
      sand: '#A37E5C',
      coffee: '#4A2E1F',
    },
    fontFamily: {
      display: ['Aref Ruqaa Ink','Noto Naskh Arabic','Inter','system-ui'],
      verse: ['"Besmellah"', '"Amiri Quran"', '"Noto Naskh Arabic"', "serif"],
    },
  },
},
  plugins: [],
};
