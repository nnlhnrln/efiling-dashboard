export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        rose: { DEFAULT: '#D7BDB0', deep: '#B99888', soft: '#E7D3C9' },
        cream: '#E3D5CA',
        paper: '#F5EBE1',
        stone: '#D6CCC2',
        mist: '#EDEEE9',
        ink: { DEFAULT: '#4A3F3A', soft: '#6E625C' },
        ok: '#5F8D6B',
        warn: '#C08A3E',
        bad: '#B4574F',
      },
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] },
      borderRadius: { xl2: '20px', xl3: '24px', xl4: '28px' },
      boxShadow: {
        soft: '0 18px 40px -22px rgba(74,63,58,.35)',
        lift: '0 24px 50px -24px rgba(74,63,58,.40)',
      },
    },
  },
  plugins: [],
};
