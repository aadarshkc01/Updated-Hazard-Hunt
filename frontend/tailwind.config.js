/** @type {import('tailwindcss').Config} */
export default {
darkMode: 'class', // REQUIRED: Enables class-based dark mode
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#fff3ed', 100: '#ffe5d4', 200: '#ffc6a2', 300: '#ff9f66',
          400: '#ff7733', 500: '#ff6115', 600: '#ef4900', 700: '#c63500',
          800: '#9d2a00', 900: '#7e2504',
        },
        app: {
          shell: '#FFFCF4',
        },
        mist: {
          50: '#F8FAFC', 100: '#F1F5F9', 200: '#E2E8F0', 300: '#CBD5E1',
          400: '#94A3B8', 500: '#64748B', 600: '#475569', 700: '#334155',
          800: '#1E293B', 900: '#0F172A', 950: '#020617',
        },
        dark: {
          bg: '#0B0F17', card: '#111827', surface: '#1F2937',
          border: '#374151', muted: '#9CA3AF', text: '#F3F4F6',
        },
      },
    },
  },
  plugins: [],
}
