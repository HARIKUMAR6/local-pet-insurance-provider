/**
 * Pawstead design system — Tailwind mapping.
 *
 * Colours are SEMANTIC: each name resolves to a CSS custom property in
 * src/input.css whose value changes with the theme (light / dark) and with
 * the surface (e.g. .surface-inverse). Markup never hard-codes a brand hex,
 * so every text/background pairing stays readable in both themes.
 *
 * The raw brand palette is still available under `brand-*` for the rare
 * fixed-colour case (e.g. swatches in the style guide).
 */
const semantic = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;
const brand = (name) => `rgb(var(--${name}) / <alpha-value>)`;

const sansFallback = [
  'ui-sans-serif',
  'system-ui',
  '-apple-system',
  '"Segoe UI"',
  'Roboto',
  '"Helvetica Neue"',
  'Arial',
  'sans-serif',
];

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./*.html', './src/partials/**/*.html', './assets/js/**/*.js'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#ffffff',

      bg: semantic('bg'),
      surface: semantic('surface'),
      'surface-soft': semantic('surface-soft'),
      raised: semantic('raised'),
      field: semantic('field'),
      inverse: semantic('inverse'),
      footer: semantic('footer'),

      fg: semantic('text'),
      heading: semantic('heading'),
      muted: semantic('muted'),
      accent: semantic('accent-text'),
      'accent-mark': semantic('accent'),
      line: semantic('line'),

      cta: {
        DEFAULT: semantic('cta'),
        hover: semantic('cta-hover'),
        fg: semantic('cta-text'),
      },
      secondary: {
        DEFAULT: semantic('secondary'),
        fg: semantic('secondary-fg'),
      },
      positive: {
        DEFAULT: semantic('positive'),
        bg: semantic('positive-bg'),
      },
      overlay: semantic('overlay'),
      shadow: semantic('shadow'),

      brand: {
        pine: brand('pine'),
        porcelain: brand('porcelain'),
        sage: brand('sage'),
        terracotta: brand('terracotta'),
        ink: brand('ink'),
      },
    },
    fontFamily: {
      heading: ['"DM Sans"', ...sansFallback],
      sans: ['Inter', ...sansFallback],
    },
    borderRadius: {
      none: '0',
      sm: '2px',
      DEFAULT: '4px',
      md: '6px',
      full: '9999px',
    },
    extend: {
      fontSize: {
        display: ['clamp(2.5rem, 1.5rem + 3.2vw, 4.25rem)', { lineHeight: '1.04', letterSpacing: '-0.035em' }],
        h1: ['clamp(2.25rem, 1.45rem + 3vw, 3.75rem)', { lineHeight: '1.06', letterSpacing: '-0.03em' }],
        h2: ['clamp(1.75rem, 1.25rem + 1.9vw, 2.75rem)', { lineHeight: '1.12', letterSpacing: '-0.025em' }],
        h3: ['clamp(1.3125rem, 1.15rem + 0.6vw, 1.625rem)', { lineHeight: '1.25', letterSpacing: '-0.015em' }],
        h4: ['1.125rem', { lineHeight: '1.35', letterSpacing: '-0.01em' }],
        lead: ['clamp(1.125rem, 1.06rem + 0.3vw, 1.3125rem)', { lineHeight: '1.55' }],
        body: ['1rem', { lineHeight: '1.65' }],
        small: ['0.875rem', { lineHeight: '1.55' }],
        eyebrow: ['0.75rem', { lineHeight: '1.2', letterSpacing: '0.14em' }],
      },
      maxWidth: {
        site: '77.5rem',
        prose: '40rem',
        measure: '34rem',
      },
      spacing: {
        gutter: 'var(--gutter)',
        section: 'var(--section-y)',
        header: 'var(--header-h)',
      },
      transitionTimingFunction: {
        drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [],
};
