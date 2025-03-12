/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  theme: {
    extend: {
      colors: {
        background: "#ffffff",
        foreground: "#000000",  // Changed to pure black
        primary: {
          DEFAULT: "#c41230", // Rich red
          dark: "#8c0e22", // Darker rich red
        },
        secondary: "#222222", // Dark gray, almost black
        muted: "#f5f5f5", // Light background that works with red/black
        accent: {
          DEFAULT: "#c41230", // Same rich red as primary
          hover: "#8c0e22", // Same as primary-dark
        },
        "accent-foreground": "#ffffff",
        input: "#f5f5f5", // Light background matching muted
        border: "#dddddd", // Neutral light border
        success: {
          light: '#E6F4EA',
          DEFAULT: '#34A853',
          dark: '#1E7E34'
        },
        error: {
          light: '#FDECEA',
          DEFAULT: '#EA4335',
          dark: '#B31412'
        }
      },
      keyframes: {
        scale: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      },
      animation: {
        scale: 'scale 0.2s ease-out',
        slideDown: 'slideDown 0.2s ease-out',
      },
    },
  },
  plugins: [],
};