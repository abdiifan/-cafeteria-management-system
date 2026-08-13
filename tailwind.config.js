/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1B2420',
        bark: '#2E3B2F',
        forest: '#22463A',
        forestLight: '#2F6B54',
        gold: '#C79A3B',
        goldSoft: '#E9D9AE',
        clay: '#B5502D',
        parchment: '#F6F3EC',
        stone: '#E6E1D3',
        mist: '#8FA096'
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', '"Noto Sans Ethiopic"', 'sans-serif'],
        amharic: ['"Noto Sans Ethiopic"', 'sans-serif']
      },
      borderRadius: {
        card: '10px'
      }
    }
  },
  plugins: []
}
