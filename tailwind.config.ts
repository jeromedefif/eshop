import type { Config } from "tailwindcss";

export default {
  // Definujeme, kde všude Tailwind hledá použití tříd
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  
  theme: {
    extend: {
      // Základní barevné proměnné pro světlý/tmavý režim
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
        },
      },
      
      // Nastavení písem - přidáváme Geist fonty
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },

      // Rozšíření možností pro container
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '2rem',
          lg: '4rem',
          xl: '5rem',
          '2xl': '6rem',
        },
      },
      
      // Vlastní nastavení rozměrů pro lepší konzistenci designu
      spacing: {
        'navigation': '4.5rem',
        'header': '3.75rem',
      },
      
      // Nastavení breakpointů pro responzivní design
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
    },
  },
  
  // Přidání užitečných pluginů pro rozšíření funkcionality
  plugins: [],
} satisfies Config;
