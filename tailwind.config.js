/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: {
            50: '#F0F9FF',
            100: '#E0F2FE',
            200: '#BAE6FD',
            300: '#7DD3FC',
            400: '#38BDF8',
            500: '#0EA5E9',
            600: '#0284C7',
          },
          pink: {
            50: '#FDF2F8',
            100: '#FCE7F3',
            200: '#FBCFE8',
            300: '#F9A8D4',
            400: '#F472B6',
            500: '#EC4899',
            600: '#DB2777',
          },
        },
      },
      backgroundImage: {
        'pastel-mesh': 'radial-gradient(at 0% 0%, #E0F2FE 0px, transparent 50%), radial-gradient(at 100% 100%, #FCE7F3 0px, transparent 50%), radial-gradient(at 50% 50%, #FFFFFF 0px, transparent 50%)',
        'btn-gradient': 'linear-gradient(135deg, #38BDF8 0%, #F472B6 100%)',
        'btn-gradient-hover': 'linear-gradient(135deg, #0EA5E9 0%, #EC4899 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.65) 100%)',
      },
      boxShadow: {
        'glow-blue': '0 0 25px -5px rgba(56, 189, 248, 0.3)',
        'glow-pink': '0 0 25px -5px rgba(244, 114, 182, 0.3)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
