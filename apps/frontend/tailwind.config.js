/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        serif: ['"Playfair Display"', '"Cormorant Garamond"', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        border: "#E5E5E5",
        input: "#E5E5E5",
        ring: "#C5A880",
        background: "#FDFBF7",
        foreground: "#1A1A1A",
        primary: {
          DEFAULT: "#1A1A1A",
          foreground: "#FDFBF7",
        },
        secondary: {
          DEFAULT: "#F4EFEA",
          foreground: "#1A1A1A",
        },
        destructive: {
          DEFAULT: "#991B1B",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F4EFEA",
          foreground: "#6B6B6B",
        },
        accent: {
          DEFAULT: "#F5EFE6",
          foreground: "#1A1A1A",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#1A1A1A",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#1A1A1A",
        },
        gold: {
          50: '#FAF6F0',
          100: '#F5EFE6',
          200: '#E8DBCB',
          300: '#D8C3A5',
          400: '#C5A880',
          500: '#B8977E',
          600: '#9C7A60',
          700: '#7D5E46',
          800: '#5E4432',
          900: '#422F22',
        },
        alabaster: '#FAFAFA',
        cream: '#FDFBF7',
        charcoal: '#1A1A1A',
        taupe: '#A39281',
        olive: '#6B705C',
        navy: '#1F2937',
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
