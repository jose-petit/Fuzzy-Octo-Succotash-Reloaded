module.exports = {
  darkMode: 'class',
  content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Legacy colors (kept for compatibility)
        graydark: '#333333',
        graymed: '#555555',
        graylight: '#F5F5F5',
        'accent-yellow': '#ffd100',

        // Modern System
        primary: {
          light: '#4dabf5',
          DEFAULT: '#0073b4',
          dark: '#003466',
        },
        accent: {
          DEFAULT: '#40c0d0',
          glow: 'rgba(64, 192, 208, 0.5)',
        },
        status: {
          success: '#10B981',
          warning: '#FBBF24',
          error: '#EF4444',
          info: '#3B82F6',
        },
        surface: {
          glass: 'rgba(255, 255, 255, 0.7)',
          dark: '#1F2937',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        glow: '0 0 15px rgba(64, 192, 208, 0.5)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
