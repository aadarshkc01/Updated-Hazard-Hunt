/**
 * Hazard Hunt design tokens.
 *
 * PALETTE RULE — there is no green and no red in this product.
 *
 * The brand is hazard orange on a neutral white/ink scale, and compliance state
 * is expressed by *visual weight*, not by introducing a second hue:
 *
 *   pass     filled orange tint   — completed, compliant, spotted
 *   caution  orange outline only  — attention needed, not yet a problem
 *   stop     filled ink           — failed, below threshold, destructive
 *
 * That keeps the whole product inside the orange-and-white brief while still
 * giving a supervisor three instantly separable states. `primary` (hazard orange)
 * stays reserved for the brand and the single most important action on a screen.
 * No component should ever reach for a raw Tailwind colour.
 */

/** Compliant / complete / found. Hazard orange. */
const pass = {
  50: '#FFF4EE',
  100: '#FFE6D7',
  200: '#FFC7AB',
  600: '#E24C00',
  700: '#B93C00',
};

/**
 * Attention. A burnt amber one step deeper than `pass`, and always rendered at a
 * lighter weight (outline rather than fill) so it never competes with `pass`.
 */
const caution = {
  50: '#FFF8EE',
  100: '#FFEEDC',
  200: '#F5D3AE',
  600: '#A85B0C',
  700: '#824507',
};

/**
 * Failed / destructive. Ink, not red — a heavy dark fill reads as final and
 * irreversible, which is exactly what these states mean, without leaving the
 * orange-and-white palette.
 */
const stop = {
  50: '#F4F5F6',
  100: '#E6E9EB',
  200: '#CBD2D8',
  600: '#3B444D',
  700: '#272E35',
  800: '#161B20',
};

const primary = {
  50: '#FFF4EE',
  100: '#FFE6D7',
  200: '#FFC7AB',
  300: '#FFA173',
  400: '#FF7C42',
  500: '#FF6115',
  600: '#E24C00',
  700: '#B93C00',
  800: '#933000',
  900: '#782600',
  950: '#5C1D00',
};

const mist = {
  0: '#FFFFFF',
  50: '#F7F8F9',
  100: '#EFF1F3',
  200: '#E3E7EA',
  300: '#CBD2D8',
  400: '#9BA5AE',
  500: '#6B7681',
  600: '#515C67',
  700: '#3B444D',
  800: '#272E35',
  900: '#161B20',
  950: '#0E1216',
};

const dark = {
  bg: '#0E1216',
  card: '#161B20',
  surface: '#1F262D',
  raised: '#272E36',
  border: '#313A43',
  muted: '#96A1AB',
  text: '#EDF0F2',
};

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      fontFamily: {
        /**
         * `system-ui` leads deliberately.
         *
         * Naming a webfont first only works if it is actually loaded, and this
         * app ships no font request — so `Inter` was silently falling through to
         * the next name on every device, meaning the stack rendered differently
         * depending on what the OS happened to have installed. Leading with
         * `system-ui` uses the reader's own UI face (SF on Apple, Segoe UI on
         * Windows, Roboto on Android): the widest-reach sans available, and the
         * one their device already rasterises fastest.
         */
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Noto Sans',
          'Arial',
          'sans-serif',
        ],
        /**
         * Figures. `ui-monospace` first for the same reason, then real monospace
         * families, then the `monospace` keyword as a guaranteed last resort so
         * a digit never falls back to a proportional face and break the column
         * alignment the tabular numerals depend on.
         */
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'SF Mono',
          'Menlo',
          'Consolas',
          'Liberation Mono',
          'monospace',
        ],
      },
      colors: {
        primary,
        mist,
        pass,
        caution,
        stop,
        dark,
        app: {
          /**
           * Page canvas.
           *
           * A barely-warm off-white rather than pure white: cards sit on top at
           * pure white, so without a difference between the two every card reads
           * as a flat white field with a hairline. This is the whole "not plain
           * white" fix in light mode, and it needs no extra decoration.
           */
          shell: '#F1F0EC',
        },
      },
      borderRadius: {
        // One scale, used consistently: panels lg, controls md, pills full.
        panel: '0.75rem',
        control: '0.5rem',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(22 27 32 / 0.05), 0 1px 3px 0 rgb(22 27 32 / 0.06)',
        raised: '0 4px 12px -2px rgb(22 27 32 / 0.10), 0 2px 6px -2px rgb(22 27 32 / 0.06)',
        pop: '0 12px 32px -8px rgb(22 27 32 / 0.22)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'hazard-pulse': {
          '0%': { boxShadow: '0 0 0 0 rgb(255 97 21 / 0.45)' },
          '70%': { boxShadow: '0 0 0 10px rgb(255 97 21 / 0)' },
          '100%': { boxShadow: '0 0 0 0 rgb(255 97 21 / 0)' },
        },
        'ripple-error': {
          '0%': { opacity: '0.85', transform: 'translate(-50%, -50%) scale(0.4)' },
          '100%': { opacity: '0', transform: 'translate(-50%, -50%) scale(1.9)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 220ms ease-out both',
        'slide-up': 'slide-up 260ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-down': 'slide-down 220ms ease-out both',
        'pop-in': 'pop-in 180ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'hazard-pulse': 'hazard-pulse 2.2s ease-out infinite',
        'ripple-error': 'ripple-error 620ms ease-out forwards',
      },
    },
  },
  plugins: [],
};