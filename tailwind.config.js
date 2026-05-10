/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['Inter', 'DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        canvas: 'var(--bg-canvas)',
        ui: 'var(--bg-ui)',
        panel: 'var(--bg-panel)',
        accent: 'var(--accent)',
        danger: 'var(--accent-danger)',
      },
    },
  },
  plugins: [],
}
