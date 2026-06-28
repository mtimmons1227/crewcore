/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Navy / blue palette — public-facing pages (recruit journey, lead capture).
        // Matches the EarnedHome / Command Center design language.
        // Mirrored as CSS custom properties in styles.css :root.
        // Update BOTH together when changing the palette.
        teal: {
          950:   '#0f172a', // slate-900 — body text
          900:   '#1e293b', // slate-800 — dark headings
          800:   '#334155', // slate-700 — secondary text
          700:   '#475569', // slate-600 — label text
          muted: '#64748b', // slate-500 — muted / de-emphasised text
          600:   '#2563eb', // blue-600  — primary accent text
          550:   '#2f6fb0', // —          hover / gradient dark end
          500:   '#3b7cc4', // —          primary button (EarnedHome medium blue)
          400:   '#60a5fa', // blue-400  — lighter accent
          300:   '#93c5fd', // blue-300
          200:   '#dbeafe', // blue-100  — light blue bg tint
          100:   '#eff6ff', // blue-50   — near-white blue tint
          50:    '#f8fafc', // slate-50  — neutral surface
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
