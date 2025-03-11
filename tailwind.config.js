/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  theme: {
    extend: {
      colors: {
        background: "#ffffff",
        foreground: "#1a202c",
        primary: {
          DEFAULT: "#e63946", // Softer red
          dark: "#c1121f", // Darker but not harsh
        },
        secondary: "#457b9d", // Complementary blue tone
        muted: "#f1faee", // Very light background
        accent: {
          DEFAULT: "#e63946", // Same as primary for consistency
          hover: "#c1121f", // Same as primary-dark
        },
        "accent-foreground": "#ffffff",
        input: "#f1faee", // Very light background
        border: "#a8dadc", // Light blue-ish border
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
