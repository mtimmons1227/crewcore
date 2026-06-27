/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Teal palette — public-facing pages (lead capture, recruit journey).
        // These values are mirrored as CSS custom properties in styles.css.
        // Update BOTH together when changing the palette.
        teal: {
          950:   '#053b3b',
          900:   '#0d524d',
          800:   '#165054',
          700:   '#23564b',
          muted: '#4e7b73', // secondary / de-emphasised text
          600:   '#00675c',
          550:   '#007a72', // gradient endpoint between 600 and 500
          500:   '#009688',
          400:   '#00a69c',
          300:   '#2b6f67',
          200:   '#def5f1',
          100:   '#e8f8f6',
          50:    '#f0fdfb',
        },
      },
      boxShadow: {
        // soft — subtle lift; used on Command Center panels
        soft: '0 10px 30px rgba(7, 22, 32, 0.08)',
        // card — more dramatic; used on public-page cards (.card in styles.css)
        card: '0 22px 48px rgba(0, 0, 0, 0.08)',
        // hero — deepest; used on the lead-capture hero block
        hero: '0 28px 70px rgba(0, 0, 0, 0.06)',
      },
      borderRadius: {
        // card  — outer panel containers (28 px)
        card:  '28px',
        // panel — inner / secondary panels and the dark header bar (24 px)
        panel: '24px',
      },
    },
  },
  plugins: [],
};
