export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {
    keyframes: {
      float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
      ring: { '0%': { transform: 'scale(.9)', opacity: '.7' }, '100%': { transform: 'scale(1.35)', opacity: '0' } },
      pop: { '0%': { transform: 'scale(.9)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
    },
    animation: { float: 'float 6s ease-in-out infinite', ring: 'ring 2.4s ease-out infinite', 'spin-slow': 'spin 6s linear infinite', pop: 'pop .35s ease-out both' },
  } },
};
